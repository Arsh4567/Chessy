import React from 'react';
import { AppNotification } from '../../types/chess';
import { Bell, Check, Swords, Trophy, Clock, X } from 'lucide-react';

interface NotificationCenterProps {
  notifications: AppNotification[];
  isOpen: boolean;
  onClose: () => void;
  onAcceptChallenge?: (notif: AppNotification) => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  isOpen,
  onClose,
  onAcceptChallenge,
  onDismiss,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-14 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="p-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-100">Live Alerts & Invites</span>
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notification Items */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 p-1">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No new notifications. You are all caught up!
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3 rounded-xl transition-colors space-y-1.5 ${
                notif.read ? 'bg-slate-900/40' : 'bg-slate-800/50 border border-amber-500/20'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {notif.type === 'challenge' ? (
                    <Swords className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : notif.type === 'tournament' ? (
                    <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                  )}
                  <h4 className="text-xs font-bold text-slate-100">{notif.title}</h4>
                </div>
                <button
                  onClick={() => onDismiss(notif.id)}
                  className="text-slate-500 hover:text-slate-300 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <p className="text-[11px] text-slate-300 leading-tight">
                {notif.message}
              </p>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 font-mono">
                  {notif.timestamp}
                </span>

                {notif.type === 'challenge' && onAcceptChallenge && (
                  <button
                    onClick={() => {
                      onAcceptChallenge(notif);
                      onDismiss(notif.id);
                    }}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                  >
                    Accept Challenge
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
