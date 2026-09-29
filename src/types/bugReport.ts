export type BugCategory = 
  | 'bug' 
  | 'UI issue' 
  | 'performance issue' 
  | 'backend/API issue' 
  | 'authentication issue' 
  | 'feature request' 
  | 'security concern' 
  | 'duplicate' 
  | 'unclear';

export type BugSeverity = 'critical' | 'high' | 'medium' | 'low';

export type BugStatus = 
  | 'open' 
  | 'triaged' 
  | 'agent_investigating' 
  | 'agent_pr_ready' 
  | 'resolved' 
  | 'closed' 
  | 'wontfix';

export type AgentStatus = 'idle' | 'pending' | 'in_progress' | 'completed' | 'failed' | 'pr_created';

export interface DiagnosticContext {
  route: string;
  feature: string;
  timestamp: string;
  userAgent: string;
  platform: string;
  deviceCategory: string;
  screenResolution: string;
  windowSize: string;
  language: string;
  online: boolean;
  gameMode?: string;
  boardTheme?: string;
  soundEnabled?: boolean;
  stockfishLevel?: number;
  recentConsoleErrors?: string[];
  recentNetworkErrors?: string[];
  additionalNotes?: string;
}

export interface BugReport {
  id: string;
  userId: string;
  userEmail?: string | null;
  description: string;
  reproductionSteps: string[];
  screenshotUrl?: string | null;
  route: string;
  feature: string;
  browser: string;
  device: string;
  consoleErrors: string[];
  diagnosticContext: DiagnosticContext;
  status: BugStatus;
  severity: BugSeverity;
  category: BugCategory;
  aiSummary?: string;
  aiDiagnosis?: string;
  reproductionPlan?: string;
  suspectedFiles?: string[];
  eligibleForAgent: boolean;
  requiresHumanReview?: boolean;
  confidenceLevel?: number;
  githubIssueUrl?: string | null;
  githubPrUrl?: string | null;
  githubBranch?: string | null;
  deploymentUrl?: string | null;
  resolutionMessage?: string | null;
  julesSessionId?: string | null;
  julesSessionUrl?: string | null;
  agentStatus?: AgentStatus;
  agentStartedAt?: string | null;
  agentCompletedAt?: string | null;
  agentSummary?: string | null;
  agentError?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

export interface CreateBugReportInput {
  description: string;
  reproductionSteps?: string[];
  screenshotBase64?: string | null;
  route?: string;
  feature?: string;
  diagnosticContext?: Partial<DiagnosticContext>;
  userId?: string;
  userEmail?: string | null;
}

export interface DispatchToJulesRequest {
  bugId: string;
  summary?: string;
  description?: string;
  reproductionSteps?: string[];
  diagnosticContext?: Record<string, any>;
  aiDiagnosis?: string;
  suspectedFiles?: string[];
}

export interface DispatchToJulesResponse {
  success: boolean;
  bugId: string;
  julesSessionId: string;
  julesSessionUrl?: string;
  agentStatus: AgentStatus;
  message: string;
  startedAt: string;
}
