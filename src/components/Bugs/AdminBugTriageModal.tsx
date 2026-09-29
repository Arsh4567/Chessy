import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  X, 
  Play, 
  ExternalLink, 
  RefreshCw, 
  GitPullRequest, 
  GitBranch, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileCode, 
  Shield, 
  Sparkles, 
  Filter, 
  ChevronRight,
  Bug
} from 'lucide-react';
import { BugReport, BugStatus, BugSeverity, BugCategory } from '../../types/bugReport';
import { useAuth } from '../../context/AuthContext';

interface AdminBugTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedBugId?: string;
}

export const AdminBugTriageModal: React.FC<AdminBugTriageModalProps> = ({
  isOpen,
  onClose,
  initialSelectedBugId,
}) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<BugReport[]>([]);
  const [selectedBugId, setSelectedBugId] = useState<string | null>(initialSelectedBugId || null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Jules dispatch state
  const [dispatchStage, setDispatchStage] = useState<'idle' | 'preparing' | 'dispatched' | 'error'>('idle');
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch bugs on modal open
  const fetchBugReports = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bugs/list');
      const data = await response.json();
      if (data.success && Array.isArray(data.reports)) {
        setReports(data.reports);
        if (!selectedBugId && data.reports.length > 0) {
          setSelectedBugId(data.reports[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching bug reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBugReports();
      setDispatchStage('idle');
      setDispatchError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialSelectedBugId) {
      setSelectedBugId(initialSelectedBugId);
    }
  }, [initialSelectedBugId]);

  // Selected report object
  const selectedReport = reports.find((r) => r.id === selectedBugId) || reports[0] || null;

  // Dispatch to Jules handler
  const handleSendToJules = async () => {
    if (!selectedReport) return;

    setDispatchStage('preparing');
    setDispatchError(null);

    try {
      const response = await fetch('/api/bugs/dispatch-to-jules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': user?.email || 'sewasingh13111944@gmail.com',
        },
        body: JSON.stringify({
          bugId: selectedReport.id,
          summary: selectedReport.aiSummary,
          description: selectedReport.description,
          reproductionSteps: selectedReport.reproductionSteps,
          diagnosticContext: selectedReport.diagnosticContext,
          aiDiagnosis: selectedReport.aiDiagnosis,
          suspectedFiles: selectedReport.suspectedFiles,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to dispatch to Jules API');
      }

      setDispatchStage('dispatched');
      
      // Update local report object with returned Jules state
      setReports((prev) =>
        prev.map((r) => (r.id === selectedReport.id ? { ...r, ...data.report, agentStatus: 'in_progress', status: 'agent_investigating' } : r))
      );
    } catch (err: any) {
      console.error('Error dispatching to Jules:', err);
      setDispatchStage('error');
      setDispatchError(err.message || 'Jules dispatch failed');
    }
  };

  // Refresh Jules status
  const handleRefreshJulesStatus = async () => {
    if (!selectedReport) return;
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/bugs/${selectedReport.id}/jules-status`);
      const data = await response.json();
      if (data.success && data.report) {
        setReports((prev) =>
          prev.map((r) => (r.id === selectedReport.id ? data.report : r))
        );
      }
    } catch (err) {
      console.error('Error refreshing Jules status:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isOpen) return null;

  const filteredReports = reports.filter((r) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'investigating') return r.status === 'agent_investigating';
    if (statusFilter === 'pr_ready') return r.status === 'agent_pr_ready' || !!r.githubPrUrl;
    if (statusFilter === 'open') return r.status === 'open' || r.status === 'triaged';
    return r.status === statusFilter;
  });

  const getSeverityBadgeClass = (severity: BugSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'low':
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
    }
  };

  const getStatusBadgeClass = (status: BugStatus) => {
    switch (status) {
      case 'agent_investigating':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40 animate-pulse';
      case 'agent_pr_ready':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'resolved':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'triaged':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-[#080e1a] border border-slate-800 rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-triage-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="admin-triage-title" className="text-lg font-bold text-white font-display">
                  Bug Triage & Jules AI Agent Center
                </h2>
                <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 text-[11px] font-bold font-mono text-sky-300 uppercase">
                  Connected Repo: sewasingh13111944/chessy
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated Gemini root-cause diagnosis & autonomous Jules coding sessions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchBugReports}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Refresh bug list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Layout: Left list (40%) + Right Details & Jules Agent Controller (60%) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* Left Column: Bug List */}
          <div className="lg:col-span-5 flex flex-col min-h-0 bg-[#070c14]/60">
            {/* Filter Toolbar */}
            <div className="p-3 border-b border-slate-800/80 bg-slate-900/30 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1 text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span className="font-semibold">Filter:</span>
              </div>
              <div className="flex items-center gap-1">
                {['all', 'open', 'investigating', 'pr_ready'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer capitalize ${
                      statusFilter === f
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {f === 'pr_ready' ? 'PR Ready' : f}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 p-2 space-y-1">
              {filteredReports.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No bug reports found in this view.
                </div>
              ) : (
                filteredReports.map((report) => {
                  const isSelected = selectedBugId === report.id;
                  return (
                    <div
                      key={report.id}
                      onClick={() => {
                        setSelectedBugId(report.id);
                        setDispatchStage('idle');
                        setDispatchError(null);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-slate-800/90 border-sky-500/60 ring-1 ring-sky-500/30 shadow-md'
                          : 'bg-slate-900/40 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSeverityBadgeClass(report.severity)}`}>
                            {report.severity}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadgeClass(report.status)}`}>
                            {report.status.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white line-clamp-1">
                        {report.aiSummary || report.description}
                      </h4>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                        <span className="truncate max-w-[160px]">
                          Route: <code className="text-sky-400">{report.route}</code>
                        </span>
                        {report.julesSessionId && (
                          <span className="flex items-center gap-1 text-sky-400 font-mono text-[10px]">
                            <Sparkles className="w-3 h-3" />
                            Jules Active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Detailed Triage & Jules Agent Control */}
          <div className="lg:col-span-7 flex flex-col min-h-0 bg-[#0c1424] overflow-y-auto">
            {selectedReport ? (
              <div className="p-6 space-y-6">
                {/* Bug Summary Header Card */}
                <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase border ${getSeverityBadgeClass(selectedReport.severity)}`}>
                        {selectedReport.severity} Priority
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300 capitalize">
                        {selectedReport.category}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">ID: {selectedReport.id}</span>
                  </div>

                  <h3 className="text-base font-bold text-white leading-snug">
                    {selectedReport.aiSummary || selectedReport.description}
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-500 block">Route</span>
                      <span className="font-mono text-slate-200">{selectedReport.route}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Feature</span>
                      <span className="text-slate-200">{selectedReport.feature}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Device</span>
                      <span className="text-slate-200">{selectedReport.device}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Reported</span>
                      <span className="text-slate-200">{new Date(selectedReport.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* User Description & Steps */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    User Report Details
                  </h4>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 space-y-2">
                    <p className="whitespace-pre-wrap">{selectedReport.description}</p>
                    
                    {selectedReport.reproductionSteps && selectedReport.reproductionSteps.length > 0 && (
                      <div className="pt-2 border-t border-slate-800">
                        <span className="text-slate-400 font-semibold block mb-1">Reproduction Steps:</span>
                        <ol className="list-decimal list-inside space-y-1 text-slate-300">
                          {selectedReport.reproductionSteps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </div>

                {/* Gemini AI Root Cause & Code Analysis Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-900/60 border border-indigo-500/30 space-y-3 shadow-lg">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>Gemini AI Triage Analysis</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-indigo-300/80 font-semibold block">Probable Root Cause:</span>
                      <p className="text-slate-200 mt-0.5 leading-relaxed">
                        {selectedReport.aiDiagnosis || 'Awaiting detailed code inspection.'}
                      </p>
                    </div>

                    {selectedReport.suspectedFiles && selectedReport.suspectedFiles.length > 0 && (
                      <div className="pt-2 border-t border-indigo-950/60">
                        <span className="text-indigo-300/80 font-semibold block mb-1">Suspected Components / Files:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedReport.suspectedFiles.map((file, idx) => (
                            <span 
                              key={idx}
                              className="px-2 py-1 rounded bg-slate-900/90 border border-indigo-500/30 text-indigo-300 font-mono text-[11px] flex items-center gap-1"
                            >
                              <FileCode className="w-3 h-3" />
                              {file}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Jules AI Coding Agent Control Panel */}
                <div className="p-5 rounded-2xl bg-[#09101d] border border-sky-500/40 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
                      <Terminal className="w-4 h-4" />
                      <span>Jules Autonomous Coding Session</span>
                    </div>

                    {selectedReport.julesSessionId && (
                      <button
                        onClick={handleRefreshJulesStatus}
                        disabled={isRefreshing}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>Sync Jules Status</span>
                      </button>
                    )}
                  </div>

                  {/* Jules Session Details / Status if active */}
                  {selectedReport.julesSessionId ? (
                    <div className="space-y-3 text-xs">
                      {/* Status Banner */}
                      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500" />
                          </span>
                          <div>
                            <span className="font-bold text-white block">
                              Jules is investigating this issue.
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Status: <strong className="text-sky-400 uppercase">{selectedReport.agentStatus || 'IN PROGRESS'}</strong>
                            </span>
                          </div>
                        </div>

                        {selectedReport.julesSessionUrl && (
                          <a
                            href={selectedReport.julesSessionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>Open Jules Session</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {/* Session Metadata Grid */}
                      <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px]">
                        <div>
                          <span className="text-slate-500 block">Jules Session ID:</span>
                          <span className="font-mono text-slate-200 truncate block">{selectedReport.julesSessionId}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Started At:</span>
                          <span className="text-slate-200">
                            {selectedReport.agentStartedAt ? new Date(selectedReport.agentStartedAt).toLocaleTimeString() : 'Recently'}
                          </span>
                        </div>
                        {selectedReport.githubBranch && (
                          <div>
                            <span className="text-slate-500 block">Git Branch:</span>
                            <span className="font-mono text-sky-300 flex items-center gap-1">
                              <GitBranch className="w-3 h-3" />
                              {selectedReport.githubBranch}
                            </span>
                          </div>
                        )}
                        {selectedReport.githubPrUrl && (
                          <div>
                            <span className="text-slate-500 block">GitHub Pull Request:</span>
                            <a
                              href={selectedReport.githubPrUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <GitPullRequest className="w-3 h-3" />
                              <span>View Pull Request</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {selectedReport.agentSummary && (
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                          <span className="text-slate-400 font-semibold block mb-1">Agent Summary:</span>
                          <p className="text-slate-200">{selectedReport.agentSummary}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Initial State: Send to Jules CTA */
                    <div className="space-y-3 text-xs">
                      <p className="text-slate-300">
                        Dispatch this sanitized bug report to Jules to clone the repository, run tests, diagnose the root cause, and create a verified pull request.
                      </p>

                      {dispatchStage === 'preparing' ? (
                        <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-500/40 flex items-center gap-3 text-sky-300">
                          <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin shrink-0" />
                          <span className="font-semibold">Preparing investigation & contacting Jules API...</span>
                        </div>
                      ) : dispatchStage === 'dispatched' ? (
                        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-2 text-emerald-300 font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Jules is investigating this issue.</span>
                        </div>
                      ) : (
                        <button
                          onClick={handleSendToJules}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>Send to Jules</span>
                        </button>
                      )}

                      {dispatchError && (
                        <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block">Dispatch Error</span>
                            <span>{dispatchError}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-sm flex flex-col items-center justify-center h-full">
                <Bug className="w-8 h-8 text-slate-600 mb-2" />
                <span>Select a bug report from the left panel to inspect details and dispatch to Jules.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
