import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());

// Initialize GoogleGenAI server-side with User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API endpoint to proxy Lichess Masters Opening Explorer requests securely
app.get('/api/lichess/masters', async (req, res) => {
  try {
    const fen = req.query.fen as string;
    if (!fen) {
      return res.status(400).json({ error: 'fen parameter is required' });
    }

    const moves = (req.query.moves as string) || '12';
    const topGames = (req.query.topGames as string) || '0';
    const encodedFen = encodeURIComponent(fen.trim());
    const lichessUrl = `https://explorer.lichess.ovh/masters?fen=${encodedFen}&moves=${moves}&topGames=${topGames}`;

    const token = process.env.LICHESS_TOKEN || process.env.LICHESS_API_KEY || '';
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'ChessMasterApp/1.0',
    };
    if (token && token.trim()) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    const upstreamResponse = await fetch(lichessUrl, {
      headers,
    });

    if (!upstreamResponse.ok) {
      console.warn(`[Lichess Proxy] Upstream responded with HTTP ${upstreamResponse.status}`);
      return res.status(upstreamResponse.status).json({
        error: `Lichess returned HTTP ${upstreamResponse.status}`,
      });
    }

    const data = await upstreamResponse.json();
    return res.json(data);
  } catch (error: any) {
    console.error('[Lichess Proxy] Error proxying to Lichess:', error);
    return res.status(502).json({ error: 'Failed to connect to Lichess API' });
  }
});

// API endpoint to generate explanation for why a master move is popular
app.post('/api/explain-move', async (req, res) => {
  try {
    const { fen, moveSan, openingName, eco, whiteWinPct, drawPct, blackWinPct, totalGames } = req.body;
    if (!moveSan) {
      return res.status(400).json({ error: 'moveSan is required' });
    }

    const prompt = `You are a chess Grandmaster and master opening coach.
Explain in 2-3 brief, engaging sentences why the master move "${moveSan}" is popular in this position:
- Opening: ${openingName || 'Chess Opening'} (${eco || 'N/A'})
- Board FEN: ${fen || ''}
- Statistics: ${totalGames ? `${totalGames.toLocaleString()} master games` : ''} (White: ${whiteWinPct}%, Draw: ${drawPct}%, Black: ${blackWinPct}%)

Highlight key positional or tactical ideas (piece activity, central control, King safety, or opening structures). Keep it concise, friendly, and under 50 words. Do not use bullet points or headers.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const explanation =
      response.text?.trim() ||
      `In this position, ${moveSan} is a hallmark master move aiming for central space, active piece development, and sound pawn structure.`;

    return res.json({ explanation });
  } catch (error: any) {
    console.error('Error generating move explanation:', error);
    return res.json({
      explanation: `Master players favor ${req.body.moveSan || 'this move'} to fight for central control, coordinate pieces smoothly, and build long-term positional pressure.`,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
