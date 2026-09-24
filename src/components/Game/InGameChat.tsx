import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../types/chess';
import { Send, Smile, MessageSquare } from 'lucide-react';
import { sound } from '../../utils/sound';

interface InGameChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, isEmote?: boolean) => void;
  opponentName: string;
}

const QUICK_EMOTES = ['👑', '♟️', '⚔️', '🔥', '😮', '🤝', '☕', '💡'];
const QUICK_PHRASES = [
  'Good luck, have fun!',
  'Nice move!',
  'Check!',
  'Thanks for the game!',
  'Well played!',
  'Rematch?'
];

export const InGameChat: React.FC<InGameChatProps> = ({
  messages,
  onSendMessage,
  opponentName,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleEmoteClick = (emote: string) => {
    onSendMessage(emote, true);
    setShowEmotePicker(false);
  };

  const handlePhraseClick = (phrase: string) => {
    onSendMessage(phrase);
    setShowEmotePicker(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
          <span>Match Chat</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          vs {opponentName}
        </span>
      </div>

      {/* Messages Container */}
      <div className="flex-1 p-2.5 overflow-y-auto space-y-2 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4">
            <Smile className="w-6 h-6 text-slate-600 mb-1" />
            <p className="text-[11px]">No messages yet. Send an emote or quick greeting!</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.sender === 'system') {
              return (
                <div key={msg.id} className="text-center my-1">
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isMe = msg.sender === 'player';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                  <span className="font-semibold">{msg.senderName}</span>
                  <span>·</span>
                  <span className="font-mono">{msg.timestamp}</span>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-xl max-w-[85%] break-words ${
                    msg.isEmote
                      ? 'text-2xl bg-transparent p-0'
                      : isMe
                      ? 'bg-amber-600/90 text-white rounded-tr-none'
                      : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/60'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Emote Picker drawer */}
      {showEmotePicker && (
        <div className="p-2 bg-slate-950 border-t border-slate-800 animate-in slide-in-from-bottom duration-150">
          <div className="flex items-center justify-between gap-1 mb-2">
            {QUICK_EMOTES.map((em) => (
              <button
                key={em}
                onClick={() => handleEmoteClick(em)}
                className="w-8 h-8 flex items-center justify-center text-lg hover:scale-125 transition-transform"
              >
                {em}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {QUICK_PHRASES.map((ph) => (
              <button
                key={ph}
                onClick={() => handlePhraseClick(ph)}
                className="px-2 py-1 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {ph}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="p-2 bg-slate-950/80 border-t border-slate-800 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowEmotePicker(!showEmotePicker)}
          className={`p-1.5 rounded-lg transition-colors ${
            showEmotePicker ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Emotes & Phrases"
        >
          <Smile className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a message..."
          className="flex-1 bg-slate-800 text-slate-100 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 transition-colors"
          title="Send"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
