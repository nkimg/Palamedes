import React, { useMemo } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { BoardOrientation, VisualMode } from '../types';
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
  bestMove: { from: string; to: string } | null; 
  winChance: number | null; 
  visualMode: VisualMode;
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
  visualMode = 'default'
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

  // --- ANALYSIS HELPERS ---

  // 1. Space Control (Heatmap)
  const controlMap = useMemo(() => {
    if (visualMode !== 'control') return null;

    const map: Record<string, number> = {}; // >0 White, <0 Black
    const temp = new Chess(game.fen());
    
    // Heuristic: Iterate all pieces and calculate attack scope manually 
    // (Since chess.js move generation is complex to hacking for "attacks")
    // Simple approach: Generate all legal moves for current side, then flip turn and do same.
    
    // White Moves
    const currentTurn = temp.turn();
    if (currentTurn === 'b') {
        // Force it to be white's turn to get white moves (hacky but works for analysis)
        // Note: this might remove en passant if we aren't careful, but fine for heatmaps
        try {
            const tokens = temp.fen().split(' ');
            tokens[1] = 'w';
            tokens[3] = '-'; // Remove enpassant to prevent error on invalid position
            temp.load(tokens.join(' '));
        } catch(e) {}
    }
    
    const whiteMoves = temp.moves({ verbose: true });
    whiteMoves.forEach(m => {
        // Weighted control: Center squares worth more visual weight? No, just raw count.
        map[m.to] = (map[m.to] || 0) + 1;
    });

    // Black Moves
    try {
        const tokens = temp.fen().split(' ');
        tokens[1] = 'b';
        tokens[3] = '-';
        temp.load(tokens.join(' '));
    } catch(e) {}

    const blackMoves = temp.moves({ verbose: true });
    blackMoves.forEach(m => {
        map[m.to] = (map[m.to] || 0) - 1;
    });

    return map;
  }, [game.fen(), visualMode]);

  // 2. Open Files
  const fileStatus = useMemo(() => {
    if (visualMode !== 'files') return null;
    
    const status: Record<string, 'open' | 'semi-white' | 'semi-black'> = {};
    const board = game.board();

    FILES.forEach(file => {
        let wPawn = 0;
        let bPawn = 0;
        
        // Scan file
        for(let r=0; r<8; r++) {
            const piece = board[r][FILES.indexOf(file)];
            if(piece?.type === 'p') {
                if(piece.color === 'w') wPawn++;
                else bPawn++;
            }
        }

        if (wPawn === 0 && bPawn === 0) status[file] = 'open';
        else if (wPawn === 0) status[file] = 'semi-white'; // Good for white rooks
        else if (bPawn === 0) status[file] = 'semi-black'; // Good for black rooks
    });
    return status;
  }, [game.fen(), visualMode]);


  // Function to determine square overlay color based on mode
  const getVisualOverlay = (square: Square): string | null => {
      if (visualMode === 'control' && controlMap) {
          const val = controlMap[square];
          if (!val) return null;
          // White Control = Indigo/Blue, Black Control = Red/Orange
          if (val > 0) return `rgba(59, 130, 246, ${Math.min(0.6, val * 0.2)})`; // Blue
          if (val < 0) return `rgba(239, 68, 68, ${Math.min(0.6, Math.abs(val) * 0.2)})`; // Red
          return `rgba(147, 51, 234, 0.3)`; // Contested (0 sum but attacked by both would be hard to track with this simple summation, so 0 is ignored usually)
      }

      if (visualMode === 'files' && fileStatus) {
          const file = square.charAt(0);
          const stat = fileStatus[file];
          if (stat === 'open') return 'rgba(16, 185, 129, 0.2)'; // Green for fully open
          if (stat === 'semi-white') return 'rgba(59, 130, 246, 0.15)'; // Blue tint
          if (stat === 'semi-black') return 'rgba(239, 68, 68, 0.15)'; // Red tint
      }
      
      return null;
  };

  // Function to determine SVG center coordinates
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
            <div 
              className="w-full bg-[#404040] transition-all duration-700 ease-in-out"
              style={{ height: `${100 - winChance}%` }}
            />
            <div 
              className="w-full bg-white transition-all duration-700 ease-in-out"
              style={{ height: `${winChance}%` }}
            />
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
        <div className={`grid grid-cols-8 grid-rows-8 w-full h-full rounded-sm shadow-2xl overflow-hidden bg-[#b58863] relative ${visualMode !== 'default' ? 'grayscale-[30%]' : ''}`}>
          
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

            // --- VISIBILITY LOGIC ---
            let shouldRenderPiece = !!piece;
            let isGhosted = false;

            if (piece) {
                if (visualMode === 'pawn-structure') {
                    // Show only Pawns. Kings are ghosted. Others hidden.
                    if (piece.type === 'k') isGhosted = true;
                    else if (piece.type !== 'p') shouldRenderPiece = false;
                }
                else if (visualMode === 'no-minors') {
                    // Hide Knights (n) and Bishops (b)
                    if (piece.type === 'n' || piece.type === 'b') shouldRenderPiece = false;
                }
                else if (visualMode === 'no-bishops') {
                    // Hide Bishops (b)
                    if (piece.type === 'b') shouldRenderPiece = false;
                }
            }

            // Visual Overlay (Control / Files)
            const overlayColor = getVisualOverlay(square);

            return (
              <div
                key={square}
                onClick={() => onSquareClick(square)}
                className={`relative flex items-center justify-center cursor-pointer ${bgClass}`}
              >
                {/* Visual Analysis Overlay */}
                {overlayColor && (
                    <div className="absolute inset-0 z-0 pointer-events-none transition-colors duration-300" style={{ backgroundColor: overlayColor }} />
                )}

                {/* Coordinates */}
                {fileIndex === 0 && (
                  <span className={`absolute top-0.5 left-1 text-[10px] font-bold z-10 ${isLight ? 'text-[#b58863]' : 'text-[#f0d9b5]'} ${isSelected || isLastMove ? 'text-[#7a7322]' : ''}`}>
                    {square.charAt(1)}
                  </span>
                )}
                {rankIndex === 7 && (
                  <span className={`absolute bottom-0 right-1 text-[10px] font-bold z-10 ${isLight ? 'text-[#b58863]' : 'text-[#f0d9b5]'} ${isSelected || isLastMove ? 'text-[#7a7322]' : ''}`}>
                    {square.charAt(0)}
                  </span>
                )}

                {/* Move Indicators */}
                {targetMove && !piece && (
                  <div className="absolute w-3 h-3 md:w-4 md:h-4 bg-[rgba(20,85,30,0.5)] rounded-full pointer-events-none z-20" />
                )}
                {targetMove && piece && (
                  <div className="absolute w-full h-full bg-[rgba(20,85,0,0.5)] rounded-full scale-[1] pointer-events-none z-20" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 10% 10%, 10% 90%, 90% 90%, 90% 10%, 10% 10%)'}} />
                )}
                
                {/* Piece */}
                {shouldRenderPiece && (
                  <div className={`w-[100%] h-[100%] z-10 p-[1px] ${isGhosted ? 'opacity-20 grayscale' : ''} transition-opacity duration-300`}>
                    <ChessPiece type={piece!.type} color={piece!.color} />
                  </div>
                )}
              </div>
            );
          })}

          {/* SVG OVERLAY FOR BEST MOVE ARROW */}
          {arrowCoords && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible">
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