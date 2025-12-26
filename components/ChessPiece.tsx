import React from 'react';
import { PieceSymbol, Color } from 'chess.js';
import { PIECE_IMAGES } from '../constants';

interface ChessPieceProps {
  type: PieceSymbol;
  color: Color;
  className?: string;
}

const ChessPiece: React.FC<ChessPieceProps> = ({ type, color, className = '' }) => {
  return (
    <img 
      src={PIECE_IMAGES[color][type]}
      alt={`${color} ${type}`}
      className={`w-full h-full select-none pointer-events-none drop-shadow-sm ${className}`}
      draggable={false}
    />
  );
};

export default ChessPiece;