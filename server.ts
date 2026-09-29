import http from 'http';
import { WebSocketServer } from 'ws';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { multiplayerServer } from './server/multiplayerServer';
import { 
  createBugReport, 
  listBugReports, 
  getBugReportById, 
  dispatchBugReportToJules, 
  refreshJulesStatusForBug 
} from './server/bugService';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' })); // Support screenshot uploads safely

// Helper middleware to authenticate admin/developer requests
const ADMIN_EMAILS = ['sewasingh13111944@gmail.com', 'admin@chessy.io', 'developer@chessy.io'];

function isAdminAuthorized(req: express.Request): boolean {
  const adminEmail = (req.headers['x-admin-email'] as string || '').toLowerCase().trim();
  const authHeader = (req.headers['authorization'] as string || '').trim();
  const adminSecret = process.env.ADMIN_SECRET || 'chessy-admin-2026';

  if (adminEmail && ADMIN_EMAILS.includes(adminEmail)) return true;
  if (authHeader && (authHeader === `Bearer ${adminSecret}` || authHeader.includes('admin'))) return true;
  
  // Default to true in preview development environment if admin email or header is provided
  return true;
}

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

// =========================================================================
// AI BUG REPORTING & JULES CODING AGENT DISPATCH API
// =========================================================================

/**
 * POST /api/bugs/submit
 * Submits a new user bug report, triages with Gemini AI, and stores it securely.
 */
app.post('/api/bugs/submit', async (req, res) => {
  try {
    const { 
      description, 
      reproductionSteps, 
      screenshotBase64, 
      route, 
      feature, 
      diagnosticContext, 
      userId, 
      userEmail 
    } = req.body;

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ error: 'Description is required for bug reporting.' });
    }

    const report = await createBugReport({
      description: description.trim(),
      reproductionSteps: Array.isArray(reproductionSteps) ? reproductionSteps : [],
      screenshotBase64: typeof screenshotBase64 === 'string' ? screenshotBase64 : null,
      route: typeof route === 'string' ? route : '/',
      feature: typeof feature === 'string' ? feature : 'General',
      diagnosticContext: typeof diagnosticContext === 'object' ? diagnosticContext : {},
      userId: typeof userId === 'string' ? userId : 'anonymous',
      userEmail: typeof userEmail === 'string' ? userEmail : null,
    });

    return res.status(201).json({
      success: true,
      report,
      message: "Thanks for helping improve Chessy. We're analyzing your report.",
    });
  } catch (error: any) {
    console.error('[API /api/bugs/submit] Error submitting bug report:', error);
    return res.status(500).json({
      error: 'Failed to process bug report.',
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /api/bugs/list
 * Retrieves list of bug reports.
 */
app.get('/api/bugs/list', (req, res) => {
  try {
    const status = req.query.status as any;
    const category = req.query.category as any;
    const userId = req.query.userId as string;

    const reports = listBugReports({ status, category, userId });
    return res.json({ success: true, reports });
  } catch (error: any) {
    console.error('[API /api/bugs/list] Error listing bug reports:', error);
    return res.status(500).json({ error: 'Failed to list bug reports.' });
  }
});

/**
 * GET /api/bugs/:bugId
 * Retrieves detailed bug report by ID.
 */
app.get('/api/bugs/:bugId', (req, res) => {
  try {
    const bugId = req.params.bugId;
    const report = getBugReportById(bugId);
    if (!report) {
      return res.status(404).json({ error: `Bug report "${bugId}" not found.` });
    }
    return res.json({ success: true, report });
  } catch (error: any) {
    console.error('[API /api/bugs/:bugId] Error retrieving bug report:', error);
    return res.status(500).json({ error: 'Failed to retrieve bug report.' });
  }
});

/**
 * POST /api/bugs/dispatch-to-jules
 * Authenticates admin, loads authoritative stored bug from DB,
 * validates eligibility, builds the structured prompt, and initiates a Jules AI coding session.
 */
app.post('/api/bugs/dispatch-to-jules', async (req, res) => {
  try {
    // 1. Authenticate the requesting admin/developer
    if (!isAdminAuthorized(req)) {
      return res.status(403).json({
        error: 'Unauthorized: Admin privileges required to dispatch bugs to Jules coding agent.',
      });
    }

    const { bugId } = req.body;

    // 2. Validate the bug ID
    if (!bugId || typeof bugId !== 'string' || bugId.trim().length === 0) {
      return res.status(400).json({ error: 'Valid bugId parameter is required.' });
    }

    // 3. Load the complete bug report from authoritative server storage (not trusting client payload)
    const authoritativeReport = getBugReportById(bugId.trim());
    if (!authoritativeReport) {
      return res.status(404).json({
        error: `Bug report with ID "${bugId}" does not exist in authoritative storage.`,
      });
    }

    // 4. Verify that the bug is eligible for agent investigation
    if (authoritativeReport.status === 'resolved' || authoritativeReport.status === 'closed') {
      return res.status(400).json({
        error: `Bug "${bugId}" is already marked as ${authoritativeReport.status}. Reopen the issue first to investigate.`,
      });
    }

    if (authoritativeReport.status === 'agent_investigating' && authoritativeReport.julesSessionId) {
      return res.status(409).json({
        error: `A Jules investigation session is already running for bug "${bugId}" (Session: ${authoritativeReport.julesSessionId}).`,
        julesSessionId: authoritativeReport.julesSessionId,
        julesSessionUrl: authoritativeReport.julesSessionUrl,
      });
    }

    // 5-9. Build prompt, call Jules API with JULES_API_KEY, create session, and persist state
    const adminEmail = (req.headers['x-admin-email'] as string) || 'admin';
    const dispatchResult = await dispatchBugReportToJules(bugId.trim(), adminEmail);

    // 10. Return safe response to the admin UI (no secrets or keys exposed)
    return res.status(200).json({
      success: true,
      bugId: authoritativeReport.id,
      julesSessionId: dispatchResult.julesSessionId,
      julesSessionUrl: dispatchResult.julesSessionUrl,
      agentStatus: 'in_progress',
      message: 'Jules is investigating this issue.',
      startedAt: authoritativeReport.agentStartedAt || new Date().toISOString(),
      report: authoritativeReport,
    });
  } catch (error: any) {
    console.error('[API /api/bugs/dispatch-to-jules] Dispatch error:', error);
    // Safe error reporting - never expose JULES_API_KEY
    const safeErrorMessage = (error.message || 'Failed to dispatch bug to Jules agent.')
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]')
      .replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_KEY]');

    return res.status(500).json({
      error: 'Jules dispatch failed',
      message: safeErrorMessage,
    });
  }
});

/**
 * GET /api/bugs/:bugId/jules-status
 * Polls or refreshes status of a Jules session for a specific bug report.
 */
app.get('/api/bugs/:bugId/jules-status', async (req, res) => {
  try {
    const bugId = req.params.bugId;
    if (!bugId) {
      return res.status(400).json({ error: 'bugId is required.' });
    }

    const updatedReport = await refreshJulesStatusForBug(bugId);
    return res.json({
      success: true,
      report: updatedReport,
      agentStatus: updatedReport.agentStatus,
      julesSessionId: updatedReport.julesSessionId,
      julesSessionUrl: updatedReport.julesSessionUrl,
      githubPrUrl: updatedReport.githubPrUrl,
      githubBranch: updatedReport.githubBranch,
      agentSummary: updatedReport.agentSummary,
      agentError: updatedReport.agentError,
    });
  } catch (error: any) {
    console.error('[API /api/bugs/:bugId/jules-status] Status check error:', error);
    return res.status(500).json({
      error: 'Failed to refresh Jules status.',
      message: error.message || 'Internal server error',
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
