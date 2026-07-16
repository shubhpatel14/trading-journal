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
  const PORT = 3000;

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
