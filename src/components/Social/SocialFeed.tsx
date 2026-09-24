import React, { useState } from 'react';
import { FeedPost } from '../../types/chess';
import { Heart, MessageSquare, Share2, Sparkles, Trophy, Play, Check } from 'lucide-react';
import { Chess } from 'chess.js';

interface SocialFeedProps {
  posts: FeedPost[];
  onLoadGameInAnalysis: (pgn: string) => void;
}

export const SocialFeed: React.FC<SocialFeedProps> = ({ posts: initialPosts, onLoadGameInAnalysis }) => {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string>('all');

  const handleLike = (id: string) => {
    setLikedPosts(prev => ({ ...prev, [id]: !prev[id] }));
    setPosts(prev =>
      prev.map(p => {
        if (p.id === id) {
          const wasLiked = !!likedPosts[id];
          return { ...p, likes: wasLiked ? p.likes - 1 : p.likes + 1 };
        }
        return p;
      })
    );
  };

  const handleShare = (post: FeedPost) => {
    navigator.clipboard.writeText(`Check out this Chess Brilliancy: "${post.title}" - ${post.highlightMove}`);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPosts = filterTag === 'all'
    ? posts
    : posts.filter(p => p.tags.map(t => t.toLowerCase()).includes(filterTag.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Feed Header & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>Grandmaster Feed & Replays</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Top tactical brilliancies, tournament match replays, and swindles shared by the community
          </p>
        </div>

        {/* Filter tags */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          {['all', 'brilliancy', 'endgame', 'bullet'].map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${
                filterTag === tag
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Feed Stream */}
      <div className="space-y-4">
        {filteredPosts.map((post) => {
          const isLiked = !!likedPosts[post.id];

          return (
            <div
              key={post.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition-colors"
            >
              {/* Author & Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shadow-inner">
                    {post.author.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      {post.author.title && (
                        <span className="px-1 py-0.2 text-[10px] font-black bg-amber-500 text-slate-950 rounded font-mono">
                          {post.author.title}
                        </span>
                      )}
                      <span className="font-semibold text-sm text-slate-100">{post.author.name}</span>
                      <span className="text-xs font-mono text-slate-400">({post.author.elo})</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block">{post.timestamp}</span>
                  </div>
                </div>

                <span className="px-2.5 py-1 text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg">
                  {post.highlightMove}
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-base font-bold text-slate-100">{post.title}</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{post.description}</p>
              </div>

              {/* Tags & Result Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    Result: {post.result}
                  </span>
                  {post.tags.map(t => (
                    <span key={t} className="text-[11px] text-amber-400/90 bg-amber-950/40 px-2 py-0.5 rounded">
                      #{t}
                    </span>
                  ))}
                </div>

                {/* Direct Action: Analyze Replay */}
                <button
                  onClick={() => onLoadGameInAnalysis(post.pgn)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Interactive Replay</span>
                </button>
              </div>

              {/* Like / Comment / Share Bar */}
              <div className="flex items-center gap-6 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1.5 hover:text-rose-400 transition-colors cursor-pointer ${
                    isLiked ? 'text-rose-400 font-bold' : ''
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  <span className="font-mono">{post.likes}</span>
                </button>

                <div className="flex items-center gap-1.5 text-slate-400">
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-mono">{post.commentsCount}</span>
                </div>

                <button
                  onClick={() => handleShare(post)}
                  className="flex items-center gap-1.5 hover:text-white transition-colors ml-auto cursor-pointer"
                >
                  {copiedId === post.id ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Link Copied</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
