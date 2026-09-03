import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const envGeminiApiKey = process.env.GEMINI_API_KEY?.trim() || '';
const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
let sessionGeminiApiKey = '';

const getGeminiApiKey = () => sessionGeminiApiKey || envGeminiApiKey;

const createGeminiClient = () => new GoogleGenAI({
  apiKey: getGeminiApiKey(),
  httpOptions: {
    headers: {
      'User-Agent': 'tradeforge-local-journal',
    }
  }
});

const clampText = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const buildConversationTranscript = (history: unknown) => {
  if (!Array.isArray(history)) return 'No previous conversation.';
  return history
    .slice(-10)
    .map(item => {
      const role = item?.role === 'assistant' ? 'Assistant' : 'Trader';
      const content = clampText(item?.content, 3000);
      return content ? `${role}: ${content}` : '';
    })
    .filter(Boolean)
    .join('\n\n') || 'No previous conversation.';
};

const generateGroundedTradingResponse = async ({
  question,
  context,
  history,
  mode,
}: {
  question: string;
  context: unknown;
  history?: unknown;
  mode: 'overview' | 'chat';
}) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error('GEMINI_NOT_CONFIGURED');

  const contextJson = JSON.stringify(context).slice(0, 180_000);
  const transcript = buildConversationTranscript(history);
  const task = mode === 'overview'
    ? `Create a concise opening performance overview. Lead with the most decision-useful findings, including win rate, net P&L, strongest setup, risk/drawdown, and one process issue when the supplied data supports them. End with 2 useful questions the trader could ask next.`
    : `Answer the trader's question directly using the supplied journal snapshot. Question: ${question}`;

  const ai = createGeminiClient();
  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: `${task}\n\nRECENT CONVERSATION\n${transcript}\n\nTRADING JOURNAL SNAPSHOT (authoritative JSON)\n${contextJson}`,
    config: {
      systemInstruction: `You are TradeForge's grounded trading-journal analyst. Use only the supplied journal snapshot for claims about this trader. Calculate from supplied values when needed, state the date range used, and clearly say when the data is insufficient. Net P&L values already include recorded fees. Never invent trades, prices, setups, notes, or outcomes. Do not present generic market predictions or tell the user to increase risk. Keep responses concise, practical, and formatted with short headings and bullets.`,
      temperature: 0.2,
      maxOutputTokens: mode === 'overview' ? 700 : 1000,
    },
  });

  return response.text?.trim() || 'Gemini returned an empty response.';
};

async function startServer() {
  const app = express();
  
  const PORT = Number(process.env.PORT) || 3000;
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.get('/api/ai/config', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      configured: Boolean(getGeminiApiKey()),
      source: sessionGeminiApiKey ? 'session' : envGeminiApiKey ? 'environment' : 'none',
      model: geminiModel,
    });
  });

  app.post('/api/ai/config', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const apiKey = clampText(req.body?.apiKey, 512);
    if (apiKey.length < 20) {
      return res.status(400).json({ error: 'Enter a valid Gemini API key.' });
    }
    sessionGeminiApiKey = apiKey;
    return res.json({ configured: true, source: 'session', model: geminiModel });
  });

  app.delete('/api/ai/config', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    sessionGeminiApiKey = '';
    return res.json({
      configured: Boolean(envGeminiApiKey),
      source: envGeminiApiKey ? 'environment' : 'none',
      model: geminiModel,
    });
  });

  app.post('/api/ai/chat', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const mode = req.body?.mode === 'overview' ? 'overview' : 'chat';
      const question = clampText(req.body?.question, 2000);
      const context = req.body?.context;

      if (!context || typeof context !== 'object') {
        return res.status(400).json({ error: 'A compact trading journal context is required.' });
      }
      if (mode === 'chat' && !question) {
        return res.status(400).json({ error: 'Enter a question about your journal.' });
      }

      const answer = await generateGroundedTradingResponse({
        question,
        context,
        history: req.body?.history,
        mode,
      });
      return res.json({ answer, model: geminiModel });
    } catch (err: any) {
      if (err?.message === 'GEMINI_NOT_CONFIGURED') {
        return res.status(503).json({ error: 'Configure a Gemini API key before starting the chat.', code: 'GEMINI_NOT_CONFIGURED' });
      }
      const errorMessage = String(err?.message || err || '');
      console.error('Grounded Gemini Chat Error:', errorMessage);
      if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('API key not valid')) {
        return res.status(401).json({ error: 'Gemini rejected this API key. Add a valid Google AI Studio Gemini key and try again.', code: 'GEMINI_KEY_INVALID' });
      }
      if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('429')) {
        return res.status(429).json({ error: 'The Gemini quota for this key is currently exhausted. Check its quota or try again later.', code: 'GEMINI_QUOTA_EXHAUSTED' });
      }
      if (errorMessage.includes('NOT_FOUND') || errorMessage.includes('not found')) {
        return res.status(502).json({ error: `The configured Gemini model (${geminiModel}) is unavailable for this key. Set GEMINI_MODEL in .env to a supported model.`, code: 'GEMINI_MODEL_UNAVAILABLE' });
      }
      return res.status(500).json({ error: 'Gemini could not answer this question. Check the server log for details.', code: 'GEMINI_REQUEST_FAILED' });
    }
  });

  // Ensure assets/uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'assets', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploads directory
  app.use('/assets/uploads', express.static(uploadsDir));

  // Endpoint to handle screenshot uploads
  app.post('/api/upload', (req, res) => {
    try {
      const { image, name } = req.body;
      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'No image data provided' });
      }

      // Extract base64 format and data
      const matches = image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: 'Invalid base64 image data' });
      }

      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      const filename = `${name || 'ss'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const filePath = path.join(uploadsDir, filename);

      fs.writeFileSync(filePath, buffer);

      const publicUrl = `/assets/uploads/${filename}`;
      return res.json({ url: publicUrl, filename });
    } catch (err: any) {
      console.error('Image Upload Error:', err);
      return res.status(500).json({ error: err.message || 'Failed to save screenshot' });
    }
  });

  // Local JSON Backup Endpoint for Trades
  const tradesBackupPath = path.join(process.cwd(), 'trades_backup.json');

  app.get('/api/trades', (req, res) => {
    try {
      if (fs.existsSync(tradesBackupPath)) {
        const raw = fs.readFileSync(tradesBackupPath, 'utf-8');
        return res.json(JSON.parse(raw));
      }
      return res.json([]);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/trades', (req, res) => {
    try {
      const { trades } = req.body;
      if (Array.isArray(trades)) {
        fs.writeFileSync(tradesBackupPath, JSON.stringify(trades, null, 2), 'utf-8');
        return res.json({ success: true, count: trades.length });
      }
      return res.status(400).json({ error: 'Invalid trades payload' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Legacy audit endpoint retained for the Tactical Insights report.
  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const { trades } = req.body;
      if (!trades || !Array.isArray(trades)) {
        return res.status(400).json({ error: 'Missing or invalid trades list.' });
      }

      if (!getGeminiApiKey()) {
        return res.status(200).json({ 
          feedback: 'Gemini is not configured yet. Open the AI Chat tab to add an API key for this server session.'
        });
      }

      // Summarize trades for the AI prompt
      const tradesSummary = trades.map((t, idx) => 
        `[Trade #${idx + 1}] Date: ${t.date}, Asset: ${t.asset}, Setup: ${t.setup}, Direction: ${t.direction}, PnL: $${t.pnl}, Status: ${t.status}, Session: ${t.session}, Mistakes: ${t.mistakes.join(', ')}, Notes: "${t.notes}"`
      ).join('\n');

      const prompt = `You are an elite, highly experienced institutional trading risk manager and trading psychology coach. 
Analyze the following logged trading journal history for this user. Locate distinct patterns and make constructive, highly tactical, actionable observations:

1. Setup Inefficiencies: Which of their setups (e.g., BoS Downside, EMA Rejection, Liquidity Sweep) are making the most consistent returns, and which ones are leaking capital?
2. Psychological/Behavioral Pitfalls: Are there specific psychological mistakes (like FOMO, overtrading, leaving wins early) that are causing losses? Contrast this with days where no mistakes were logged.
3. Session Advantages: Identify performance variance between London, New York, or Asian session executions.
4. Strategic Optimization advice: Offer 3 concrete, professional, mathematical recommendations (such as altering risk size or adjusting targets based on their average win vs. average loss sizes) to optimize performance.

User Trade Log History:
${tradesSummary}

Provide your feedback report directly. Use bold scannable headings, professional spacing, and clean bullet points. Speak in a confident, encouraging, yet elite institutional tone. Keep the review tightly focused and immediately actionable.`;

      const ai = createGeminiClient();
      const response = await ai.models.generateContent({
        model: geminiModel,
        contents: prompt,
      });

      res.json({ feedback: response.text });
    } catch (err: any) {
      console.error('AI Coach Server-Side Error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate AI performance audit.' });
    }
  });

  // API endpoint to trigger automatic MT5 trade synchronization
  app.post('/api/mt5/sync', async (req, res) => {
    try {
      const scriptPath = path.join(process.cwd(), 'mt5-sync', 'sync.py');
      console.log('Triggering MT5 Sync via script:', scriptPath);

      const { exec } = await import('child_process');
      exec(`python "${scriptPath}"`, (error, stdout, stderr) => {
        if (error || (stdout && (stdout.includes("Initialization Failed") || stdout.includes("No MT5 deal history")))) {
          console.error('MT5 Sync Script Execution Error:', error, stderr, stdout);
          const isCloudServer = !!process.env.RENDER || process.env.NODE_ENV === 'production';
          return res.status(400).json({ 
            error: isCloudServer 
              ? 'Your website is hosted on Render Cloud, which cannot reach your local PC MT5 application. Please download the GitHub ZIP file from https://github.com/shubhpatel14/Journal, extract it, and run "python mt5-sync/auto_sync.py" or run the app locally on your Windows PC!'
              : 'Could not connect to MT5. Ensure MT5 Desktop Terminal is open and logged into your account.', 
            details: stdout || stderr || error?.message 
          });
        }
        
        console.log('MT5 Sync Output:\n', stdout);
        
        const uploadedMatch = stdout.match(/Trades Uploaded\s*:\s*(\d+)/);
        const profitMatch = stdout.match(/Net Profit\s*:\s*([-\d.]+)/);

        const uploadedCount = uploadedMatch ? parseInt(uploadedMatch[1], 10) : 0;
        const netProfit = profitMatch ? parseFloat(profitMatch[1]) : 0;

        res.json({
          success: true,
          message: 'MT5 trade synchronization completed successfully.',
          uploadedCount,
          netProfit,
          output: stdout
        });
      });
    } catch (err: any) {
      console.error('MT5 Sync Endpoint Error:', err);
      res.status(500).json({ error: err.message || 'MT5 Sync failed.' });
    }
  });

  // Vite middleware in development, static folder delivery in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in Development mode.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production static assets from /dist.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express custom server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
