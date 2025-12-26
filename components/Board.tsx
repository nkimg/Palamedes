import React, { useMemo } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { BoardOrientation } from '../types';
import ChessPiece from './ChessPiece';
import { FILES, RANKS } from '../constants';

interface BoardProps {
  game: Chess;
  orientation: BoardOrientation;
  selectedSquare: Square | null;
  validMoves: Move[];
  lastMove: { from: Square; to: Square } | null;
  onSquareClick: (square: Square) => void;
  inCheck: boolean;
  bestMove: { from: string; to: string } | null; // Para desenhar a seta
  winChance: number | null; // Para a barra de avaliação (0-100)
  pawnStructureMode?: boolean; // New prop for structure view
}

const Board: React.FC<BoardProps> = ({ 
  game, 
  orientation, 
  selectedSquare, 
  validMoves, 
  lastMove,
  onSquareClick,
  inCheck,
  bestMove,
  winChance,
  pawnStructureMode = false
}) => {
  // Generate the grid based on orientation
  const squares = useMemo(() => {
    const ranks = orientation === 'white' ? RANKS : [...RANKS].reverse();
    const files = orientation === 'white' ? FILES : [...FILES].reverse();
    
    const grid: Square[] = [];
    for (const rank of ranks) {
      for (const file of files) {
        grid.push(`${file}${rank}` as Square);
      }
    }
    return grid;
  }, [orientation]);

  // Função auxiliar para coordenadas SVG (0-100%)
  const getSquareCenter = (square: string) => {
    const file = square.charCodeAt(0) - 97; // a=0, h=7
    const rank = parseInt(square.charAt(1)) - 1; // 1=0, 8=7
    
    // Inverter se orientação for preta
    const x = orientation === 'white' ? file : 7 - file;
    const y = orientation === 'white' ? 7 - rank : rank;

    return {
      x: (x * 12.5) + 6.25, // Centro da casa em %
      y: (y * 12.5) + 6.25
    };
  };

  // Cálculos para a Seta
  const arrowCoords = useMemo(() => {
    if (!bestMove) return null;
    const start = getSquareCenter(bestMove.from);
    const end = getSquareCenter(bestMove.to);
    return { start, end };
  }, [bestMove, orientation]);

  const getTargetMove = (square: Square) => {
    return validMoves.find(m => m.to === square);
  };

  return (
    <div className="flex gap-4 items-stretch justify-center w-full">
      {/* EVALUATION BAR */}
      <div className="w-6 bg-slate-700 rounded-sm overflow-hidden flex flex-col relative border border-slate-600 shadow-xl flex-shrink-0">
        {winChance !== null ? (
          <>
            {/* Parte Preta (topo se w=0) */}
            <div 
              className="w-full bg-[#404040] transition-all duration-700 ease-in-out"
              style={{ height: `${100 - winChance}%` }}
            />
            {/* Parte Branca */}
            <div 
              className="w-full bg-white transition-all duration-700 ease-in-out"
              style={{ height: `${winChance}%` }}
            />
            {/* Indicador Numérico (simplificado) */}
            <div className={`absolute left-0 right-0 text-[10px] font-bold text-center ${winChance > 50 ? 'bottom-1 text-slate-800' : 'top-1 text-white'}`}>
              {winChance > 50 ? (winChance === 100 ? '1-0' : '') : (winChance === 0 ? '0-1' : '')}
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-slate-600 flex items-center justify-center">
             <span className="text-slate-500 text-xs">-</span>
          </div>
        )}
      </div>

      {/* BOARD CONTAINER */}
      <div className="relative select-none touch-none w-full max-w-[600px] aspect-square">
        {/* Aspect Ratio Container */}
        <div className={`grid grid-cols-8 grid-rows-8 w-full h-full rounded-sm shadow-2xl overflow-hidden bg-[#b58863] relative ${pawnStructureMode ? 'grayscale-[30%]' : ''}`}>
          
          {squares.map((square, index) => {
            const rankIndex = Math.floor(index / 8);
            const fileIndex = index % 8;
            const isLight = (rankIndex + fileIndex) % 2 === 0;
            
            const piece = game.get(square);
            const isSelected = selectedSquare === square;
            const targetMove = getTargetMove(square);
            const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
            const isKingInCheck = inCheck && piece?.type === 'k' && piece?.color === game.turn();
            
            let bgClass = isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]';
            
            if (isLastMove) bgClass = isLight ? 'bg-[#cdd26a]' : 'bg-[#aaa23a]'; 
            if (isSelected) bgClass = isLight ? 'bg-[#cdd26a]' : 'bg-[#aaa23a]'; 
            if (isKingInCheck) bgClass = 'bg-red-600 radial-gradient-red';

            // VISIBILITY LOGIC FOR PAWN MODE
            // Hide piece if pawnStructureMode is on AND piece is NOT a pawn
            // We optionally keep Kings as ghosted pieces for context
            const shouldRenderPiece = piece && (!pawnStructureMode || piece.type === 'p' || piece.type === 'k');
            const isGhosted = pawnStructureMode && piece && piece.type === 'k';

            return (
              <div
                key={square}
                onClick={() => onSquareClick(square)}
                className={`relative flex items-center justify-center cursor-pointer ${bgClass}`}
              >
                {/* Coordinates */}
                {fileIndex === 0 && (
                  <span className={`absolute top-0.5 left-1 text-[10px] font-bold ${isLight ? 'text-[#b58863]' : 'text-[#f0d9b5]'} ${isSelected || isLastMove ? 'text-[#7a7322]' : ''}`}>
                    {square.charAt(1)}
                  </span>
                )}
                {rankIndex === 7 && (
                  <span className={`absolute bottom-0 right-1 text-[10px] font-bold ${isLight ? 'text-[#b58863]' : 'text-[#f0d9b5]'} ${isSelected || isLastMove ? 'text-[#7a7322]' : ''}`}>
                    {square.charAt(0)}
                  </span>
                )}

                {/* Move Indicators */}
                {targetMove && !piece && (
                  <div className="absolute w-3 h-3 md:w-4 md:h-4 bg-[rgba(20,85,30,0.5)] rounded-full pointer-events-none" />
                )}
                {targetMove && piece && (
                  <div className="absolute w-full h-full bg-[rgba(20,85,0,0.5)] rounded-full scale-[1] pointer-events-none" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 10% 10%, 10% 90%, 90% 90%, 90% 10%, 10% 10%)'}} />
                )}
                
                {/* Piece */}
                {shouldRenderPiece && (
                  <div className={`w-[100%] h-[100%] z-10 p-[1px] ${isGhosted ? 'opacity-30' : ''}`}>
                    <ChessPiece type={piece.type} color={piece.color} />
                  </div>
                )}
              </div>
            );
          })}

          {/* SVG OVERLAY FOR BEST MOVE ARROW */}
          {arrowCoords && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="rgba(21, 128, 61, 0.8)" />
                </marker>
              </defs>
              <line 
                x1={`${arrowCoords.start.x}%`} 
                y1={`${arrowCoords.start.y}%`} 
                x2={`${arrowCoords.end.x}%`} 
                y2={`${arrowCoords.end.y}%`} 
                stroke="rgba(21, 128, 61, 0.8)" 
                strokeWidth="1.5%" 
                markerEnd="url(#arrowhead)"
                strokeLinecap="round"
                opacity="0.9"
              />
            </svg>
          )}

        </div>
      </div>
    </div>
  );
};

export default Board;