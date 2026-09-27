import React from 'react';
import { Chess } from 'chess.js';
import { GameMode, PieceType, AnalyzedMove } from '../../types/chess';
import { UserPreferences } from '../../utils/storage';
import { PlayerCard } from './PlayerCard';
import { GameControls } from './GameControls';
import { ChessBoard } from '../ChessBoard/ChessBoard';
import { MoveHistory } from '../ChessBoard/MoveHistory';
import { Zap, Swords, Shield, Clock } from 'lucide-react';

interface ActiveMatchViewProps {
  chess: Chess;
  isFlipped: boolean;
  opponent: {
    name: string;
    elo: number;
    avatar: string;
    isBot: boolean;
  };
  whiteTime: number;
  blackTime: number;
  capturedWhite: PieceType[];
  capturedBlack: PieceType[];
  material: {
    whiteLead: number;
    blackLead: number;
  };
  isBotThinking: boolean;
  inActiveMatch: boolean;
  gameMode: GameMode;
  isCurrentTurnHuman: boolean;
  lastMove: { from: string; to: string } | null;
  preferences: UserPreferences;
  movesHistory: AnalyzedMove[];
  currentMoveIdx: number;
  openingName?: string;
  onExecuteMove: (move: { from: string; to: string; promotion?: string }) => boolean;
  onResign: () => void;
  onOfferDraw: () => void;
  onTakeback: () => void;
  onFlipBoard: () => void;
  onToggleMute: () => void;
  onChangeTheme: (theme: any) => void;
  onSelectHistoryMove: (idx: number) => void;
}

export const ActiveMatchView: React.FC<ActiveMatchViewProps> = ({
  chess,
  isFlipped,
  opponent,
  whiteTime,
  blackTime,
  capturedWhite,
  capturedBlack,
  material,
  isBotThinking,
  inActiveMatch,
  gameMode,
  isCurrentTurnHuman,
  lastMove,
  preferences,
  movesHistory,
  currentMoveIdx,
  openingName,
  onExecuteMove,
  onResign,
  onOfferDraw,
  onTakeback,
  onFlipBoard,
  onToggleMute,
  onChangeTheme,
  onSelectHistoryMove,
}) => {
  const myColor = isFlipped ? 'b' : 'w';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start py-2 max-w-6xl mx-auto">
      {/* Main Chess Arena (Board & Clocks) */}
      <div className="lg:col-span-7 xl:col-span-7 flex flex-col items-center gap-2.5 w-full">
        {/* Top Player (Opponent) */}
        <div className="w-full max-w-[min(94vw,470px,68vh)]">
          <PlayerCard
            name={isFlipped ? 'You' : opponent.name}
            avatar={isFlipped ? '♟️' : opponent.avatar}
            elo={isFlipped ? 1500 : opponent.elo}
            color={isFlipped ? 'w' : 'b'}
            isTurn={chess.turn() === (isFlipped ? 'w' : 'b')}
            timeRemainingSeconds={isFlipped ? whiteTime : blackTime}
            capturedPieces={isFlipped ? capturedWhite : capturedBlack}
            materialAdvantage={isFlipped ? material.whiteLead : material.blackLead}
            isBot={isFlipped ? false : opponent.isBot}
            isThinking={!isFlipped && opponent.isBot && isBotThinking}
          />
        </div>

        {/* Responsive Chess Board with Built-in Instant Premove Support */}
        <div className="w-full flex justify-center">
          <ChessBoard
            chess={chess}
            isFlipped={isFlipped}
            playerColor={myColor}
            onMove={onExecuteMove}
            disabled={!inActiveMatch}
            allowPremove={true}
            lastMove={lastMove}
            boardTheme={preferences.boardTheme}
            showCoordinates={preferences.showCoordinates}
            showLegalMoves={preferences.showLegalMoves}
            autoQueen={preferences.autoQueen}
          />
        </div>

        {/* Bottom Player (You) */}
        <div className="w-full max-w-[min(94vw,470px,68vh)]">
          <PlayerCard
            name={isFlipped ? opponent.name : 'You'}
            avatar={isFlipped ? opponent.avatar : '♟️'}
            elo={isFlipped ? opponent.elo : 1500}
            color={isFlipped ? 'b' : 'w'}
            isTurn={chess.turn() === (isFlipped ? 'b' : 'w')}
            timeRemainingSeconds={isFlipped ? blackTime : whiteTime}
            capturedPieces={isFlipped ? capturedBlack : capturedWhite}
            materialAdvantage={isFlipped ? material.blackLead : material.whiteLead}
            isBot={isFlipped ? opponent.isBot : false}
            isThinking={isFlipped && opponent.isBot && isBotThinking}
          />
        </div>

        {/* Tactical Match Controls */}
        <div className="w-full max-w-[min(94vw,470px,68vh)]">
          <GameControls
            mode={gameMode}
            onResign={onResign}
            onOfferDraw={onOfferDraw}
            onTakeback={onTakeback}
            onFlipBoard={onFlipBoard}
            isMuted={!preferences.soundEnabled}
            onToggleMute={onToggleMute}
            currentTheme={preferences.boardTheme}
            onChangeTheme={onChangeTheme}
            disabled={!inActiveMatch}
          />
        </div>
      </div>

      {/* Match Console Sidebar (Move History, Game Status, Info) */}
      <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-3 w-full max-w-[min(94vw,470px,68vh)] lg:max-w-none mx-auto">
        {/* Match Header Badge */}
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Swords className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">
                {gameMode === 'bot' ? `Match vs ${opponent.name}` : (gameMode === 'online-match' || gameMode === 'online-room') ? 'Live Online Match' : 'Pass & Play'}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Active Game</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-amber-400 font-mono font-bold">
            <Zap className="w-3.5 h-3.5" />
            <span>Premove On</span>
          </div>
        </div>

        {/* Move History Sheet */}
        <div className="h-[280px] sm:h-[320px] lg:h-[380px] w-full">
          <MoveHistory
            moves={movesHistory}
            currentMoveIndex={currentMoveIdx}
            onSelectMove={onSelectHistoryMove}
            openingName={openingName}
          />
        </div>

        {/* Premove & Fair Play Notice Card */}
        <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-200 font-semibold">Lightning Premove:</span>
            <span className="ml-1 text-slate-400">
              Queue your next move anytime during opponent's turn. Right-click anywhere to cancel.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
