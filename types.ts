import { Square, Move, PieceSymbol, Color } from 'chess.js';

export type BoardOrientation = 'white' | 'black';

export interface VideoMetadata {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  isFavorite: boolean;
}

// Database Entities
export interface Repertoire {
  id: string;
  user_id: string;
  name: string;
  color: 'white' | 'black';
  created_at: string;
  video_gallery?: VideoMetadata[];
}

export interface DbMove {
  id: string;
  repertoire_id: string;
  fen: string;
  san: string;
  uci: string;
  parent_id: string | null;
  comment: string | null;
  move_number: number;
  color: string;
  created_at?: string;
  source?: string;
  metadata?: GameMetadata;
}

// Analytics & Training
export interface UserTrainingStats {
  user_id: string;
  total_points: number;
  total_correct: number;
  total_incorrect: number;
  current_level: 'Novice' | 'Basic Domain' | 'Intermediate' | 'Expert' | 'Master';
}

export interface TrainingSessionStats {
    correct: number;
    errors: number;
    movesLeft: number;
}

export interface TrainingLog {
  id?: string;
  user_id: string;
  repertoire_id: string;
  fen: string;
  expected_move: string;
  played_move: string | null;
  is_correct: boolean;
  points_delta: number;
  created_at?: string;
}

export interface GameMetadata {
  white: string;
  black: string;
  result: string;
  date: string;
  pgn: string;
  id?: string;
}

export interface ImportedGame {
  id: string;
  repertoire_id: string;
  white_name: string;
  black_name: string;
  white_rating?: number;
  black_rating?: number;
  result: string;
  date: string;
  pgn: string;
  associated_fen?: string;
  movesArray?: string[]; 
}

// Tree Structure for UI
export interface MoveNode {
  id: string;
  fen: string; 
  move: Move; 
  san: string; 
  comment: string; 
  children: MoveNode[]; 
  parent: MoveNode | null; 
  moveNumber: number; 
  color: Color; 
  source?: string; 
  metadata?: GameMetadata;
  isNew?: boolean; 
}

export interface GameState {
  fen: string;
  turn: Color;
  inCheck: boolean;
  inCheckmate: boolean;
  inDraw: boolean;
  isGameOver: boolean;
  hasHistory: boolean;
}

export interface PieceProps {
  type: PieceSymbol;
  color: Color;
}

export interface HighlightedSquare {
  square: Square;
  isCapture: boolean;
}

export interface EngineAnalysis {
  text?: string;
  eval?: number;
  move?: string;
  depth?: number;
  winChance?: number;
  mate?: number | null;
  continuationArr?: string[];
  san?: string;
  from?: string;
  to?: string;
  multipv?: number;
}

// --- Lichess Explorer Types ---
export interface ExplorerMove {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
  averageRating?: number;
}

export interface ExplorerData {
  white: number;
  draws: number;
  black: number;
  moves: ExplorerMove[];
  averageRating?: number;
  topGames?: {
    id: string;
    white: { name: string; rating: number };
    black: { name: string; rating: number };
    year: number;
    winner: string;
  }[];
}

export type ExplorerSource = 'masters' | 'lichess';

export interface ExplorerSettings {
    source: ExplorerSource;
    speeds: string[];
    ratings: number[];
}

// --- Strategy & Structure Types ---
export interface PawnStructureAnalysis {
    white: {
        isolated: string[];
        doubled: string[];
        passed: string[];
        chains: string[][];
        weaknesses: string[];
    };
    black: {
        isolated: string[];
        doubled: string[];
        passed: string[];
        chains: string[][];
        weaknesses: string[];
    };
    openFiles: string[];
    semiOpenFiles: { white: string[], black: string[] };
    centerControl: 'Open' | 'Closed' | 'Fluid' | 'Locked';
    endgameAdvice: string[];
}

// --- Opening Library Types ---
export type OpeningStyle = 'Aggressive' | 'Positional' | 'Solid' | 'Tactical' | 'Universal';
export type OpeningTheoryLevel = 'High Theory' | 'Medium Theory' | 'Low Theory';
export type OpeningStructure = 'Open' | 'Semi-Open' | 'Closed';

export interface OpeningCharacteristics {
    style: OpeningStyle;
    theory: OpeningTheoryLevel;
    structure: OpeningStructure;
    isGambit: boolean;
}

export type RepertoireRole = 'Main' | 'Secondary' | 'Surprise' | 'Avoid';

// --- Opponent Analysis Types ---
export interface OpponentStats {
  username: string;
  totalGames: number;
  winRate: number;
  topOpenings: {
      name: string;
      count: number;
      winRate: number;
  }[];
  playStyle: string;
}