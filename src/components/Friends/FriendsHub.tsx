import React, { useState, useEffect, useMemo } from 'react';
import { 
  FriendUser, 
  FriendRequest, 
  GameChallenge, 
  UserPresence, 
  subscribeToFriends, 
  subscribeToFriendRequests, 
  subscribeToIncomingChallenges,
  subscribeToOutgoingChallenges,
  sendFriendRequest, 
  acceptFriendRequest, 
  declineFriendRequest, 
  removeFriend, 
  searchCommunityUsers,
  updateUserPresence,
  respondToGameChallenge
} from '../../firebase/socialService';
import { useAuth } from '../../context/AuthContext';
import { TimeControl, PieceColor } from '../../types/chess';
import { DirectChatModal } from './DirectChatModal';
import { ChallengeFriendModal } from './ChallengeFriendModal';
import { sound } from '../../utils/sound';
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  Swords, 
  Search, 
  Check, 
  X, 
  Trash2, 
  Loader2, 
  BellRing
} from 'lucide-react';

interface FriendsHubProps {
  onStartDirectMatch: (timeControl: TimeControl, color: PieceColor, roomId: string) => void;
}

type SocialTab = 'friends' | 'challenges' | 'requests' | 'search';

export const FriendsHub: React.FC<FriendsHubProps> = ({ onStartDirectMatch }) => {
  const { user, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<SocialTab>('friends');

  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [incomingChallenges, setIncomingChallenges] = useState<GameChallenge[]>([]);
  const [outgoingChallenges, setOutgoingChallenges] = useState<GameChallenge[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, UserPresence>>({});

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [sentRequestMap, setSentRequestMap] = useState<Record<string, boolean>>({});

  const [selectedChatFriend, setSelectedChatFriend] = useState<FriendUser | null>(null);
  const [selectedChallengeFriend, setSelectedChallengeFriend] = useState<FriendUser | null>(null);

  useEffect(() => {
    if (!user) return;

    updateUserPresence(user.uid, 'online');
    const presenceInterval = setInterval(() => {
      updateUserPresence(user.uid, 'online');
    }, 45000);

    const unsubFriends = subscribeToFriends(user.uid, (friendsList) => {
      setFriends(friendsList);
    });

    const unsubRequests = subscribeToFriendRequests(user.uid, (incoming, outgoing) => {
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    });

    const unsubIncomingChallenges = subscribeToIncomingChallenges(user.uid, (challenges) => {
      setIncomingChallenges(challenges);
      if (challenges.length > 0) {
        sound.playMatchStart();
      }
    });

    const unsubOutgoingChallenges = subscribeToOutgoingChallenges(user.uid, (challenges) => {
      setOutgoingChallenges(challenges);
    });

    return () => {
      clearInterval(presenceInterval);
      unsubFriends();
      unsubRequests();
      unsubIncomingChallenges();
      unsubOutgoingChallenges();
    };
  }, [user]);

  // Search users debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCommunityUsers(searchQuery);
        // Exclude self from search results
        const filtered = results.filter((r) => r.userId !== user?.uid);
        setSearchResults(filtered);
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const handleSendFriendRequest = async (target: FriendUser) => {
    if (!user) return;
    try {
      await sendFriendRequest(target);
      setSentRequestMap((prev) => ({ ...prev, [target.userId]: true }));
      sound.playMove();
    } catch (err) {
      console.warn('Error sending friend request:', err);
    }
  };

  const handleAcceptRequest = async (req: FriendRequest) => {
    try {
      await acceptFriendRequest(req);
      sound.playMatchStart();
    } catch (err) {
      console.warn('Error accepting request:', err);
    }
  };

  const handleDeclineRequest = async (reqId: string) => {
    try {
      await declineFriendRequest(reqId);
      sound.playMove();
    } catch (err) {
      console.warn('Error declining request:', err);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await removeFriend(friendId);
      sound.playMove();
    } catch (err) {
      console.warn('Error removing friend:', err);
    }
  };

  const handleAcceptChallenge = async (challenge: GameChallenge) => {
    sound.playMatchStart();
    await respondToGameChallenge(challenge.id, 'accepted');

    let assignedColor: PieceColor = 'b';
    if (challenge.challengerColor === 'w') {
      assignedColor = 'b';
    } else if (challenge.challengerColor === 'b') {
      assignedColor = 'w';
    } else {
      assignedColor = Math.random() > 0.5 ? 'w' : 'b';
    }

    onStartDirectMatch(challenge.timeControl, assignedColor, challenge.roomId);
  };

  const handleDeclineChallenge = async (challengeId: string) => {
    sound.playGameOver();
    await respondToGameChallenge(challengeId, 'declined');
  };

  const handleCancelOutgoingChallenge = async (challengeId: string) => {
    sound.playMove();
    await respondToGameChallenge(challengeId, 'cancelled');
  };

  const enrichedFriends = useMemo(() => {
    return friends.map((f) => {
      const presence = presenceMap[f.userId];
      return {
        ...f,
        status: presence?.status || 'offline',
        lastActive: presence?.lastActive,
      };
    }).sort((a, b) => {
      const rank = (status?: string) => (status === 'online' ? 0 : status === 'in-game' ? 1 : 2);
      return rank(a.status) - rank(b.status);
    });
  }, [friends, presenceMap]);

  const onlineFriendsCount = enrichedFriends.filter((f) => f.status === 'online').length;

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-6 animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-3xl mx-auto">
          👥
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-2xl font-bold font-display text-white">Community & Friends Hub</h2>
          <p className="text-sm text-slate-400">
            Sign in with Google to add friends, check live online presence, send direct messages, and challenge fellow players to live matches.
          </p>
        </div>
        <button
          onClick={() => openAuthModal('login')}
          className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm inline-flex items-center gap-2 shadow-md transition-all cursor-pointer"
        >
          <span>Sign In / Register</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-300 pb-20 md:pb-10">
      {/* Top Header Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-2xl shrink-0">
            👥
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-white">
              Friends & Social Hub
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Live friend status, direct messaging, and custom match invitations.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-800">
          <div className="text-center px-2">
            <span className="text-xs text-emerald-400 font-semibold block">Online Now</span>
            <span className="text-lg font-mono font-bold text-emerald-400">
              {onlineFriendsCount}
            </span>
          </div>
          <div className="text-center border-l border-slate-800 pl-4">
            <span className="text-xs text-slate-400 font-semibold block">Friends</span>
            <span className="text-lg font-mono font-bold text-white">
              {friends.length}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Challenge Alert Bar (if incoming challenges exist) */}
      {incomingChallenges.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <BellRing className="w-4 h-4 animate-bounce" />
              <span>Incoming Direct Challenge ({incomingChallenges.length})</span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-300">
              Action Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {incomingChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className="p-4 bg-slate-950/80 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-sm shrink-0">
                    {challenge.challengerDisplayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="text-sm font-bold text-white truncate">
                      {challenge.challengerDisplayName}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                      <span className="text-amber-400 font-bold">
                        {challenge.timeControl?.name || 'Match'}
                      </span>
                      <span>•</span>
                      <span>
                        {challenge.isRated ? 'Rated' : 'Casual'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleAcceptChallenge(challenge)}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept</span>
                  </button>
                  <button
                    onClick={() => handleDeclineChallenge(challenge.id)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-300 font-semibold text-xs transition-colors cursor-pointer border border-slate-700 flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Social Tabs Segmented Control */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/60 border border-slate-800 rounded-xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'friends'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>My Friends ({friends.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('challenges')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'challenges'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Swords className="w-4 h-4" />
          <span>Challenges</span>
          {incomingChallenges.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center">
              {incomingChallenges.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Requests</span>
          {incomingRequests.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">
              {incomingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'search'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Find Players</span>
        </button>
      </div>

      {/* TAB 1: FRIENDS LIST */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          {enrichedFriends.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No Friends Added Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Search for fellow players in the "Find Players" tab to add friends, chat, and challenge them to live games.
              </p>
              <button
                onClick={() => setActiveTab('search')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer border border-slate-700 inline-flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search Players</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {enrichedFriends.map((friend) => (
                <div
                  key={friend.userId}
                  className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      {friend.photoURL ? (
                        <img
                          src={friend.photoURL}
                          alt={friend.displayName}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-700 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-base shrink-0">
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
                        title={friend.status}
                      />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white truncate">
                          {friend.displayName}
                        </h4>
                        <span className="text-xs font-mono text-amber-400 font-semibold shrink-0">
                          {friend.rating || 1200} Elo
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 block">
                        {friend.status === 'online' ? (
                          <span className="text-emerald-400 font-medium">Online</span>
                        ) : friend.status === 'in-game' ? (
                          <span className="text-amber-400 font-medium">In Match</span>
                        ) : (
                          <span>Offline</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setSelectedChatFriend(friend)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer border border-slate-700"
                      title="Direct Message"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedChallengeFriend(friend)}
                      className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Challenge to Game"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Challenge</span>
                    </button>
                    <button
                      onClick={() => handleRemoveFriend(friend.userId)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Remove Friend"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DIRECT CHALLENGES */}
      {activeTab === 'challenges' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Incoming Challenges ({incomingChallenges.length})
            </h3>
            {incomingChallenges.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 bg-slate-900/40 border border-slate-800 rounded-2xl">
                No active incoming game challenges.
              </p>
            ) : (
              <div className="space-y-2">
                {incomingChallenges.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-300 font-bold flex items-center justify-center text-sm">
                        {ch.challengerDisplayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{ch.challengerDisplayName}</h4>
                          <span className="text-xs font-mono text-amber-400 font-bold">
                            {ch.timeControl?.name || 'Match'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {ch.isRated ? 'Rated Elo Match' : 'Casual Friendly Match'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcceptChallenge(ch)}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept & Play</span>
                      </button>
                      <button
                        onClick={() => handleDeclineChallenge(ch.id)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer border border-slate-700"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {outgoingChallenges.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Outgoing Pending Challenges ({outgoingChallenges.length})
              </h3>
              <div className="space-y-2">
                {outgoingChallenges.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-300"
                  >
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      <span>
                        Waiting for opponent to accept <strong>{ch.timeControl?.name || 'Match'}</strong>...
                      </span>
                    </div>
                    <button
                      onClick={() => handleCancelOutgoingChallenge(ch.id)}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-300 font-semibold text-xs transition-colors cursor-pointer border border-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FRIEND REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Incoming Requests ({incomingRequests.length})
            </h3>
            {incomingRequests.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 bg-slate-900/40 border border-slate-800 rounded-2xl">
                No pending incoming friend requests.
              </p>
            ) : (
              <div className="space-y-2">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-300 font-bold flex items-center justify-center text-sm">
                        {req.fromDisplayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{req.fromDisplayName}</h4>
                        <span className="text-xs text-slate-400">
                          sent you a friend request
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcceptRequest(req)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(req.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer border border-slate-700"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {outgoingRequests.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Outgoing Requests ({outgoingRequests.length})
              </h3>
              <div className="space-y-2">
                {outgoingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400"
                  >
                    <span>Request pending with user {req.toUserId.substring(0, 10)}...</span>
                    <button
                      onClick={() => handleDeclineRequest(req.id)}
                      className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FIND PLAYERS */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by player display name or username..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {isSearching && (
            <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span className="text-xs">Searching community database...</span>
            </div>
          )}

          {!isSearching && searchQuery && searchResults.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs">
              No players found matching "{searchQuery}".
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {searchResults.map((player) => {
              const isAlreadyFriend = friends.some((f) => f.userId === player.userId);
              const isRequestSent = sentRequestMap[player.userId];

              return (
                <div
                  key={player.userId}
                  className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-300 font-bold flex items-center justify-center text-sm">
                      {player.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{player.displayName}</h4>
                        <span className="text-xs font-mono text-amber-400 font-semibold">
                          {player.rating || 1200} Elo
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">Community Player</span>
                    </div>
                  </div>

                  <div>
                    {isAlreadyFriend ? (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Friend</span>
                      </span>
                    ) : isRequestSent ? (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-700">
                        Request Sent
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendFriendRequest(player)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Friend</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Direct 1-on-1 Chat Modal */}
      {selectedChatFriend && (
        <DirectChatModal
          friend={selectedChatFriend}
          isOpen={!!selectedChatFriend}
          onClose={() => setSelectedChatFriend(null)}
          onChallengeFriend={(friend) => setSelectedChallengeFriend(friend)}
        />
      )}

      {/* Challenge Friend Modal */}
      {selectedChallengeFriend && (
        <ChallengeFriendModal
          friend={selectedChallengeFriend}
          isOpen={!!selectedChallengeFriend}
          onClose={() => setSelectedChallengeFriend(null)}
          onGameAccepted={onStartDirectMatch}
        />
      )}
    </div>
  );
};
