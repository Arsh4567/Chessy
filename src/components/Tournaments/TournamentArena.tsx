import React, { useState } from 'react';
import { Tournament } from '../../types/chess';
import { Trophy, Users, Timer, Sparkles, Check, ChevronRight, ShieldAlert, Award } from 'lucide-react';

interface TournamentArenaProps {
  tournaments: Tournament[];
  onJoinTournament: (tournament: Tournament) => void;
}

export const TournamentArena: React.FC<TournamentArenaProps> = ({
  tournaments: initialTournaments,
  onJoinTournament,
}) => {
  const [tournaments, setTournaments] = useState<Tournament[]>(initialTournaments);
  const [selectedTournament, setSelectedTournament] = useState<Tournament>(initialTournaments[0]);
  const [joinedMap, setJoinedMap] = useState<Record<string, boolean>>({ 'tour-1': true });

  const handleToggleJoin = (tour: Tournament) => {
    const isJoined = !!joinedMap[tour.id];
    setJoinedMap(prev => ({ ...prev, [tour.id]: !isJoined }));
    setTournaments(prev =>
      prev.map(t => {
        if (t.id === tour.id) {
          return {
            ...t,
            participantsCount: isJoined ? t.participantsCount - 1 : t.participantsCount + 1
          };
        }
        return t;
      })
    );
    if (!isJoined) {
      onJoinTournament(tour);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl shadow-inner">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-100">
              Club Tournaments & Championship Arenas
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Compete in high-stakes Swiss & Blitz Arenas, earn rating points, and claim the Grandmaster Trophy
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-slate-300 font-semibold">Total Prize Pool:</span>
          <span className="text-xs font-mono font-bold text-amber-400">5,500 Arena Points</span>
        </div>
      </div>

      {/* Main Tournament Split: Tournament List & Active Standings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Tournament Cards */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Available Tournaments
          </h2>

          {tournaments.map((tour) => {
            const isSelected = selectedTournament.id === tour.id;
            const isJoined = !!joinedMap[tour.id];

            return (
              <div
                key={tour.id}
                onClick={() => setSelectedTournament(tour)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                  isSelected
                    ? 'bg-slate-900 border-amber-500/80 shadow-lg shadow-amber-950/20'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                          tour.status === 'active'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40 animate-pulse'
                            : tour.status === 'upcoming'
                            ? 'bg-sky-950 text-sky-400 border border-sky-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {tour.status}
                      </span>
                      <span className="text-xs font-mono text-slate-400 font-semibold">
                        {tour.type}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-100 mt-1">
                      {tour.title}
                    </h3>
                  </div>

                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 px-2 py-1 rounded border border-amber-500/30">
                    {tour.timeControl}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{tour.participantsCount} / {tour.maxParticipants}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5" />
                    <span>{tour.startTime}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-amber-300 font-medium">
                    🏆 {tour.prizePool}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleJoin(tour);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      isJoined
                        ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    }`}
                  >
                    {isJoined ? 'Registered ✓' : 'Register'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Tournament Leaderboard Standings */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-display text-slate-100">
                  {selectedTournament.title}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 font-mono text-amber-400 font-bold">
                  {selectedTournament.timeControl}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Duration: {selectedTournament.durationMinutes} mins · Top 3 win Arena badges
              </p>
            </div>

            <button
              onClick={() => handleToggleJoin(selectedTournament)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                joinedMap[selectedTournament.id]
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
              }`}
            >
              {joinedMap[selectedTournament.id] ? 'You Are in Tournament ✓' : 'Join Arena'}
            </button>
          </div>

          {/* Standings Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Player</th>
                  <th className="py-2.5 px-3 text-center">Elo</th>
                  <th className="py-2.5 px-3 text-center">Points</th>
                  <th className="py-2.5 px-3 text-center">Games</th>
                  <th className="py-2.5 px-3 text-right">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {selectedTournament.leaderboard.map((row) => (
                  <tr
                    key={row.rank}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      row.username === 'GrandmasterPlayer' ? 'bg-amber-500/10 font-bold' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <span
                        className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                          row.rank === 1
                            ? 'bg-amber-400 text-slate-950'
                            : row.rank === 2
                            ? 'bg-slate-300 text-slate-950'
                            : row.rank === 3
                            ? 'bg-amber-700 text-slate-100'
                            : 'text-slate-400'
                        }`}
                      >
                        {row.rank}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{row.avatar}</span>
                        <span className="font-semibold text-slate-100">{row.username}</span>
                        {row.username === 'GrandmasterPlayer' && (
                          <span className="text-[10px] text-amber-400 font-mono px-1 bg-amber-950 rounded">YOU</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400">{row.elo}</td>
                    <td className="py-3 px-3 text-center font-bold text-amber-400 text-sm">
                      {row.points}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-300">{row.gamesPlayed}</td>
                    <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                      {row.performance}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
