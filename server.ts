import http from 'http';
import { WebSocketServer } from 'ws';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { multiplayerServer } from './server/multiplayerServer';

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

// API endpoint to proxy Lichess Puzzles with LICHESS_API_KEY support
app.get('/api/lichess/puzzle/:action', async (req, res) => {
  try {
    const action = req.params.action;
    let lichessUrl = `https://lichess.org/api/puzzle/${action}`;
    if (action === 'daily') {
      lichessUrl = 'https://lichess.org/api/puzzle/daily';
    } else if (action === 'next') {
      lichessUrl = 'https://lichess.org/api/puzzle/next';
    }

    const token = process.env.LICHESS_TOKEN || process.env.LICHESS_API_KEY || '';
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'ChessMasterApp/1.0',
    };
    if (token && token.trim()) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    const upstreamResponse = await fetch(lichessUrl, { headers });

    if (!upstreamResponse.ok) {
      console.warn(`[Lichess Puzzle Proxy] (${action}) responded with HTTP ${upstreamResponse.status}`);
      return res.status(upstreamResponse.status).json({
        error: `Lichess puzzle API returned HTTP ${upstreamResponse.status}`,
      });
    }

    const data = await upstreamResponse.json();
    return res.json(data);
  } catch (error: any) {
    console.error('[Lichess Puzzle Proxy] Error proxying puzzle request:', error);
    return res.status(502).json({ error: 'Failed to connect to Lichess Puzzle API' });
  }
});

// API endpoint to proxy Lichess Masters & Community Opening Explorer requests securely
app.get('/api/lichess/:type', async (req, res) => {
  try {
    const fen = req.query.fen as string;
    if (!fen) {
      return res.status(400).json({ error: 'fen parameter is required' });
    }

    const type = req.params.type === 'lichess' ? 'lichess' : 'masters';
    const moves = (req.query.moves as string) || '15';
    const topGames = (req.query.topGames as string) || '0';
    const encodedFen = encodeURIComponent(fen.trim());
    const lichessUrl = `https://explorer.lichess.ovh/${type}?fen=${encodedFen}&moves=${moves}&topGames=${topGames}`;

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
      console.warn(`[Lichess Proxy] Upstream (${type}) responded with HTTP ${upstreamResponse.status}`);
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

// API endpoint to generate human-readable, beginner-tailored move explanations in the Analysis view
app.post('/api/analysis/explain-move', async (req, res) => {
  try {
    const {
      moveSan,
      color,
      classification,
      evalBefore,
      evalAfter,
      bestMoveSan,
      openingName,
      fen,
      moveNumber,
    } = req.body;

    if (!moveSan) {
      return res.status(400).json({ error: 'moveSan is required' });
    }

    const sidePlayed = color === 'w' ? 'White' : 'Black';
    const qual = classification ? classification.toLowerCase() : 'analyzed';

    const prompt = `You are an encouraging, world-class Chess Coach explaining a game to an absolute beginner player (Elo 400 - 900).
Explain in simple, human-readable terms why the move "${moveSan}" played by ${sidePlayed} on move ${moveNumber || 1} is considered a ${qual.toUpperCase()}.

Context:
- Move: ${moveSan} (played by ${sidePlayed})
- Engine Quality Assessment: ${qual}
- Evaluation shift: from ${evalBefore !== undefined ? evalBefore : 'even'} to ${evalAfter !== undefined ? evalAfter : 'even'}
${bestMoveSan ? `- Stockfish Recommended Move: ${bestMoveSan}` : ''}
${openingName ? `- Opening Name: ${openingName}` : ''}
- Current Board FEN: ${fen || 'N/A'}

Rules for the explanation:
1. Speak in warm, conversational, jargon-free English. Avoid cryptic engine notation or deep 10-move variations.
2. Focus on clear beginner principles:
   - Piece safety (is a piece hanging, unprotected, or captured?)
   - King safety & castling
   - Central board control (e4/d4/e5/d5 squares)
   - Piece activity & development (getting knights and bishops off back rank)
   - Tactical threats (forks, pins, checks, attacks)
3. If the move was a blunder, mistake, or inaccuracy:
   - Clearly state what went wrong (e.g. "This move leaves your bishop undefended on c4, allowing Black to win it for free.")
   - Explain why the recommended move ${bestMoveSan || 'another option'} would have been safer or stronger.
4. If the move was brilliant, great, best, or good:
   - Explain why it is strong (e.g. "Great move! This develops your knight to an active square while defending the center pawn.")
5. Keep the total response between 2 to 4 sentences (under 75 words).
6. End with a 1-sentence "💡 Beginner Tip:".`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const explanation =
      response.text?.trim() ||
      `Playing ${moveSan} by ${sidePlayed} impacts board balance. Pay close attention to piece safety, defending unprotected squares, and developing your pieces toward the center.`;

    return res.json({ explanation });
  } catch (error: any) {
    console.error('Error generating beginner analysis explanation:', error);
    return res.status(500).json({
      error: 'Failed to generate explanation',
      explanation: `The move ${req.body.moveSan || 'played'} alters the position's dynamic balance. In beginner play, always ask: "Is my piece safe where I moved it?" and "What is my opponent attacking next?"`,
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

  const server = http.createServer(app);

  const wss = new WebSocketServer({
    server,
    path: '/ws/multiplayer',
  });

  wss.on('connection', (ws) => {
    multiplayerServer.handleConnection(ws);
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port} (WebSocket ready on /ws/multiplayer)`);
  });
}

startServer();
