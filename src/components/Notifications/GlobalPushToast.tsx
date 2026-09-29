import React, { useState, useEffect } from 'react';
import { subscribeToInAppPush, InAppPushPayload } from '../../utils/pushNotifications';
import { sound } from '../../utils/sound';
import { BellRing, X, Swords, ArrowRight } from 'lucide-react';

interface GlobalPushToastProps {
  onNavigateTab?: (tab: string) => void;
}

export const GlobalPushToast: React.FC<GlobalPushToastProps> = ({ onNavigateTab }) => {
  const [activeNotification, setActiveNotification] = useState<InAppPushPayload | null>(null);

  useEffect(() => {
    const unsub = subscribeToInAppPush((payload) => {
      sound.playMatchStart();
      setActiveNotification(payload);

      // Auto dismiss after 6 seconds
      const timer = setTimeout(() => {
        setActiveNotification((current) => (current?.id === payload.id ? null : current));
      }, 6000);

      return () => clearTimeout(timer);
    });

    return () => unsub();
  }, []);

  if (!activeNotification) return null;

  return (
    <div className="fixed top-18 right-4 sm:right-6 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-96 bg-[#0c1424]/95 border border-slate-700/80 rounded-2xl p-4 shadow-xl shadow-black/50 backdrop-blur-md animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-base shrink-0">
          <BellRing className="w-4 h-4 text-amber-400" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] uppercase tracking-wider font-bold font-mono text-amber-400">
              Chessy Notification
            </span>
            <button
              onClick={() => setActiveNotification(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <h4 className="text-xs font-bold text-white truncate">
            {activeNotification.title}
          </h4>

          <p className="text-xs text-slate-300 leading-snug">
            {activeNotification.body}
          </p>

          <div className="flex items-center gap-2 pt-1.5">
            <button
              onClick={() => {
                setActiveNotification(null);
                if (onNavigateTab) onNavigateTab('play');
              }}
              className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
            >
              <span>Play Now</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => setActiveNotification(null)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer border border-slate-700/80"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
