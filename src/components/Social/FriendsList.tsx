import React, { useState } from 'react';
import { Friend, TimeControlCategory } from '../../types/chess';
import { Users, UserPlus, Swords, Circle, MessageSquare, Check, X } from 'lucide-react';

interface FriendsListProps {
  friends: Friend[];
  onChallengeFriend: (friend: Friend, timeCategory: TimeControlCategory) => void;
  onAddFriend: (username: string) => void;
}

export const FriendsList: React.FC<FriendsListProps> = ({
  friends: initialFriends,
  onChallengeFriend,
  onAddFriend,
}) => {
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const [selectedFriendForChallenge, setSelectedFriendForChallenge] = useState<Friend | null>(null);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendUsername.trim()) return;
    onAddFriend(newFriendUsername.trim());
    setFriends(prev => [
      ...prev,
      {
        id: `fr-${Date.now()}`,
        username: newFriendUsername.trim(),
        avatar: '♟️',
        country: 'US',
        elo: 1500,
        status: 'online',
        lastSeen: 'Now',
        winRecordAgainst: { wins: 0, losses: 0, draws: 0 }
      }
    ]);
    setNewFriendUsername('');
    setShowAddModal(false);
  };

  const handleSelectChallenge = (category: TimeControlCategory) => {
    if (selectedFriendForChallenge) {
      onChallengeFriend(selectedFriendForChallenge, category);
      setSelectedFriendForChallenge(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-slate-100">
              Chess Friends & Rivals
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Connect, track head-to-head records, and challenge friends to live matches
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-md cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Friend</span>
        </button>
      </div>

      {/* Add Friend Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100">Send Friend Request</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <input
                type="text"
                value={newFriendUsername}
                onChange={(e) => setNewFriendUsername(e.target.value)}
                placeholder="Enter player username..."
                className="w-full bg-slate-950 text-slate-100 text-xs px-3 py-2.5 rounded-lg border border-slate-700 outline-none focus:border-amber-400"
                autoFocus
              />
              <button
                type="submit"
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Send Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Challenge Time Control Selection Modal */}
      {selectedFriendForChallenge && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Challenge {selectedFriendForChallenge.username}
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Select Time Control
                </span>
              </div>
              <button
                onClick={() => setSelectedFriendForChallenge(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSelectChallenge('bullet')}
                className="p-3 bg-slate-950 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left transition-colors cursor-pointer"
              >
                <span className="text-xs font-bold text-slate-100 block">⚡ 1 | 0 Bullet</span>
                <span className="text-[10px] text-slate-400">Fast & furious</span>
              </button>
              <button
                onClick={() => handleSelectChallenge('blitz')}
                className="p-3 bg-slate-950 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left transition-colors cursor-pointer"
              >
                <span className="text-xs font-bold text-slate-100 block">🔥 3 | 0 Blitz</span>
                <span className="text-[10px] text-slate-400">Standard blitz</span>
              </button>
              <button
                onClick={() => handleSelectChallenge('rapid')}
                className="p-3 bg-slate-950 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left transition-colors cursor-pointer"
              >
                <span className="text-xs font-bold text-slate-100 block">⏱ 10 | 0 Rapid</span>
                <span className="text-[10px] text-slate-400">Deep strategy</span>
              </button>
              <button
                onClick={() => handleSelectChallenge('classical')}
                className="p-3 bg-slate-950 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left transition-colors cursor-pointer"
              >
                <span className="text-xs font-bold text-slate-100 block">♟ Unlimited</span>
                <span className="text-[10px] text-slate-400">Casual friendly</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Friends Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between gap-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
                    {friend.avatar}
                  </div>
                  <span
                    className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                      friend.status === 'online'
                        ? 'bg-emerald-500'
                        : friend.status === 'in-game'
                        ? 'bg-amber-500'
                        : 'bg-slate-600'
                    }`}
                    title={`Status: ${friend.status}`}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    {friend.title && (
                      <span className="px-1 py-0.2 text-[10px] font-black bg-amber-500 text-slate-950 rounded font-mono">
                        {friend.title}
                      </span>
                    )}
                    <span className="font-semibold text-sm text-slate-100">{friend.username}</span>
                    <span className="text-xs font-mono text-slate-400">({friend.elo})</span>
                  </div>
                  <span className="text-[11px] text-slate-400 capitalize">
                    {friend.status === 'in-game' ? 'Playing a match' : friend.status} · {friend.country}
                  </span>
                </div>
              </div>
            </div>

            {/* Head to Head Record & Challenge Action */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="text-[11px] text-slate-400">
                Record: <span className="font-mono font-bold text-emerald-400">{friend.winRecordAgainst.wins}W</span> - <span className="font-mono font-bold text-rose-400">{friend.winRecordAgainst.losses}L</span> - <span className="font-mono text-slate-400">{friend.winRecordAgainst.draws}D</span>
              </div>

              <button
                onClick={() => setSelectedFriendForChallenge(friend)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Challenge</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
