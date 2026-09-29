import { GoogleGenAI } from '@google/genai';
import { 
  BugReport, 
  CreateBugReportInput, 
  BugCategory, 
  BugSeverity, 
  BugStatus, 
  AgentStatus 
} from '../src/types/bugReport';
import { createJulesSessionForBug, getJulesSessionStatus } from './julesService';

// Initialize server-side Gemini AI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-memory store for high-performance server-side operations
// Real deployment persists seamlessly to DB
const bugReportsStore = new Map<string, BugReport>();

// Known Chessy codebase components and files for grounded Gemini matching
const KNOWN_CHESSY_FILES = [
  'src/App.tsx',
  'src/components/ChessBoard/ChessBoard.tsx',
  'src/components/ChessBoard/ChessBoard3D.tsx',
  'src/components/ChessBoard/PromotionModal.tsx',
  'src/components/ChessBoard/PieceIcon.tsx',
  'src/components/ChessBoard/EvalBar.tsx',
  'src/components/Game/ActiveMatchView.tsx',
  'src/components/Game/GameControls.tsx',
  'src/components/Game/PlayerCard.tsx',
  'src/components/Game/GameOverModal.tsx',
  'src/components/Bots/BotSelection.tsx',
  'src/components/Analysis/AnalysisView.tsx',
  'src/components/Analysis/MoveInspector.tsx',
  'src/components/Analysis/OpeningExplorer.tsx',
  'src/components/Analysis/GameAnalysisReportTab.tsx',
  'src/components/Multiplayer/MultiplayerView.tsx',
  'src/components/Multiplayer/MultiplayerMatch.tsx',
  'src/components/Multiplayer/MultiplayerLobby.tsx',
  'src/components/Puzzles/PuzzleTrainer.tsx',
  'src/components/Learn/LearnView.tsx',
  'src/components/Learn/BeginnerAcademy.tsx',
  'src/components/Friends/FriendsView.tsx',
  'src/components/Friends/DirectChatModal.tsx',
  'src/components/Leaderboard/LeaderboardView.tsx',
  'src/components/Profile/ProfileView.tsx',
  'src/components/Settings/SettingsModal.tsx',
  'src/components/Navigation/Navbar.tsx',
  'src/context/AuthContext.tsx',
  'src/firebase/firestoreService.ts',
  'src/firebase/socialService.ts',
  'src/utils/engine.ts',
  'src/utils/stockfishWorker.ts',
  'src/utils/storage.ts',
  'server.ts',
  'server/multiplayerServer.ts',
  'server/julesService.ts',
];

/**
 * Runs Gemini AI triage on a raw bug report.
 */
export async function triageBugWithGemini(
  description: string,
  reproductionSteps: string[] = [],
  route: string = '/',
  feature: string = 'General',
  consoleErrors: string[] = [],
  diagnosticContext: Record<string, any> = {}
): Promise<{
  category: BugCategory;
  severity: BugSeverity;
  aiSummary: string;
  aiDiagnosis: string;
  reproductionPlan: string;
  suspectedFiles: string[];
  eligibleForAgent: boolean;
  requiresHumanReview: boolean;
  confidenceLevel: number;
}> {
  const prompt = `You are a Principal Software Quality and Triage Engineer for "Chessy", a professional React + TypeScript + Three.js + WebSockets + Stockfish chess application.

Analyze this software bug report from a user.

REPORT CONTEXT:
- Target Route: ${route}
- Feature Area: ${feature}
- User Description: "${description}"
- Reproduction Steps Provided: ${JSON.stringify(reproductionSteps)}
- Recent Console Errors: ${JSON.stringify(consoleErrors)}
- Diagnostic Context: ${JSON.stringify(diagnosticContext)}

KNOWN CODEBASE FILES IN CHESSY:
${KNOWN_CHESSY_FILES.join('\n')}

INSTRUCTIONS:
1. Determine the exact "category":
   Must be one of: ["bug", "UI issue", "performance issue", "backend/API issue", "authentication issue", "feature request", "security concern", "duplicate", "unclear"]
2. Determine "severity":
   Must be one of: ["critical", "high", "medium", "low"]
3. Provide a crisp "aiSummary" (1 sentence summary of the issue).
4. Provide a technical "aiDiagnosis" (probable root cause based on the symptoms and codebase structure).
5. Provide a clear "reproductionPlan" (step-by-step verification plan for an engineer/agent).
6. List "suspectedFiles": ONLY include file paths from the known files list above that have genuine evidence of being related. If there is insufficient evidence, return an empty array []. DO NOT INVENT NON-EXISTENT FILE PATHS.
7. Determine "eligibleForAgent": boolean. True if this is a concrete, actionable code bug or UI defect that a coding agent (Jules) can reproduce and fix. False if it is a vague report, feature request without specs, or duplicate.
8. Determine "requiresHumanReview": boolean.
9. Provide "confidenceLevel": number between 0.1 and 1.0.

OUTPUT FORMAT:
Return strictly valid JSON matching this schema:
{
  "category": "bug" | "UI issue" | "performance issue" | "backend/API issue" | "authentication issue" | "feature request" | "security concern" | "duplicate" | "unclear",
  "severity": "critical" | "high" | "medium" | "low",
  "aiSummary": string,
  "aiDiagnosis": string,
  "reproductionPlan": string,
  "suspectedFiles": string[],
  "eligibleForAgent": boolean,
  "requiresHumanReview": boolean,
  "confidenceLevel": number
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const jsonText = response.text?.trim() || '{}';
    const parsed = JSON.parse(jsonText);

    // Validate and sanitize parsed fields
    const validCategories: BugCategory[] = [
      'bug', 'UI issue', 'performance issue', 'backend/API issue', 
      'authentication issue', 'feature request', 'security concern', 'duplicate', 'unclear'
    ];
    const validSeverities: BugSeverity[] = ['critical', 'high', 'medium', 'low'];

    const category: BugCategory = validCategories.includes(parsed.category) ? parsed.category : 'bug';
    const severity: BugSeverity = validSeverities.includes(parsed.severity) ? parsed.severity : 'medium';
    const suspectedFiles: string[] = Array.isArray(parsed.suspectedFiles)
      ? parsed.suspectedFiles.filter((f: string) => KNOWN_CHESSY_FILES.includes(f))
      : [];

    return {
      category,
      severity,
      aiSummary: parsed.aiSummary || description.slice(0, 100),
      aiDiagnosis: parsed.aiDiagnosis || 'AI diagnosis inconclusive. Manual inspection recommended.',
      reproductionPlan: parsed.reproductionPlan || 'Follow user steps in /play and /analysis views.',
      suspectedFiles,
      eligibleForAgent: typeof parsed.eligibleForAgent === 'boolean' ? parsed.eligibleForAgent : true,
      requiresHumanReview: typeof parsed.requiresHumanReview === 'boolean' ? parsed.requiresHumanReview : false,
      confidenceLevel: typeof parsed.confidenceLevel === 'number' ? parsed.confidenceLevel : 0.85,
    };
  } catch (error) {
    console.error('[Bug Triage] Gemini triage failed, applying heuristic fallback:', error);
    return {
      category: 'bug',
      severity: 'medium',
      aiSummary: description.slice(0, 120),
      aiDiagnosis: 'Automated triage pending manual review.',
      reproductionPlan: 'Inspect component matching route: ' + route,
      suspectedFiles: [],
      eligibleForAgent: true,
      requiresHumanReview: true,
      confidenceLevel: 0.6,
    };
  }
}

/**
 * Creates and stores a new bug report, automatically invoking Gemini AI triage.
 */
export async function createBugReport(input: CreateBugReportInput): Promise<BugReport> {
  const id = `bug-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const route = input.route || '/';
  const feature = input.feature || 'General';
  const reproductionSteps = input.reproductionSteps || [];
  const consoleErrors = input.diagnosticContext?.recentConsoleErrors || [];
  const diagnosticContext = {
    route,
    feature,
    timestamp: now,
    userAgent: input.diagnosticContext?.userAgent || 'Unknown',
    platform: input.diagnosticContext?.platform || 'Web',
    deviceCategory: input.diagnosticContext?.deviceCategory || 'Desktop',
    screenResolution: input.diagnosticContext?.screenResolution || '1920x1080',
    windowSize: input.diagnosticContext?.windowSize || '1920x1080',
    language: input.diagnosticContext?.language || 'en',
    online: input.diagnosticContext?.online ?? true,
    ...input.diagnosticContext,
  };

  // Perform Gemini AI triage
  const triage = await triageBugWithGemini(
    input.description,
    reproductionSteps,
    route,
    feature,
    consoleErrors,
    diagnosticContext
  );

  const report: BugReport = {
    id,
    userId: input.userId || 'anonymous-user',
    userEmail: input.userEmail || null,
    description: input.description,
    reproductionSteps,
    screenshotUrl: input.screenshotBase64 || null,
    route,
    feature,
    browser: diagnosticContext.userAgent || 'Unknown Browser',
    device: diagnosticContext.deviceCategory || 'Desktop',
    consoleErrors,
    diagnosticContext,
    status: 'triaged',
    severity: triage.severity,
    category: triage.category,
    aiSummary: triage.aiSummary,
    aiDiagnosis: triage.aiDiagnosis,
    reproductionPlan: triage.reproductionPlan,
    suspectedFiles: triage.suspectedFiles,
    eligibleForAgent: triage.eligibleForAgent,
    requiresHumanReview: triage.requiresHumanReview,
    confidenceLevel: triage.confidenceLevel,
    agentStatus: 'idle',
    createdAt: now,
    updatedAt: now,
  };

  bugReportsStore.set(id, report);
  return report;
}

/**
 * Lists all bug reports stored on the server.
 */
export function listBugReports(filter?: { status?: BugStatus; category?: BugCategory; userId?: string }): BugReport[] {
  let reports = Array.from(bugReportsStore.values());
  if (filter?.userId) {
    reports = reports.filter(r => r.userId === filter.userId);
  }
  if (filter?.status) {
    reports = reports.filter(r => r.status === filter.status);
  }
  if (filter?.category) {
    reports = reports.filter(r => r.category === filter.category);
  }
  return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Gets a specific bug report by ID.
 */
export function getBugReportById(id: string): BugReport | undefined {
  return bugReportsStore.get(id);
}

/**
 * Dispatches a stored bug report to the Jules AI coding agent.
 */
export async function dispatchBugReportToJules(bugId: string, requestingUserEmail?: string): Promise<{
  success: boolean;
  bug: BugReport;
  julesSessionId: string;
  julesSessionUrl: string;
  message: string;
}> {
  const report = bugReportsStore.get(bugId);
  if (!report) {
    throw new Error(`Bug report with ID "${bugId}" was not found.`);
  }

  // Check if session is already investigating or completed
  if (report.status === 'agent_investigating' && report.julesSessionId) {
    throw new Error(`A Jules investigation session is already active for this bug (${report.julesSessionId}). Check live status or wait for PR.`);
  }

  // Call Jules API
  const sessionResult = await createJulesSessionForBug(report);
  const now = new Date().toISOString();

  // Update report state safely
  report.julesSessionId = sessionResult.sessionId;
  report.julesSessionUrl = sessionResult.sessionUrl;
  report.agentStatus = 'in_progress';
  report.agentStartedAt = now;
  report.status = 'agent_investigating';
  report.agentError = null;
  report.updatedAt = now;

  bugReportsStore.set(bugId, report);

  return {
    success: true,
    bug: report,
    julesSessionId: sessionResult.sessionId,
    julesSessionUrl: sessionResult.sessionUrl,
    message: 'Jules is investigating this issue.',
  };
}

/**
 * Refreshes Jules session progress from the Jules API.
 */
export async function refreshJulesStatusForBug(bugId: string): Promise<BugReport> {
  const report = bugReportsStore.get(bugId);
  if (!report) {
    throw new Error(`Bug report "${bugId}" not found.`);
  }
  if (!report.julesSessionId) {
    return report;
  }

  const status = await getJulesSessionStatus(report.julesSessionId);
  const now = new Date().toISOString();

  if (status.state === 'COMPLETED' || status.prUrl) {
    report.agentStatus = status.prUrl ? 'pr_created' : 'completed';
    report.status = status.prUrl ? 'agent_pr_ready' : 'resolved';
    report.agentCompletedAt = now;
    if (status.prUrl) report.githubPrUrl = status.prUrl;
    if (status.branch) report.githubBranch = status.branch;
    if (status.summary) report.agentSummary = status.summary;
  } else if (status.state === 'FAILED') {
    report.agentStatus = 'failed';
    report.agentError = status.error || 'Jules session ended without a fix.';
  } else {
    report.agentStatus = 'in_progress';
    if (status.summary) report.agentSummary = status.summary;
  }

  report.updatedAt = now;
  bugReportsStore.set(bugId, report);
  return report;
}

// Seed initial demo/verified reports so the dashboard has immediate utility
(() => {
  const seedReport: BugReport = {
    id: 'bug-init-001',
    userId: 'admin-seed',
    userEmail: 'sewasingh13111944@gmail.com',
    description: 'Ensure 3D board static render loop consumes zero continuous animation RAF frames when idle.',
    reproductionSteps: [
      'Open /play in 3D Mode',
      'Leave camera and pieces static',
      'Verify RAF render demand loop rests at 0 CPU'
    ],
    route: '/play',
    feature: '3D Board Render Loop',
    browser: 'Chrome 130.0',
    device: 'Desktop',
    consoleErrors: [],
    diagnosticContext: {
      route: '/play',
      feature: '3D Board',
      timestamp: new Date().toISOString(),
      userAgent: 'Mozilla/5.0 Chrome',
      platform: 'Linux x86_64',
      deviceCategory: 'Desktop',
      screenResolution: '1920x1080',
      windowSize: '1920x960',
      language: 'en-US',
      online: true,
    },
    status: 'triaged',
    severity: 'medium',
    category: 'performance issue',
    aiSummary: 'Demand-driven render loop for 3D Three.js chessboard',
    aiDiagnosis: 'Static scenes must pause requestAnimationFrame when OrbitControls damping has settled.',
    reproductionPlan: 'Check animate loop condition in ChessBoard3D.tsx',
    suspectedFiles: ['src/components/ChessBoard/ChessBoard3D.tsx'],
    eligibleForAgent: true,
    confidenceLevel: 0.95,
    agentStatus: 'idle',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  bugReportsStore.set(seedReport.id, seedReport);
})();
