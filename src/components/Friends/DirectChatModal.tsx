import React, { useState, useEffect, useRef } from 'react';
import { 
  FriendUser, 
  DirectMessage, 
  getChatId, 
  subscribeToDirectMessages, 
  sendDirectMessage 
} from '../../firebase/socialService';
import { useAuth } from '../../context/AuthContext';
import { sound } from '../../utils/sound';
import { 
  X, 
  Send, 
  Swords, 
  Smile, 
  MessageSquare, 
  User, 
  Clock, 
  Sparkles 
} from 'lucide-react';

interface DirectChatModalProps {
  friend: FriendUser;
  isOpen: boolean;
  onClose: () => void;
  onChallengeFriend: (friend: FriendUser) => void;
}

export const DirectChatModal: React.FC<DirectChatModalProps> = ({
  friend,
  isOpen,
  onClose,
  onChallengeFriend,
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatId = user ? getChatId(user.uid, friend.userId) : '';

  useEffect(() => {
    if (!isOpen || !chatId) return;

    const unsub = subscribeToDirectMessages(chatId, (newMsgs) => {
      setMessages(newMsgs);
    });

    return () => unsub();
  }, [isOpen, chatId]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen || !user) return null;

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isSending) return;

    setIsSending(true);
    setInputText('');
    try {
      await sendDirectMessage(chatId, friend.userId, text);
      sound.playMove();
    } catch (err) {
      console.warn('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const quickReactions = [
    '⚔️ Ready for a match?',
    '🔥 Good game!',
    '⏱️ 3+0 Blitz rematch?',
    '👋 Hey! Up for some chess?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg h-[600px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              {friend.photoURL ? (
                <img
                  src={friend.photoURL}
                  alt={friend.displayName}
                  className="w-10 h-10 rounded-2xl object-cover border border-slate-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold flex items-center justify-center text-sm">
                  {friend.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                  friend.status === 'online'
                    ? 'bg-emerald-400'
                    : friend.status === 'in-game'
                    ? 'bg-amber-400'
                    : 'bg-slate-600'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">{friend.displayName}</h3>
                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-amber-400 font-bold border border-slate-700">
                  {friend.rating || 1200}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                {friend.status === 'online' ? (
                  <span className="text-emerald-400 font-medium">● Online</span>
                ) : friend.status === 'in-game' ? (
                  <span className="text-amber-400 font-medium">⚔️ In a match</span>
                ) : (
                  <span>Offline</span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onChallengeFriend(friend);
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Challenge</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-900/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Direct Message with {friend.displayName}</h4>
              <p className="text-xs text-slate-400 max-w-xs">
                Send a friendly greeting or challenge them to an exciting live chess match!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === user.uid;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs ${
                      isMine
                        ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-sm shadow-md'
                        : 'bg-slate-800 text-white rounded-tl-sm border border-slate-700'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 px-1 font-mono">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Reactions */}
        <div className="p-2 px-4 bg-slate-950/60 border-t border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar">
          {quickReactions.map((reaction) => (
            <button
              key={reaction}
              onClick={() => handleSend(reaction)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] whitespace-nowrap transition-colors cursor-pointer border border-slate-700/60"
            >
              {reaction}
            </button>
          ))}
        </div>

        {/* Input Box */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Message ${friend.displayName}...`}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-400"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isSending}
            className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
