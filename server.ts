import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the server-side Gemini client using the recommended @google/genai patterns
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  
const PORT = Number(process.env.PORT) || 3000;
  app.use(express.json());

  // API endpoint to analyze trading patterns using Gemini 3.5-flash
  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const { trades } = req.body;
      if (!trades || !Array.isArray(trades)) {
        return res.status(400).json({ error: 'Missing or invalid trades list.' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(200).json({ 
          feedback: 'The server-side GEMINI_API_KEY is currently unconfigured. Please go to Settings > Secrets in the AI Studio UI, add your key, and restart the dev server.' 
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
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
              ? 'Your website is hosted on Render Cloud, which cannot reach your local PC MT5 application. Please run "python mt5-sync/auto_sync.py" on your Windows PC!'
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
