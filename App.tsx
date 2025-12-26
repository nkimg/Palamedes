import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Square, Move, Color } from 'chess.js';
import { GameState, BoardOrientation, MoveNode, EngineAnalysis, Repertoire, DbMove, ExplorerData, ImportedGame, GameMetadata, ExplorerSettings, PawnStructureAnalysis, UserTrainingStats, TrainingLog, TrainingSessionStats } from './types';
import Board from './components/Board';
import ControlPanel from './components/ControlPanel';
import TrainingPanel from './components/TrainingPanel';
import TrainingHub from './components/TrainingHub';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { supabase } from './supabaseClient';
import { ArrowLeft, MessageSquare, LayoutGrid, X, Play, Pause, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Repeat, Trash2 } from 'lucide-react';
import { fetchOpeningStats, fetchUserGames, fetchMasterGame } from './lichessClient';

// Utility to generate unique IDs 
const generateId = () => Math.random().toString(36).substr(2, 9);

// Stockfish URL (Client-side WASM/JS)
const STOCKFISH_URL = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.0/stockfish.js';

// Helper to reliably parse moves from a PGN string for local matching
const parsePgnMoves = (pgn: string): string[] => {
    // Remove comments, recursive variations, move numbers, results, and headers
    const clean = pgn
        .replace(/\{[^}]+\}/g, '') // Remove comments { ... }
        .replace(/\([^)]+\)/g, '') // Remove variations ( ... )
        .replace(/\$\d+/g, '')     // Remove NAGs $1, $2
        .replace(/\d+\.+/g, '')    // Remove move numbers 1. or 1...
        .replace(/\[.*?\]/g, '')   // Remove headers if any remain
        .replace(/\s+/g, ' ')      // Normalize whitespace
        .trim();
        
    return clean.split(' ').filter(m => {
        // Filter out empty strings and game results
        return m.length > 1 && !['1-0', '0-1', '1/2-1/2', '*'].includes(m);
    });
};

// Helper to extract custom anchor FEN from PGN tags
const extractRepertoireFen = (pgn: string): string | undefined => {
    const match = pgn.match(/\[RepertoireFen "(.*?)"\]/);
    return match ? match[1] : undefined;
};

// Helper to inject anchor FEN into PGN
const injectRepertoireFen = (pgn: string, fen: string): string => {
    // Avoid duplicates
    if (pgn.includes('[RepertoireFen')) return pgn;
    // Prepend to the start or after first bracket? Just prepend is safest for simple parsing
    return `[RepertoireFen "${fen}"]\n${pgn}`;
};

// --- GAME VIEWER MODAL ---
const GameViewerModal: React.FC<{ metadata: GameMetadata; onClose: () => void }> = ({ metadata, onClose }) => {
  const [game, setGame] = useState(new Chess());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [history, setHistory] = useState<Move[]>([]);
  const [orientation, setOrientation] = useState<'white'|'black'>('white');
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const temp = new Chess();
      temp.loadPgn(metadata.pgn);
      setHistory(temp.history({ verbose: true }) as Move[]);
      setGame(new Chess());
    } catch(e) {
      console.error("Failed to load PGN in viewer", e);
    }
  }, [metadata]);

  useEffect(() => {
    if (isPlaying) {
      playTimeoutRef.current = setTimeout(() => {
        if (currentMoveIndex < history.length - 1) {
          goToMove(currentMoveIndex + 1);
        } else {
          setIsPlaying(false);
        }
      }, 800);
    }
    return () => {
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    }
  }, [isPlaying, currentMoveIndex, history]);

  const goToMove = (index: number) => {
    const newGame = new Chess();
    for(let i = 0; i <= index; i++) {
      newGame.move(history[i]);
    }
    setGame(newGame);
    setCurrentMoveIndex(index);
  };

  const currentMove = currentMoveIndex >= 0 ? history[currentMoveIndex] : null;

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/95 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
       <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-5xl w-full flex flex-col md:flex-row overflow-hidden h-[85vh]">
          
          {/* Mobile Header */}
          <div className="md:hidden p-3 border-b border-slate-700 flex justify-between items-center bg-slate-800">
             <span className="font-bold text-white text-sm">Game Viewer</span>
             <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
          </div>

          {/* Left: Board */}
          <div className="p-4 flex-1 bg-slate-950/50 flex justify-center items-center relative">
             <div className="w-full max-w-[500px] aspect-square">
               <Board 
                 game={game} 
                 orientation={orientation} 
                 selectedSquare={null} 
                 validMoves={[]} 
                 lastMove={currentMove ? { from: currentMove.from, to: currentMove.to } : null} 
                 onSquareClick={() => {}} 
                 inCheck={game.inCheck()} 
                 bestMove={null} 
                 winChance={null}
               />
             </div>
          </div>

          {/* Right: Info & Controls */}
          <div className="w-full md:w-[400px] bg-slate-900 flex flex-col border-l border-slate-800">
             <div className="p-5 border-b border-slate-800 flex justify-between items-start bg-slate-800/50">
                <div className="space-y-1">
                   <div className="flex items-center gap-2">
                       <span className="w-3 h-3 rounded-full bg-slate-200 border border-slate-400"></span>
                       <h3 className="text-lg font-bold text-white">{metadata.white}</h3>
                   </div>
                   <div className="flex items-center gap-2">
                       <span className="w-3 h-3 rounded-full bg-slate-900 border border-slate-600"></span>
                       <h3 className="text-lg font-bold text-slate-300">{metadata.black}</h3>
                   </div>
                   <div className="flex gap-3 mt-3 text-xs text-slate-400 font-mono items-center">
                      <span className={`px-2 py-0.5 rounded font-bold ${metadata.result === '1-0' ? 'bg-green-900 text-green-400' : (metadata.result === '0-1' ? 'bg-red-900 text-red-400' : 'bg-slate-700 text-slate-300')}`}>
                        {metadata.result}
                      </span>
                      <span>{metadata.date}</span>
                   </div>
                </div>
                <div className="hidden md:block">
                  <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>
             </div>

             {/* Move List */}
             <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-slate-400 bg-slate-950/30 inner-shadow">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 content-start">
                   {history.map((m, i) => {
                      if (i % 2 === 0) {
                         return (
                           <React.Fragment key={i}>
                             <div className="flex items-center">
                                <span className="text-slate-600 w-8 text-right mr-3 select-none">{Math.floor(i/2) + 1}.</span>
                                <span 
                                  className={`cursor-pointer hover:text-white px-2 py-0.5 rounded w-full ${i === currentMoveIndex ? 'bg-amber-600/20 text-amber-500 font-bold' : ''}`}
                                  onClick={() => { setIsPlaying(false); goToMove(i); }}
                                >
                                  {m.san}
                                </span>
                             </div>
                             <div className="flex items-center">
                                {history[i+1] ? (
                                  <span 
                                    className={`cursor-pointer hover:text-white px-2 py-0.5 rounded w-full ${i+1 === currentMoveIndex ? 'bg-amber-600/20 text-amber-500 font-bold' : ''}`}
                                    onClick={() => { setIsPlaying(false); goToMove(i+1); }}
                                  >
                                    {history[i+1].san}
                                  </span>
                                ) : <span></span>}
                             </div>
                           </React.Fragment>
                         )
                      }
                      return null;
                   })}
                </div>
             </div>

             {/* Controls */}
             <div className="p-4 bg-slate-800 border-t border-slate-700 flex flex-col gap-3 z-10">
                <div className="flex justify-center gap-2">
                   <button onClick={() => {setIsPlaying(false); goToMove(-1);}} className="p-3 bg-slate-700 rounded-lg hover:bg-slate-600 text-slate-300 transition-colors"><ChevronsLeft size={18}/></button>
                   <button onClick={() => {setIsPlaying(false); goToMove(currentMoveIndex - 1);}} className="p-3 bg-slate-700 rounded-lg hover:bg-slate-600 text-slate-300 transition-colors"><ChevronLeft size={18}/></button>
                   <button onClick={() => setIsPlaying(!isPlaying)} className="px-6 py-2 bg-amber-600 rounded-lg hover:bg-amber-500 text-white flex items-center justify-center transition-colors shadow-lg">
                      {isPlaying ? <Pause size={20}/> : <Play size={20} />}
                   </button>
                   <button onClick={() => {setIsPlaying(false); goToMove(currentMoveIndex + 1);}} className="p-3 bg-slate-700 rounded-lg hover:bg-slate-600 text-slate-300 transition-colors"><ChevronRight size={18}/></button>
                   <button onClick={() => {setIsPlaying(false); goToMove(history.length - 1);}} className="p-3 bg-slate-700 rounded-lg hover:bg-slate-600 text-slate-300 transition-colors"><ChevronsRight size={18}/></button>
                </div>
                <button onClick={() => setOrientation(prev => prev === 'white' ? 'black' : 'white')} className="text-xs text-center text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 py-1">
                   <Repeat size={12} /> Flip Board
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};

function App() {
  // --- APP MODE & ROUTING ---
  const [viewMode, setViewMode] = useState<'dashboard' | 'training-hub' | 'training-active' | 'analysis'>('dashboard');

  // --- AUTH & ROUTING STATE ---
  const [session, setSession] = useState<any>(null);
  const [currentRepertoire, setCurrentRepertoire] = useState<Repertoire | null>(null);
  const [loadingRepertoire, setLoadingRepertoire] = useState(false);
  
  // --- GAME STATE ---
  const [game, setGame] = useState(new Chess());
  const [orientation, setOrientation] = useState<BoardOrientation>('white');
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // --- ANALYSIS STATE ---
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<Record<number, EngineAnalysis>>({});
  const engineWorkerRef = useRef<Worker | null>(null);
  const latestFenRef = useRef(game.fen());

  // --- TRAINING STATE ---
  const [trainingState, setTrainingState] = useState<{
      active: boolean;
      feedback: 'correct' | 'incorrect' | 'waiting' | 'none' | 'completed';
      currentNode: MoveNode | null; // Tracks position in tree
  }>({ active: false, feedback: 'waiting', currentNode: null });

  const [sessionStats, setSessionStats] = useState<TrainingSessionStats>({
      correct: 0,
      errors: 0,
      movesLeft: 0
  });

  // User Stats (Global)
  const [userStats, setUserStats] = useState<UserTrainingStats | null>(null);

  // --- EXPLORER STATE ---
  // Specific data for the dashboard (fetched in parallel)
  const [mastersData, setMastersData] = useState<ExplorerData | null>(null);
  const [lichessData, setLichessData] = useState<ExplorerData | null>(null);
  
  const [isExplorerLoading, setIsExplorerLoading] = useState(false);
  const explorerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Settings for the "Full Explorer" tab
  const [explorerSettings, setExplorerSettings] = useState<ExplorerSettings>({
      source: 'masters',
      speeds: ['blitz', 'rapid', 'classical'],
      ratings: [2000, 2200, 2500]
  });

  // --- IMPORTED GAMES STATE ---
  const [importedGames, setImportedGames] = useState<ImportedGame[]>([]);
  const [currentMovePath, setCurrentMovePath] = useState<string[]>([]); // Track SAN history for matching
  const [viewingGameMetadata, setViewingGameMetadata] = useState<GameMetadata | null>(null);

  // --- TREE STATE ---
  const [rootNode, setRootNode] = useState<MoveNode>({
    id: 'root',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    move: {} as Move,
    san: '',
    comment: '',
    children: [],
    parent: null,
    moveNumber: 0,
    color: 'b'
  });
  const [currentNode, setCurrentNode] = useState<MoveNode | null>(null);
  const commentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- STRATEGY STATE ---
  const [pawnStructureMode, setPawnStructureMode] = useState(false);

  // --- AUTH INITIALIZATION ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch User Stats on Session Change
  useEffect(() => {
    if (session?.user) {
        fetchUserStats();
    }
  }, [session]);

  const fetchUserStats = async () => {
    try {
        const { data, error } = await supabase
            .from('user_training_stats')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
        
        if (data) setUserStats(data);
    } catch (e) {
        console.error("Error fetching stats", e);
    }
  };

  // --- ENGINE INITIALIZATION (STOCKFISH) ---
  useEffect(() => {
    // Initialize Stockfish Worker
    const initEngine = async () => {
      try {
        const response = await fetch(STOCKFISH_URL);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const worker = new Worker(blobUrl);
        
        worker.postMessage('uci');
        worker.postMessage('setoption name MultiPV value 3');
        
        worker.onmessage = (e) => {
          const msg = e.data;
          
          if (typeof msg === 'string' && msg.startsWith('info') && msg.includes('depth') && msg.includes('score')) {
             parseEngineOutput(msg);
          }
        };

        engineWorkerRef.current = worker;
      } catch (err) {
        console.error("Failed to load Stockfish", err);
      }
    };

    initEngine();

    return () => {
      if (engineWorkerRef.current) {
        engineWorkerRef.current.terminate();
      }
    };
  }, []);

  const parseEngineOutput = (line: string) => {
      // Example: info depth 18 seldepth 26 multipv 1 score cp 32 ... pv e2e4 c7c5
      const depthMatch = line.match(/depth (\d+)/);
      const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
      const multipvMatch = line.match(/multipv (\d+)/);
      const pvMatch = line.match(/ pv (.+)/);

      if (depthMatch && scoreMatch && multipvMatch && pvMatch) {
          const depth = parseInt(depthMatch[1]);
          const type = scoreMatch[1]; // cp or mate
          const val = parseInt(scoreMatch[2]);
          const lineIndex = parseInt(multipvMatch[1]);
          const pvRaw = pvMatch[1].split(' ');
          
          // Convert UCI (e2e4) to SAN (e4) for display
          // We need a temp chess instance with current FEN
          const tempGame = new Chess(latestFenRef.current);
          const firstMoveUci = pvRaw[0];
          let san = firstMoveUci;
          try {
             const from = firstMoveUci.slice(0, 2);
             const to = firstMoveUci.slice(2, 4);
             const promotion = firstMoveUci.length === 5 ? firstMoveUci.slice(4) : undefined;
             const m = tempGame.move({ from, to, promotion });
             if (m) san = m.san;
          } catch(e) {}

          const analysis: EngineAnalysis = {
              depth,
              eval: type === 'cp' ? (val / 100) : undefined,
              mate: type === 'mate' ? val : undefined,
              san: san,
              continuationArr: pvRaw,
              from: firstMoveUci.slice(0,2),
              to: firstMoveUci.slice(2,4),
              winChance: type === 'cp' 
                ? (50 + 50 * (2 / (1 + Math.exp(-0.00368208 * val)) - 1)) 
                : (val > 0 ? 100 : 0) // rough approx for mate
          };

          setAnalysisData(prev => ({
              ...prev,
              [lineIndex]: analysis
          }));
      }
  };

  // --- LOAD REPERTOIRE LOGIC ---
  useEffect(() => {
    if (currentRepertoire) {
      loadRepertoireMoves(currentRepertoire.id);
      loadImportedGames(currentRepertoire.id);
      setOrientation(currentRepertoire.color);
    }
  }, [currentRepertoire]);

  const loadImportedGames = async (repId: string) => {
    try {
       // We select * which should include 'associated_fen' if it exists in the DB
       const { data, error } = await supabase
         .from('imported_games')
         .select('*')
         .eq('repertoire_id', repId)
         .order('date', { ascending: false });

       if (error) throw error;
       
       const processedGames: ImportedGame[] = (data || []).map((g: any) => {
          const moves = parsePgnMoves(g.pgn);
          // Try to get FEN from PGN tags first (Anchor)
          const anchorFen = extractRepertoireFen(g.pgn);
          // If not in PGN tag, try DB column (if exists), otherwise undefined
          const fen = anchorFen || g.associated_fen;

          return {
             ...g,
             movesArray: moves,
             associated_fen: fen 
          };
       });

       setImportedGames(processedGames);
    } catch(err) {
       console.error("Error loading imported games", err);
    }
  };

  const handleDeleteImportedGames = async (ids: string[]) => {
      if (ids.length === 0) return;
      // Note: No window.confirm here anymore, the ControlPanel handles the UI modal confirmation.

      try {
          const { error } = await supabase
            .from('imported_games')
            .delete()
            .in('id', ids);
          
          if (error) throw error;
          
          setImportedGames(prev => prev.filter(game => !ids.includes(game.id)));
          setNotification(`Deleted ${ids.length} game(s)`);
      } catch (err) {
          console.error("Error deleting games", err);
          setNotification("Failed to delete games");
      }
      setTimeout(() => setNotification(null), 3000);
  };

  // --- UPDATE REPERTOIRE (FOR VIDEOS) ---
  const handleUpdateRepertoire = async (updatedRep: Repertoire) => {
    try {
        const { error } = await supabase
            .from('repertoires')
            .update({ video_gallery: updatedRep.video_gallery })
            .eq('id', updatedRep.id);

        if (error) throw error;
        setCurrentRepertoire(updatedRep);
    } catch (e: any) {
        console.error("Failed to update repertoire", e);
        if (e.code === 'PGRST204' || e.message?.includes('video_gallery')) {
            alert("Database Error: Missing column 'video_gallery'.\n\nPlease run this SQL in Supabase:\n\nalter table repertoires add column if not exists video_gallery jsonb default '[]'::jsonb;");
        } else {
            alert("Failed to save changes to server.");
        }
    }
  };

  const loadRepertoireMoves = async (repId: string) => {
    setLoadingRepertoire(true);
    const newGame = new Chess();
    setGame(newGame);
    const newRoot: MoveNode = {
      id: 'root',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      move: {} as Move,
      san: '',
      comment: '',
      children: [],
      parent: null,
      moveNumber: 0,
      color: 'b'
    };
    
    try {
      // ORDERING FIX: Order by created_at to ensure input order determines main line
      const { data: dbMoves, error } = await supabase
        .from('moves')
        .select('*')
        .eq('repertoire_id', repId)
        .order('created_at', { ascending: true }); // Critical fix for Main Line detection

      if (error) throw error;

      if (dbMoves && dbMoves.length > 0) {
        buildTreeFromDb(newRoot, dbMoves as DbMove[]);
      }
      
      setRootNode(newRoot);
      setCurrentNode(null); 
      setLastMove(null);
      setCurrentMovePath([]);

    } catch (err) {
      console.error("Error loading repertoire:", err);
      setNotification("Error loading moves");
    } finally {
      setLoadingRepertoire(false);
    }
  };

  const buildTreeFromDb = (root: MoveNode, dbMoves: DbMove[]) => {
    const nodeMap = new Map<string, MoveNode>();
    
    // First Pass: Create all nodes
    dbMoves.forEach(dbMove => {
       const moveObj = {
           from: dbMove.uci ? (dbMove.uci.slice(0,2) as Square) : 'a1', 
           to: dbMove.uci ? (dbMove.uci.slice(2,4) as Square) : 'a1',
           san: dbMove.san,
           color: dbMove.color as Color,
       } as Move;

       const node: MoveNode = {
           id: dbMove.id,
           fen: dbMove.fen,
           move: moveObj,
           san: dbMove.san,
           comment: dbMove.comment || '',
           children: [],
           parent: null,
           moveNumber: dbMove.move_number,
           color: dbMove.color as Color,
           source: dbMove.source, 
           metadata: dbMove.metadata,
       };
       nodeMap.set(dbMove.id, node);
    });

    // Second Pass: Link parents and children
    // Because we ordered by created_at in the SQL query, the loop order preserves insertion order.
    // The first child pushed to the array will be the main line (index 0).
    dbMoves.forEach(dbMove => {
        const node = nodeMap.get(dbMove.id)!;
        if (dbMove.parent_id) {
            const parent = nodeMap.get(dbMove.parent_id);
            if (parent) {
                node.parent = parent;
                parent.children.push(node);
            }
        } else {
            node.parent = root;
            root.children.push(node);
        }
    });
  };

  // --- DERIVED STATE ---
  const [gameState, setGameState] = useState<GameState>({
    fen: game.fen(),
    turn: game.turn(),
    inCheck: game.inCheck(),
    inCheckmate: game.isCheckmate(),
    inDraw: game.isDraw(),
    isGameOver: game.isGameOver(),
    hasHistory: rootNode.children.length > 0,
  });

  const updateGameState = useCallback(() => {
    const currentFen = game.fen();
    setGameState({
      fen: currentFen,
      turn: game.turn(),
      inCheck: game.inCheck(),
      inCheckmate: game.isCheckmate(),
      inDraw: game.isDraw(),
      isGameOver: game.isGameOver(),
      hasHistory: rootNode.children.length > 0,
    });
    latestFenRef.current = currentFen;
  }, [game, rootNode]);

  useEffect(() => {
    updateGameState();
  }, [game, updateGameState]);

  // --- EXPLORER DATA FETCHING (PARALLEL) ---
  useEffect(() => {
    if (explorerDebounceRef.current) clearTimeout(explorerDebounceRef.current);
    
    explorerDebounceRef.current = setTimeout(async () => {
      setIsExplorerLoading(true);
      
      // We fetch both in parallel so the Dashboard can show both rows
      // 1. Masters
      const mastersPromise = fetchOpeningStats(gameState.fen, { source: 'masters', speeds: [], ratings: [] });
      
      // 2. Lichess (using standard high-level filters for dashboard)
      const lichessPromise = fetchOpeningStats(gameState.fen, { 
          source: 'lichess', 
          speeds: ['blitz', 'rapid', 'classical'], 
          ratings: [2000, 2200, 2500] 
      });

      const [m, l] = await Promise.all([mastersPromise, lichessPromise]);
      
      setMastersData(m);
      setLichessData(l);
      
      setIsExplorerLoading(false);
    }, 500); 

    return () => {
      if (explorerDebounceRef.current) clearTimeout(explorerDebounceRef.current);
    };
  }, [gameState.fen]);

  const handleExplorerMove = (san: string) => {
    try {
      const tempGame = new Chess(game.fen());
      const move = tempGame.move(san);
      if (move) {
         handleMove(move);
      }
    } catch(e) {
      console.error("Explorer Move Error", e);
    }
  };

  // Helper for PGN Fetching to pass to ControlPanel
  const handleFetchPgn = async (gameId: string): Promise<string | null> => {
      return await fetchMasterGame(gameId);
  };

  const handleImportMasterGame = async (gameId: string) => {
    if (!currentRepertoire || !session?.user) return;
    setNotification("Fetching master game...");
    
    try {
      // 1. Fetch PGN from API
      const pgn = await fetchMasterGame(gameId);
      if (!pgn) {
        setNotification("Failed to download game PGN.");
        return;
      }

      setNotification("Importing to library...");

      // 2. Inject Anchor FEN into PGN for persistence without new DB column
      const anchoredPgn = injectRepertoireFen(pgn, gameState.fen);

      // 3. Parse Metadata
      const whiteMatch = pgn.match(/\[White "(.*?)"\]/);
      const blackMatch = pgn.match(/\[Black "(.*?)"\]/);
      const resultMatch = pgn.match(/\[Result "(.*?)"\]/);
      const dateMatch = pgn.match(/\[Date "(.*?)"\]/);
      const whiteElo = pgn.match(/\[WhiteElo "(.*?)"\]/);
      const blackElo = pgn.match(/\[BlackElo "(.*?)"\]/);
      
      const payload = {
          user_id: session.user.id,
          repertoire_id: currentRepertoire.id,
          white_name: whiteMatch ? whiteMatch[1] : 'Unknown',
          black_name: blackMatch ? blackMatch[1] : 'Unknown',
          white_rating: whiteElo ? parseInt(whiteElo[1]) : null,
          black_rating: blackElo ? parseInt(blackElo[1]) : null,
          result: resultMatch ? resultMatch[1] : '*',
          date: dateMatch ? dateMatch[1] : 'Unknown',
          pgn: anchoredPgn, // Save modified PGN
          // associated_fen: gameState.fen  <-- removed to avoid DB errors
      };

      // 4. OPTIMISTIC UPDATE
      const tempId = generateId();
      const newGame: ImportedGame = {
          id: tempId, // Temporary ID
          repertoire_id: currentRepertoire.id,
          white_name: payload.white_name,
          black_name: payload.black_name,
          white_rating: payload.white_rating || undefined,
          black_rating: payload.black_rating || undefined,
          result: payload.result,
          date: payload.date,
          pgn: anchoredPgn,
          movesArray: parsePgnMoves(pgn),
          associated_fen: gameState.fen // Local session only
      };
      
      setImportedGames(prev => [newGame, ...prev]);

      // 5. Save to DB AND Update ID
      const { data, error } = await supabase.from('imported_games').insert([payload]).select().single();
      if (error) throw error;
      
      // Update the optimistic item with the real ID from DB
      if (data) {
          setImportedGames(prev => prev.map(g => g.id === tempId ? { ...g, id: data.id } : g));
      }
      
      setNotification("Game attached to this position!");

    } catch (e: any) {
      console.error(e);
      setNotification("Error importing game.");
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLichessImport = async (username: string, count: number, token?: string) => {
    setNotification(`Fetching ${count} games for ${username}...`);
    try {
      const pgnData = await fetchUserGames(username, count, token);
      
      if (!pgnData) {
         setNotification("No games found.");
         return;
      }

      setNotification("Parsing and saving games...");

      const rawGames = pgnData.split('[Event "').filter(g => g.trim().length > 0);
      
      const newGamesPayload = [];
      const newOptimisticGames: ImportedGame[] = [];

      for (let raw of rawGames) {
          let fullPgn = '[Event "' + raw; 
          
          // Inject Anchor for each game (all attached to current FEN)
          fullPgn = injectRepertoireFen(fullPgn, gameState.fen);

          const whiteMatch = fullPgn.match(/\[White "(.*?)"\]/);
          const blackMatch = fullPgn.match(/\[Black "(.*?)"\]/);
          const dateMatch = fullPgn.match(/\[Date "(.*?)"\]/);
          const resultMatch = fullPgn.match(/\[Result "(.*?)"\]/);
          const whiteEloMatch = fullPgn.match(/\[WhiteElo "(.*?)"\]/);
          const blackEloMatch = fullPgn.match(/\[BlackElo "(.*?)"\]/);

          const gameObj = {
             user_id: session.user.id,
             repertoire_id: currentRepertoire!.id,
             white_name: whiteMatch ? whiteMatch[1] : 'Unknown',
             black_name: blackMatch ? blackMatch[1] : 'Unknown',
             white_rating: whiteEloMatch ? parseInt(whiteEloMatch[1]) : null,
             black_rating: blackEloMatch ? parseInt(blackEloMatch[1]) : null,
             result: resultMatch ? resultMatch[1] : '*',
             date: dateMatch ? dateMatch[1] : 'Unknown',
             pgn: fullPgn,
          };
          
          newGamesPayload.push(gameObj);
          
          newOptimisticGames.push({
              id: generateId(),
              repertoire_id: currentRepertoire!.id,
              white_name: gameObj.white_name,
              black_name: gameObj.black_name,
              white_rating: gameObj.white_rating || undefined,
              black_rating: gameObj.black_rating || undefined,
              result: gameObj.result,
              date: gameObj.date,
              pgn: gameObj.pgn,
              movesArray: parsePgnMoves(fullPgn),
              associated_fen: gameState.fen 
          });
      }

      // Optimistic Update
      setImportedGames(prev => [...newOptimisticGames, ...prev]);

      const { error } = await supabase.from('imported_games').insert(newGamesPayload);
      if (error) throw error;
      
      // RELOAD list to get real IDs for these games to allow deletion
      loadImportedGames(currentRepertoire!.id);
      
      setNotification(`Imported ${newGamesPayload.length} games to this position!`);

    } catch (e: any) {
       console.error(e);
       setNotification(e.message || "Error importing games");
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLoadImportedGame = (pgn: string) => {
      if(window.confirm("Load this game into the board? This will reset your current analysis view (saved moves remain in database).")) {
          try {
             const tempGame = new Chess();
             tempGame.loadPgn(pgn);
             
             const newRoot: MoveNode = {
                 id: 'root',
                 fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                 move: {} as Move,
                 san: '',
                 comment: '',
                 children: [],
                 parent: null,
                 moveNumber: 0,
                 color: 'b',
                 isNew: true 
             };

             const history = tempGame.history({ verbose: true });
             let current = newRoot;
             const replayGame = new Chess();

             history.forEach((hMove: any) => {
                 replayGame.move(hMove);
                 const node: MoveNode = {
                     id: generateId(),
                     fen: replayGame.fen(),
                     move: hMove,
                     san: hMove.san,
                     comment: '',
                     children: [],
                     parent: current,
                     moveNumber: hMove.color === 'w' ? (current.moveNumber + 1) : current.moveNumber,
                     color: hMove.color,
                     isNew: true 
                 };
                 current.children.push(node);
                 current = node;
             });

             setGame(new Chess()); 
             setRootNode(newRoot);
             setCurrentNode(null); 
             setCurrentMovePath([]);
             setValidMoves([]);
             setLastMove(null);

          } catch(e) {
             setNotification("Error parsing PGN");
          }
      }
  };

  // --- ENGINE ANALYSIS EFFECT ---
  useEffect(() => {
    latestFenRef.current = gameState.fen;
    if (!engineWorkerRef.current) return;

    if (isAnalyzing) {
      if (isAnalyzing) setAnalysisData({}); // Clear previous data only if explicit analysis
      engineWorkerRef.current.postMessage('stop'); 

      engineWorkerRef.current.postMessage(`position fen ${gameState.fen}`);
      engineWorkerRef.current.postMessage('go infinite');
    } else {
      if (!isAnalyzing) {
          engineWorkerRef.current.postMessage('stop');
      }
    }

  }, [isAnalyzing, gameState.fen]);

  const toggleAnalysis = () => setIsAnalyzing(!isAnalyzing);

  // --- NAVIGATION ---
  const navigateToNode = (node: MoveNode | null) => {
    const newGame = new Chess();
    if (node) {
        newGame.load(node.fen);
        setLastMove({ from: node.move.from, to: node.move.to });
    } else {
        newGame.load(rootNode.fen);
        setLastMove(null);
    }
    
    const path: string[] = [];
    let temp = node;
    while(temp && temp.id !== 'root') {
        path.unshift(temp.san);
        temp = temp.parent;
    }
    setCurrentMovePath(path);

    setGame(newGame);
    setCurrentNode(node);
    setSelectedSquare(null);
    setValidMoves([]);
  };

  // --- MOVE HANDLING & SAVING ---
  const onSquareClick = (square: Square) => {
    // MODIFIED: If feedback is 'correct', we allow the user to make a new move.
    // This acts as an implicit "Continue". 
    // We only block if it's 'completed' or we are waiting for an animation (optional).
    if (trainingState.active && trainingState.feedback === 'completed') {
        return; 
    }

    const moveAttempt = validMoves.find(m => m.to === square);

    if (moveAttempt) {
      try {
        const tempGame = new Chess(game.fen());
        const result = tempGame.move({
          from: selectedSquare!,
          to: square,
          promotion: 'q'
        });
        
        if (result) {
          // INTERCEPT for Training
          if (trainingState.active) {
              handleTrainingMove(result);
          } else {
              handleMove(result);
          }
          return;
        }
      } catch (e) {
        console.error("Move error:", e);
      }
    }

    const piece = game.get(square);

    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true }) as Move[];
      setValidMoves(moves);
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  // --- TRAINING LOGIC ---
  const countMovesLeft = (node: MoveNode | null, color: Color) => {
      if (!node) return 0;
      let count = 0;
      let temp = node;
      // Traverse down the main line (index 0)
      while (temp.children.length > 0) {
          temp = temp.children[0];
          // Count only user moves (matching repertoire color)
          if (temp.color === color) count++;
      }
      return count;
  };

  const startTraining = (repertoire: Repertoire) => {
      setCurrentRepertoire(repertoire);
      setViewMode('training-active');
      
      const newGame = new Chess();
      setGame(newGame);
      setLastMove(null);
      setValidMoves([]);
      setSelectedSquare(null);
      
      // Calculate total expected moves for session
      // For simplicity, we calculate from root when data is loaded
      
      setTrainingState({
          active: true,
          feedback: 'waiting',
          currentNode: rootNode 
      });

      setSessionStats({
          correct: 0,
          errors: 0,
          movesLeft: 0 // Will update in useEffect
      });
  };

  // Sync Training Node with Root once loaded & Update Moves Left
  useEffect(() => {
      if (trainingState.active && rootNode && currentRepertoire) {
          // Sync Root if needed
          if (trainingState.currentNode?.id === 'root' && rootNode.children.length > 0) {
             const movesLeft = countMovesLeft(rootNode, currentRepertoire.color as Color);
             
             setTrainingState(prev => ({ ...prev, currentNode: rootNode }));
             setSessionStats(prev => ({ ...prev, movesLeft }));
          }
      }
  }, [rootNode, trainingState.active, currentRepertoire]);

  const logTrainingResult = async (
      fen: string, 
      expected: string, 
      played: string | null, 
      isCorrect: boolean,
      points: number
  ) => {
      if (!session?.user || !currentRepertoire) return;

      try {
          const { error } = await supabase.from('training_logs').insert([{
              user_id: session.user.id,
              repertoire_id: currentRepertoire.id,
              fen: fen,
              expected_move: expected,
              played_move: played,
              is_correct: isCorrect,
              points_delta: points
          }]);

          if (error) throw error;
          fetchUserStats();

      } catch (err) {
          console.error("Failed to log training result", err);
      }
  };

  const handleTrainingMove = (moveResult: Move) => {
      const currentDrillNode = trainingState.currentNode;
      if (!currentDrillNode) return;

      // Check if move matches Main Line (child 0)
      const correctMoveNode = currentDrillNode.children.length > 0 ? currentDrillNode.children[0] : null;

      if (correctMoveNode && moveResult.san === correctMoveNode.san) {
          // --- CORRECT ---
          // 1. Update Game & Visuals for User Move
          const gameAfterUser = new Chess(game.fen());
          gameAfterUser.move(moveResult);
          
          setGame(gameAfterUser);
          setLastMove({ from: moveResult.from, to: moveResult.to });
          setSelectedSquare(null);
          setValidMoves([]);

          // 2. Log & Stats
          logTrainingResult(currentDrillNode.fen, correctMoveNode.san, moveResult.san, true, 10);
          setSessionStats(prev => ({
              ...prev,
              correct: prev.correct + 1,
              movesLeft: Math.max(0, prev.movesLeft - 1)
          }));

          // 3. Handle Opponent Response (Auto-Play)
          // The correctMoveNode is what the user just played. 
          // Does IT have children? If so, that's the opponent's move.
          if (correctMoveNode.children.length > 0) {
              const opponentNode = correctMoveNode.children[0];
              
              // Animate opponent move after short delay
              setTimeout(() => {
                  const gameAfterOpponent = new Chess(gameAfterUser.fen());
                  const oppMove = gameAfterOpponent.move(opponentNode.move); // Execute using internal move data
                  
                  if (oppMove) {
                      setGame(gameAfterOpponent);
                      setLastMove({ from: oppMove.from, to: oppMove.to });
                      
                      // Advance state to opponent node, ready for NEXT user move
                      setTrainingState({
                          active: true,
                          feedback: 'correct', // Keep showing correct feedback (non-blocking)
                          currentNode: opponentNode 
                      });
                  }
              }, 500); // 500ms delay for natural feel

          } else {
              // End of Line!
              setTrainingState({
                  active: true,
                  feedback: 'completed',
                  currentNode: correctMoveNode
              });
          }

      } else {
          // --- INCORRECT ---
          setTrainingState(prev => ({ ...prev, feedback: 'incorrect' }));
          
          const expected = correctMoveNode ? correctMoveNode.san : 'Unknown';
          logTrainingResult(currentDrillNode.fen, expected, moveResult.san, false, -5);
          
          setSessionStats(prev => ({ ...prev, errors: prev.errors + 1 }));

          setTimeout(() => {
              setTrainingState(prev => ({ ...prev, feedback: 'waiting' }));
              setSelectedSquare(null);
              setValidMoves([]);
          }, 1500);
      }
  };

  const handleTrainingContinue = () => {
      // Manual skip if needed (though auto-play handles most cases now)
      setTrainingState(prev => ({ ...prev, feedback: 'waiting' }));
  };

  const handleExitTraining = () => {
      setTrainingState({ active: false, feedback: 'none', currentNode: null });
      setViewMode('training-hub'); // Navigate back to Training Hub
      setCurrentRepertoire(null);
  };

  const handleRestartTraining = () => {
      if (currentRepertoire) {
          startTraining(currentRepertoire);
      }
  };

  const handleMove = async (moveResult: Move) => {
    const parent = currentNode || rootNode;
    
    const existingChild = parent.children.find(child => child.san === moveResult.san);

    // --- EDITOR MODE LOGIC ---
    if (existingChild) {
        navigateToNode(existingChild);
    } else {
        if (!currentRepertoire) return;

        const newGame = new Chess(game.fen());
        newGame.move(moveResult); 

        const tempId = generateId(); 
        const moveNumber = moveResult.color === 'w' 
             ? (parent === rootNode ? 1 : parent.moveNumber + 1)
             : parent.moveNumber;

        const newNode: MoveNode = {
            id: tempId, 
            fen: newGame.fen(),
            move: moveResult,
            san: moveResult.san,
            comment: '',
            children: [],
            parent: parent,
            moveNumber: moveNumber,
            color: moveResult.color,
            isNew: true
        };
        
        parent.children.push(newNode);
        
        setGame(newGame);
        setCurrentNode(newNode);
        setLastMove({ from: moveResult.from, to: moveResult.to });
        setRootNode({ ...rootNode }); 
        setSelectedSquare(null);
        setValidMoves([]);

        setCurrentMovePath(prev => [...prev, moveResult.san]);

        try {
            const { data, error } = await supabase
                .from('moves')
                .insert([{
                    repertoire_id: currentRepertoire.id,
                    fen: newGame.fen(),
                    san: moveResult.san,
                    uci: moveResult.from + moveResult.to + (moveResult.promotion || ''),
                    parent_id: parent.id === 'root' ? null : parent.id,
                    move_number: moveNumber,
                    color: moveResult.color,
                    comment: ''
                }])
                .select()
                .single();

            if (error) throw error;
            if (data) {
                newNode.id = data.id;
                delete newNode.isNew;
            }
        } catch (err) {
            console.error("Failed to save move:", err);
            setNotification("Failed to save move");
        }
    }
  };

  // Helper to collect all subtree IDs
  const getSubtreeIds = (node: MoveNode): string[] => {
      let ids = [node.id];
      if (node.children) {
        for (const child of node.children) {
            ids = [...ids, ...getSubtreeIds(child)];
        }
      }
      return ids;
  };

  const handleDeleteNode = async () => {
    if (!currentNode) return; 

    // Safety check: prevent deleting the root/start position
    if (!currentNode.parent) {
         setNotification("Cannot delete the start position.");
         setTimeout(() => setNotification(null), 2000);
         return;
    }
    
    setNotification("Deleting...");
    
    // 1. Capture Data
    const parent = currentNode.parent;
    const nodeId = currentNode.id;
    const idsToDelete = getSubtreeIds(currentNode);

    // 2. IMMEDIATE UI UPDATE (Optimistic)
    // Remove the child from parent's array
    parent.children = parent.children.filter(c => c.id !== nodeId);
    
    // Force deep update of Root Node to trigger React re-render of the tree
    setRootNode({ ...rootNode });
    
    // Reset Game Board State to Parent immediately
    const prevGame = new Chess();
    prevGame.load(parent.fen);
    setGame(prevGame);
    setCurrentNode(parent);
    setLastMove(parent.move ? { from: parent.move.from, to: parent.move.to } : null);
    
    // Update path string array
    const newPath = [...currentMovePath];
    newPath.pop();
    setCurrentMovePath(newPath);

    try {
      // 3. DATABASE UPDATE (Async)
      if (idsToDelete.length > 0) {
          const { error } = await supabase.from('moves').delete().in('id', idsToDelete);
          if (error) throw error;
      }
      setNotification("Move deleted");
      setTimeout(() => setNotification(null), 2000);
    } catch (err: any) {
      console.error("Error deleting move:", err);
      setNotification("Error: DB Deletion failed");
      alert(`Database deletion failed: ${err.message}. The move will reappear on reload.`);
    }
  };

  const handleUpdateComment = (text: string) => {
      if (currentNode && !currentNode.isNew && currentRepertoire) {
          currentNode.comment = text;
          setRootNode({ ...rootNode }); 
          if (commentTimeoutRef.current) clearTimeout(commentTimeoutRef.current);
          commentTimeoutRef.current = setTimeout(async () => {
             try {
                 await supabase
                    .from('moves')
                    .update({ comment: text })
                    .eq('id', currentNode.id);
             } catch(err) {
                 console.error("Error saving comment", err);
             }
          }, 800);
      }
  };

  const resetGame = () => {
    const newGame = new Chess();
    if (rootNode.children.length > 0) {
        navigateToNode(null);
    }
  };

  const handleImport = async (pgn: string) => {
    if (!currentRepertoire || !session?.user) return;
    setNotification("Importing game...");

    try {
        // Inject Anchor FEN
        const anchoredPgn = injectRepertoireFen(pgn, gameState.fen);

        const whiteMatch = pgn.match(/\[White "(.*?)"\]/);
        const blackMatch = pgn.match(/\[Black "(.*?)"\]/);
        const resultMatch = pgn.match(/\[Result "(.*?)"\]/);
        const dateMatch = pgn.match(/\[Date "(.*?)"\]/);
        const whiteElo = pgn.match(/\[WhiteElo "(.*?)"\]/);
        const blackElo = pgn.match(/\[BlackElo "(.*?)"\]/);

        const payload = {
            user_id: session.user.id,
            repertoire_id: currentRepertoire.id,
            white_name: whiteMatch ? whiteMatch[1] : 'Unknown',
            black_name: blackMatch ? blackMatch[1] : 'Unknown',
            white_rating: whiteElo ? parseInt(whiteElo[1]) : null,
            black_rating: blackElo ? parseInt(blackElo[1]) : null,
            result: resultMatch ? resultMatch[1] : '*',
            date: dateMatch ? dateMatch[1] : 'Unknown',
            pgn: anchoredPgn, // Save modified PGN
        };

        const tempId = generateId();
        const newGame: ImportedGame = {
             id: tempId,
             repertoire_id: currentRepertoire.id,
             white_name: payload.white_name,
             black_name: payload.black_name,
             white_rating: payload.white_rating || undefined,
             black_rating: payload.black_rating || undefined,
             result: payload.result,
             date: payload.date,
             pgn: anchoredPgn,
             movesArray: parsePgnMoves(pgn),
             associated_fen: gameState.fen 
        };
        setImportedGames(prev => [newGame, ...prev]);

        const { data, error } = await supabase.from('imported_games').insert([payload]).select().single();
        if (error) throw error;
        
        if (data) {
            setImportedGames(prev => prev.map(g => g.id === tempId ? { ...g, id: data.id } : g));
        }
        
        setNotification("Game attached to this position!");
    } catch (e: any) {
        console.error(e);
        setNotification("Import failed: " + e.message);
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const flipBoard = () => setOrientation(prev => prev === 'white' ? 'black' : 'white');

  const copyFen = () => {
    navigator.clipboard.writeText(gameState.fen);
    setNotification("FEN Copied!");
    setTimeout(() => setNotification(null), 2000);
  };

  // --- RENDER ---
  if (!session) {
    return <Auth />;
  }

  // --- VIEW MODE: DASHBOARD ---
  if (viewMode === 'dashboard') {
    return (
        <Dashboard 
            onSelectRepertoire={(rep) => {
                setCurrentRepertoire(rep);
                setViewMode('analysis');
            }} 
            onOpenTraining={() => setViewMode('training-hub')}
        />
    );
  }

  // --- VIEW MODE: TRAINING HUB ---
  if (viewMode === 'training-hub') {
      return (
          <TrainingHub 
              onStartTraining={startTraining}
              onBack={() => setViewMode('dashboard')}
          />
      );
  }

  const bestLine = analysisData[1];
  
  // Find matching games ONLY for the current exact position (FEN)
  const matchingGames = importedGames.filter(g => {
      // 1. Strict FEN Match (Priority - for Anchored Games)
      if (g.associated_fen) {
          // Compare without move counters if possible, but exact match is standard for FEN anchors
          return g.associated_fen === gameState.fen; 
      }
      
      // 2. Fallback Path Matching (For legacy or non-anchored games)
      // Only use if NO associated_fen found
      if (!g.movesArray) return false;
      
      // If we are at root (empty path), show games that have no specific anchor
      if (currentMovePath.length === 0) return true;

      // If game is shorter than current path, it can't match
      if (g.movesArray.length < currentMovePath.length) return false;
      
      // Check every move
      for (let i = 0; i < currentMovePath.length; i++) {
          if (g.movesArray[i] !== currentMovePath[i]) return false;
      }
      return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      
      {viewingGameMetadata && (
        <GameViewerModal metadata={viewingGameMetadata} onClose={() => setViewingGameMetadata(null)} />
      )}

      {/* HEADER / NAVIGATION */}
      <header className="w-full bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-md">
         <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <button 
              onClick={() => { 
                  if (trainingState.active) {
                      handleExitTraining();
                  } else {
                      setCurrentRepertoire(null);
                      setViewMode('dashboard');
                  }
              }}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider group"
            >
              <div className="p-1.5 rounded-md bg-slate-800 group-hover:bg-slate-700 transition-colors">
                 <ArrowLeft size={16} />
              </div>
              <span className="hidden sm:inline">
                 {trainingState.active ? 'Back to Training Center' : 'Back to Dashboard'}
              </span>
            </button>
            
            <div className="flex items-center gap-3">
               <div className={`w-2 h-8 rounded-full hidden sm:block ${trainingState.active ? 'bg-amber-500 animate-pulse' : 'bg-slate-600'}`}></div>
               <div>
                  <h1 className="text-slate-200 font-bold text-lg leading-tight truncate max-w-[200px] sm:max-w-md">{currentRepertoire?.name}</h1>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{trainingState.active ? 'Training Mode' : currentRepertoire?.color}</p>
               </div>
            </div>

            <div className="w-8"></div> {/* Spacer for balance */}
         </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col md:flex-row gap-8">
        
        {/* Left: Board Area */}
        <div className="flex-1 flex flex-col items-center">
           <div className="relative w-full max-w-[600px]">
             {loadingRepertoire && (
               <div className="absolute inset-0 z-50 bg-slate-950/80 rounded-lg flex items-center justify-center text-white backdrop-blur-sm">
                 <div className="flex flex-col items-center gap-2">
                    <LayoutGrid className="animate-spin text-amber-500" size={32} />
                    <span className="font-bold tracking-wider">Loading Moves...</span>
                 </div>
               </div>
             )}
             
             <Board 
               game={game}
               orientation={orientation}
               selectedSquare={selectedSquare}
               validMoves={validMoves}
               lastMove={lastMove}
               onSquareClick={onSquareClick}
               inCheck={gameState.inCheck}
               bestMove={isAnalyzing && bestLine?.from && bestLine?.to ? { from: bestLine.from, to: bestLine.to } : null}
               winChance={isAnalyzing && bestLine?.winChance !== undefined ? bestLine.winChance : null}
               pawnStructureMode={pawnStructureMode}
             />
           </div>

           {/* COMMENT CARD (Only in Analysis Mode) */}
           {!trainingState.active && (
               <div className="w-full max-w-[600px] mt-4">
                  <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-amber-500 rounded-lg p-4 shadow-lg relative overflow-hidden group min-h-[120px] flex flex-col transition-all hover:bg-slate-800/50">
                     <div className="flex items-center justify-between gap-2 mb-2 select-none">
                        <div className="flex items-center gap-2 text-amber-500/80">
                            <MessageSquare size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Commentary</span>
                        </div>
                        {currentNode && currentNode.comment && (
                            <button 
                                onClick={() => handleUpdateComment('')}
                                className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded"
                                title="Delete Comment"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                     </div>
                     
                     {currentNode ? (
                        <textarea 
                           className="w-full bg-transparent border-none text-slate-300 text-sm focus:outline-none resize-none flex-1 placeholder:text-slate-600 leading-relaxed min-h-[60px]"
                           placeholder="Add notes for this position..."
                           value={currentNode.comment || ''}
                           onChange={(e) => handleUpdateComment(e.target.value)}
                        />
                     ) : (
                        <div className="flex items-center justify-center h-full text-slate-600 text-xs italic">
                           Select a move to add comments.
                        </div>
                     )}
                  </div>
               </div>
           )}
        </div>

        {/* Right: Controls Area - ADDED z-30 HERE */}
        <div className="w-full md:w-[450px] flex-shrink-0 flex flex-col h-[600px] md:h-[calc(100vh-140px)] md:sticky md:top-4 z-30">
          
            {trainingState.active ? (
                <TrainingPanel 
                    feedback={trainingState.feedback}
                    onNext={handleTrainingContinue}
                    onExit={handleExitTraining}
                    onRestart={handleRestartTraining}
                    turnColor={game.turn()}
                    userStats={userStats}
                    sessionStats={sessionStats}
                />
            ) : (
                <ControlPanel 
                    game={game}
                    gameState={gameState}
                    rootNode={rootNode}
                    currentNode={currentNode}
                    onReset={resetGame}
                    onFlip={flipBoard}
                    onCopyFen={copyFen}
                    onNavigate={navigateToNode}
                    onImport={handleImport}
                    onUpdateComment={handleUpdateComment}
                    onDelete={handleDeleteNode}
                    isAnalyzing={isAnalyzing}
                    onToggleAnalysis={toggleAnalysis}
                    analysisData={analysisData}
                    // Explorer props
                    explorerData={explorerSettings.source === 'masters' ? mastersData : lichessData}
                    mastersData={mastersData}
                    lichessData={lichessData}
                    isExplorerLoading={isExplorerLoading}
                    onExplorerMove={handleExplorerMove}
                    onLoadMasterGame={handleImportMasterGame}
                    onFetchPgn={handleFetchPgn}
                    explorerSettings={explorerSettings}
                    onUpdateExplorerSettings={setExplorerSettings}
                    // Games props
                    onLichessImport={handleLichessImport}
                    importedGames={importedGames}
                    onLoadGame={handleLoadImportedGame}
                    currentMovePath={currentMovePath}
                    onDeleteGames={handleDeleteImportedGames}
                    // Strategy Props
                    pawnStructureMode={pawnStructureMode}
                    onTogglePawnStructure={() => setPawnStructureMode(!pawnStructureMode)}
                    // Viewer Props
                    onViewGame={(meta) => setViewingGameMetadata(meta)}
                    // Library Props
                    currentRepertoire={currentRepertoire!}
                    onUpdateRepertoire={handleUpdateRepertoire}
                />
            )}
          
          {notification && (
            <div className="absolute top-[10%] left-1/2 -translate-x-1/2 bg-slate-800 text-amber-400 px-4 py-2 rounded-lg shadow-xl text-sm font-bold border border-slate-700 animate-bounce z-50 whitespace-nowrap">
              {notification}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;