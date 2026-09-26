import React from 'react';
import { Chess } from 'chess.js';
import { GameMode, PieceType, AnalyzedMove } from '../../types/chess';
import { UserPreferences } from '../../utils/storage';
import { StockfishEvaluation } from '../../utils/stockfishWorker';
import { LichessData } from '../../utils/lichessExplorer';
import { PlayerCard } from './PlayerCard';
import { GameControls } from './GameControls';
import { ChessBoard } from '../ChessBoard/ChessBoard';
import { EvalBar } from '../ChessBoard/EvalBar';
import { MoveHistory } from '../ChessBoard/MoveHistory';
import { LichessMasters } from '../Analysis/LichessMasters';

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
  currentEval: number;
  stockfishEval: StockfishEvaluation;
  isEvaluating: boolean;
  inActiveMatch: boolean;
  gameMode: GameMode;
  isCurrentTurnHuman: boolean;
  lastMove: { from: string; to: string } | null;
  bestMoveHint: { from: string; to: string } | null;
  preferences: UserPreferences;
  evaluationDepth: number;
  movesHistory: AnalyzedMove[];
  currentMoveIdx: number;
  openingName?: string;
  lichessData: LichessData | null;
  onExecuteMove: (move: { from: string; to: string; promotion?: string }) => boolean;
  onResign: () => void;
  onOfferDraw: () => void;
  onTakeback: () => void;
  onFlipBoard: () => void;
  onRequestHint: () => void;
  onToggleMute: () => void;
  onChangeTheme: (theme: any) => void;
  onDepthChange: (depth: number) => void;
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
  currentEval,
  stockfishEval,
  isEvaluating,
  inActiveMatch,
  gameMode,
  isCurrentTurnHuman,
  lastMove,
  bestMoveHint,
  preferences,
  evaluationDepth,
  movesHistory,
  currentMoveIdx,
  openingName,
  lichessData,
  onExecuteMove,
  onResign,
  onOfferDraw,
  onTakeback,
  onFlipBoard,
  onRequestHint,
  onToggleMute,
  onChangeTheme,
  onDepthChange,
  onSelectHistoryMove,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-5 items-start py-1">
      {/* Board & Clocks */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center gap-2">
        {/* Top Player (Opponent) */}
        <div className="w-full max-w-[460px] lg:max-w-[480px]">
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

        {/* Chess Board + Eval Bar */}
        <div className="flex items-stretch gap-2 sm:gap-2.5 w-full max-w-[460px] lg:max-w-[480px] justify-center">
          <div className="shrink-0 flex items-stretch">
            <EvalBar
              evalScore={currentEval}
              displayEval={stockfishEval.displayEval}
              isFlipped={isFlipped}
              isEvaluating={isEvaluating}
            />
          </div>

          <div className="flex-1 min-w-0">
            <ChessBoard
              chess={chess}
              isFlipped={isFlipped}
              onMove={onExecuteMove}
              disabled={
                !inActiveMatch ||
                (gameMode === 'bot' && !isCurrentTurnHuman) ||
                isBotThinking
              }
              lastMove={lastMove}
              bestMoveHint={bestMoveHint}
              boardTheme={preferences.boardTheme}
              showCoordinates={preferences.showCoordinates}
              showLegalMoves={preferences.showLegalMoves}
              autoQueen={preferences.autoQueen}
            />
          </div>
        </div>

        {/* Bottom Player (You) */}
        <div className="w-full max-w-[460px] lg:max-w-[480px]">
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

        {/* Board Controls */}
        <div className="w-full max-w-[460px] lg:max-w-[480px]">
          <GameControls
            mode={gameMode}
            onResign={onResign}
            onOfferDraw={onOfferDraw}
            onTakeback={onTakeback}
            onFlipBoard={onFlipBoard}
            onRequestHint={onRequestHint}
            isMuted={!preferences.soundEnabled}
            onToggleMute={onToggleMute}
            currentTheme={preferences.boardTheme}
            onChangeTheme={onChangeTheme}
            evaluationDepth={evaluationDepth}
            onDepthChange={onDepthChange}
            disabled={!inActiveMatch}
          />
        </div>
      </div>

      {/* Move History & Masters Book */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-2.5">
        <div className="h-[220px] sm:h-[250px]">
          <MoveHistory
            moves={movesHistory}
            currentMoveIndex={currentMoveIdx}
            onSelectMove={onSelectHistoryMove}
            openingName={openingName}
          />
        </div>

        {/* Lichess Masters Opening Book & Engine Complement */}
        <LichessMasters
          lichessData={lichessData}
          stockfishEval={stockfishEval}
          currentFen={chess.fen()}
          onSelectMove={(san) => {
            if (inActiveMatch && isCurrentTurnHuman) {
              try {
                const verboseMoves = chess.moves({ verbose: true });
                const match = verboseMoves.find((m) => m.san === san);
                if (match) {
                  onExecuteMove({
                    from: match.from,
                    to: match.to,
                    promotion: match.promotion,
                  });
                }
              } catch (err) {
                console.warn('Error executing Masters move:', err);
              }
            }
          }}
        />
      </div>
    </div>
  );
};
