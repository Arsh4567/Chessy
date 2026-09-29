import React, { useState, useEffect, useRef } from 'react';
import { 
  Bug, 
  X, 
  Send, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Plus, 
  Trash2, 
  ShieldCheck,
  Monitor
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BugReport } from '../../types/bugReport';

interface ReportBugModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoute?: string;
  activeFeature?: string;
  onReportSubmitted?: (report: BugReport) => void;
}

export const ReportBugModal: React.FC<ReportBugModalProps> = ({
  isOpen,
  onClose,
  currentRoute = '/play',
  activeFeature = 'Chess Arena',
  onReportSubmitted,
}) => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<string[]>(['']);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<BugReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Capture recent console errors safely in memory
  const [capturedConsoleErrors, setCapturedConsoleErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setDescription('');
      setSteps(['']);
      setScreenshotBase64(null);
      setSubmittedReport(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleAddStep = () => {
    setSteps([...steps, '']);
  };

  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    } else {
      setSteps(['']);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPEG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Screenshot image size must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotBase64(reader.result as string);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage('Please describe the issue before submitting.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const filteredSteps = steps.map((s) => s.trim()).filter(Boolean);

    const diagnosticContext = {
      route: currentRoute,
      feature: activeFeature,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      deviceCategory: window.innerWidth < 768 ? 'Mobile' : window.innerWidth < 1024 ? 'Tablet' : 'Desktop',
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      online: navigator.onLine,
      recentConsoleErrors: capturedConsoleErrors,
    };

    try {
      const response = await fetch('/api/bugs/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: description.trim(),
          reproductionSteps: filteredSteps,
          screenshotBase64,
          route: currentRoute,
          feature: activeFeature,
          diagnosticContext,
          userId: user?.uid || 'anonymous',
          userEmail: user?.email || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to submit bug report');
      }

      setSubmittedReport(data.report);
      if (onReportSubmitted) {
        onReportSubmitted(data.report);
      }
    } catch (err: any) {
      console.error('Error submitting bug:', err);
      setErrorMessage(err.message || 'Network error occurred while submitting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#0c1424] border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-bug-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h2 id="report-bug-title" className="text-base font-bold text-white leading-tight">
                Report a Problem
              </h2>
              <p className="text-xs text-slate-400">
                Help improve Chessy • Automated AI triage & resolution
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {submittedReport ? (
            /* Success State */
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">
                  Thanks for helping improve Chessy.
                </h3>
                <p className="text-sm text-slate-300">
                  We're analyzing your report.
                </p>
              </div>

              {/* Triage summary card */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-left space-y-2 max-w-md mx-auto">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Report ID:</span>
                  <span className="font-mono text-sky-400 font-semibold">{submittedReport.id}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Category:</span>
                  <span className="capitalize text-amber-300 font-medium">{submittedReport.category}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Severity:</span>
                  <span className="uppercase text-xs font-bold text-emerald-400">{submittedReport.severity}</span>
                </div>
                {submittedReport.aiSummary && (
                  <div className="pt-2 border-t border-slate-800 text-xs text-slate-300">
                    <span className="text-slate-400 font-medium block">AI Analysis:</span>
                    {submittedReport.aiSummary}
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all cursor-pointer shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Submission Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Context Detection Badges */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Monitor className="w-3.5 h-3.5 text-sky-400" />
                  <span>Area:</span>
                  <span className="font-semibold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                    {activeFeature}
                  </span>
                  <span className="text-slate-500 font-mono">({currentRoute})</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Auto-diagnostics attached</span>
                </div>
              </div>

              {/* Bug Description */}
              <div className="space-y-1.5">
                <label htmlFor="bug-description" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  What happened? <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="bug-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you observed, what you expected, or any unexpected board / engine behavior..."
                  rows={4}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm transition-all resize-none"
                />
              </div>

              {/* Optional Reproduction Steps */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Steps to Reproduce <span className="text-slate-500 font-normal normal-case">(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Step</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 text-xs text-slate-500 font-mono text-right shrink-0">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => handleStepChange(idx, e.target.value)}
                        placeholder={`e.g. ${idx === 0 ? 'Click 3D Models toggle in /play' : idx === 1 ? 'Make a move e2 to e4' : 'Rotate camera with mouse'}`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:border-sky-500"
                      />
                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Remove step"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Screenshot Upload / Attachment */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Screenshot Attachment <span className="text-slate-500 font-normal normal-case">(Optional)</span>
                </label>
                
                {screenshotBase64 ? (
                  <div className="relative rounded-xl border border-slate-800 overflow-hidden bg-slate-950 p-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={screenshotBase64} 
                        alt="Screenshot Preview" 
                        className="w-16 h-12 object-cover rounded-lg border border-slate-700"
                      />
                      <span className="text-xs text-slate-300 font-medium">Screenshot attached</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScreenshotBase64(null)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 text-xs transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-3 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-900/40 transition-all flex items-center justify-center gap-2 text-xs text-slate-400"
                  >
                    <Camera className="w-4 h-4 text-sky-400" />
                    <span>Upload or drag a screenshot image</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Privacy & Security Safe Guard Notice */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  Diagnostic reports are sanitized server-side. Never submit passwords, private credentials, or personal keys.
                </p>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !description.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Analyzing & Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Bug Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
