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
  video_gallery?: VideoMetadata[]; // New field for video library
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
  metadata?: GameMetadata; // New field for game info
  // SRS Fields
  next_review_at?: string;
  interval?: number;
  ease_factor?: number;
  repetitions?: number;
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
  associated_fen?: string; // New: Links the game to a specific position (FEN)
  // Computed on frontend for matching
  movesArray?: string[]; 
}

// Tree Structure for UI
export interface MoveNode {
  id: string; // UUID from DB
  fen: string; 
  move: Move; 
  san: string; 
  comment: string; 
  children: MoveNode[]; 
  parent: MoveNode | null; 
  moveNumber: number; 
  color: Color; 
  source?: string; 
  metadata?: GameMetadata; // New field
  // Helper to track if this node was just created locally and needs saving
  isNew?: boolean; 
  // SRS Data for Training
  srs?: {
    nextReview?: string;
    interval: number;
    ease: number;
    repetitions: number;
  }
}

// Training Session Types
export interface DrillSettings {
    mode: 'sequential' | 'random' | 'spaced_repetition';
    color: 'white' | 'black'; // Forces user to play this color
    loop: boolean; // Infinite loop or finish after line
}

export interface TrainingSequenceStep {
    fen: string;
    san: string; // The move that needs to be played (by user) or was played (by bot)
    isUserTurn: boolean;
    nodeId: string;
    isBranchPoint: boolean; // If true, warn user
}

export interface TrainingExercise {
    id: string;
    description: string; // UI Label (e.g. "Sicilian Najdorf: 5.a6")
    startFen: string;
    startNodeId: string;
    targetNodeId: string; // The "Due" node that triggered this exercise
    sequence: TrainingSequenceStep[]; // The full sequence (User -> Bot -> User...)
    completedSteps: number;
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
  averageRating?: number; // For Lichess DB
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
    speeds: string[]; // blitz, rapid, classical
    ratings: number[]; // 1600, 1800, 2000, 2200, 2500
}

// Training Specific Types
export type TrainingMode = 'recall' | 'sparring' | 'structure';

export interface UserStats {
    xp: number;
    level: number;
    streak: number;
}

// --- Preparation Types ---
export interface OpponentStats {
    username: string;
    totalGames: number;
    winRate: number;
    topOpenings: { name: string; count: number; winRate: number }[];
    playStyle: 'Aggressive' | 'Solid' | 'Positional' | 'Unknown';
}

export interface PreparationDossier {
    id: string;
    user_id: string;
    title: string;
    type: 'opponent' | 'opening';
    
    // Status Logic
    isArchived: boolean;
    readiness: 'Ready' | 'In Progress' | 'New';
    
    // Metadata
    lastUpdated: string;
    targetLinesCount: number;
    
    // Specific Fields
    opponentName?: string;
    openingName?: string;
    ecoCode?: string; // New: ECO Code (e.g., B90)
    pgn?: string;     // New: Full PGN content
}

// --- Preparation Dashboard Analysis Types ---
export interface StyleMetric {
    attribute: string;
    heroValue: number; // 0-100
    villainValue: number; // 0-100
    description: string;
}

export interface RecommendedLine {
    id: string;
    name: string;
    color: 'white' | 'black';
    winRate: number;
    confidence: 'High' | 'Medium' | 'Low';
    reason: string;
    moves: string[]; // key moves
}

export interface PrepInsight {
    type: 'strength' | 'weakness' | 'opportunity';
    title: string;
    description: string;
}

export interface PrepAnalysis {
    playstyleTags: string[];
    metrics: StyleMetric[];
    recommendations: RecommendedLine[];
    insights: PrepInsight[];
    estimatedRating: number;
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