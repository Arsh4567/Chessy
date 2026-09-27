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
    <div className="fixed top-20 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50 max-w-sm w-[92vw] sm:w-full bg-slate-900/95 border-2 border-amber-500/80 rounded-3xl p-4 shadow-2xl shadow-amber-500/25 backdrop-blur-md animate-in slide-in-from-top duration-300">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xl shrink-0 shadow-inner">
          <BellRing className="w-5 h-5 text-amber-400 animate-bounce" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400">
              GrandmasterHub Alert
            </span>
            <button
              onClick={() => setActiveNotification(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <h4 className="text-xs font-bold text-white truncate">
            {activeNotification.title}
          </h4>

          <p className="text-[11px] text-slate-300 leading-snug">
            {activeNotification.body}
          </p>

          <div className="flex items-center gap-2 pt-1.5">
            <button
              onClick={() => {
                setActiveNotification(null);
                if (onNavigateTab) onNavigateTab('play');
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
            >
              <span>Play Now</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => setActiveNotification(null)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors cursor-pointer border border-slate-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
