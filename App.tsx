import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Square, Move, Color } from 'chess.js';
import { GameState, BoardOrientation, MoveNode, EngineAnalysis, Repertoire, DbMove, ExplorerData, ImportedGame, GameMetadata, ExplorerSettings, TrainingMode, UserStats, DrillSettings } from './types';
import Board from './components/Board';
import ControlPanel from './components/ControlPanel';
import TrainingPanel from './components/TrainingPanel'; 
import TrainingHub from './components/TrainingHub'; 
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { supabase } from './supabaseClient';
import { ArrowLeft, MessageSquare, LayoutGrid, X, Play, Pause, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Repeat, BookOpen, Calendar, Trophy, Database, Cpu, Zap, Loader2, Trash2 } from 'lucide-react';
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
                <div>
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
  // --- AUTH & ROUTING STATE ---
  const [session, setSession] = useState<any>(null);
  const [currentRepertoire, setCurrentRepertoire] = useState<Repertoire | null>(null);
  
  // --- GAME STATE ---
  const [game, setGame] = useState(new Chess());
  const [orientation, setOrientation] = useState<BoardOrientation>('white');
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  // --- ANALYSIS STATE ---
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<Record<number, EngineAnalysis>>({});
  const engineWorkerRef = useRef<Worker | null>(null);
  const latestFenRef = useRef(game.fen());
  const isBotThinking = useRef(false); // Track if we are waiting for a bot move

  // --- EXPLORER STATE ---
  const [mastersData, setMastersData] = useState<ExplorerData | null>(null);
  const [lichessData, setLichessData] = useState<ExplorerData | null>(null);
  const [isExplorerLoading, setIsExplorerLoading] = useState(false);
  const [explorerSettings, setExplorerSettings] = useState<ExplorerSettings>({
      source: 'masters',
      speeds: ['blitz', 'rapid', 'classical'],
      ratings: [2000, 2200, 2500]
  });

  // --- IMPORTED GAMES STATE ---
  const [importedGames, setImportedGames] = useState<ImportedGame[]>([]);
  const [currentMovePath, setCurrentMovePath] = useState<string[]>([]); // Track SAN history for matching
  const [viewingGameMetadata, setViewingGameMetadata] = useState<GameMetadata | null>(null);

  // --- TRAINING STATE ---
  const [inTrainingMode, setInTrainingMode] = useState(false); // Main toggle for the "Section"
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('recall'); // recall or sparring
  const [trainingFeedback, setTrainingFeedback] = useState<'correct' | 'incorrect' | 'waiting' | null>(null);
  const [correctTrainingMove, setCorrectTrainingMove] = useState<string | null>(null);
  const [dueMovesCount, setDueMovesCount] = useState(0);
  const [drillSettings, setDrillSettings] = useState<DrillSettings | null>(null);

  // Gamification
  const [userStats, setUserStats] = useState<UserStats>({ xp: 0, level: 1, streak: 0 });

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

  // --- STRATEGY STATE ---
  const [pawnStructureMode, setPawnStructureMode] = useState(false);

  // --- EFFECTS ---
  
  // Sync Ref for Engine
  useEffect(() => {
    latestFenRef.current = game.fen();
  }, [game]);

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

  // --- ENGINE INITIALIZATION (STOCKFISH) ---
  useEffect(() => {
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
          
          if (typeof msg === 'string' && msg.startsWith('bestmove')) {
             const bestMoveParts = msg.split(' ');
             const uciMove = bestMoveParts[1];
             if (uciMove && uciMove !== '(none)' && inTrainingMode && trainingMode === 'sparring' && isBotThinking.current) {
                 handleBotMove(uciMove);
                 isBotThinking.current = false;
             }
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
  }, [inTrainingMode, trainingMode, currentRepertoire]);

  const parseEngineOutput = (line: string) => {
      const depthMatch = line.match(/depth (\d+)/);
      const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
      const multipvMatch = line.match(/multipv (\d+)/);
      const pvMatch = line.match(/ pv (.+)/);

      if (depthMatch && scoreMatch && multipvMatch && pvMatch) {
          const depth = parseInt(depthMatch[1]);
          const type = scoreMatch[1]; 
          const val = parseInt(scoreMatch[2]);
          const lineIndex = parseInt(multipvMatch[1]);
          const pvRaw = pvMatch[1].split(' ');
          
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
                : (val > 0 ? 100 : 0)
          };

          setAnalysisData(prev => ({
              ...prev,
              [lineIndex]: analysis
          }));
      }
  };

  const handleBotMove = (uciOrSan: string) => {
      const currentFen = latestFenRef.current;
      
      try {
          const tempGame = new Chess(currentFen);
          const repColor = currentRepertoire?.color === 'white' ? 'w' : 'b';
          if (tempGame.turn() === repColor) return;

          let move;
          if (uciOrSan.match(/^[a-h][1-8][a-h][1-8][qrbn]?$/)) {
             const from = uciOrSan.slice(0, 2) as Square;
             const to = uciOrSan.slice(2, 4) as Square;
             const promotion = uciOrSan.length === 5 ? uciOrSan.slice(4) : undefined;
             move = tempGame.move({ from, to, promotion: promotion as any });
          } else {
             move = tempGame.move(uciOrSan);
          }
          
          if (move) {
              setGame(tempGame);
              setLastMove({ from: move.from, to: move.to });
              
              if (currentNode) {
                  const child = currentNode.children.find(c => c.san === move.san);
                  if (child) setCurrentNode(child);
                  else setCurrentNode(null); 
              }
          }
      } catch (e) {
          console.error("Bot Move Error", e);
      }
  };

  const onSquareClick = (square: Square) => {
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    const move = validMoves.find(m => m.to === square);
    if (move) {
        makeMove(move);
        setSelectedSquare(null);
        setValidMoves([]);
        return;
    }

    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      setValidMoves(game.moves({ square, verbose: true }));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const makeMove = (move: Move) => {
      const newGame = new Chess(game.fen());
      const result = newGame.move(move);
      if(!result) return;

      setGame(newGame);
      setLastMove({ from: result.from, to: result.to });
      
      if (currentNode) {
          let child = currentNode.children.find(c => c.san === result.san);
          if (!child) {
              const newNode: MoveNode = {
                  id: generateId(),
                  fen: newGame.fen(),
                  move: result,
                  san: result.san,
                  comment: '',
                  children: [],
                  parent: currentNode,
                  moveNumber: result.color === 'w' ? currentNode.moveNumber : currentNode.moveNumber + 1,
                  color: result.color
              };
              currentNode.children.push(newNode);
              child = newNode;
          }
          setCurrentNode(child);
      }
      
      if (isAnalyzing && engineWorkerRef.current) {
          engineWorkerRef.current.postMessage('stop');
          engineWorkerRef.current.postMessage(`position fen ${newGame.fen()}`);
          engineWorkerRef.current.postMessage('go depth 20');
      }
  };

  // --- RENDER ---

  if (!session) return <Auth />;
  
  if (!currentRepertoire) {
      return (
          <Dashboard 
             onSelectRepertoire={(rep) => {
                 setCurrentRepertoire(rep);
                 setOrientation(rep.color);
                 setGame(new Chess());
                 setRootNode(prev => ({ ...prev, children: [] })); // Should load tree here
                 setCurrentNode(null);
             }} 
             userStats={userStats}
             onStartTrainingSession={(rep, mode, saved, settings) => {
                 setCurrentRepertoire(rep);
                 setOrientation(rep.color);
                 setInTrainingMode(true);
                 setTrainingMode(mode);
                 setDrillSettings(settings || null);
             }}
             onEnterCoachMode={() => {}}
          />
      );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
             {/* Main Board Area */}
             <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-950/50 relative">
                  <button onClick={() => setCurrentRepertoire(null)} className="absolute top-4 left-4 p-2 bg-slate-800 rounded hover:bg-slate-700 text-slate-400 z-50">
                      <ArrowLeft size={20} />
                  </button>

                  <div className="w-full max-w-[600px]">
                      <Board 
                          game={game} 
                          orientation={orientation} 
                          selectedSquare={selectedSquare}
                          validMoves={validMoves}
                          lastMove={lastMove}
                          onSquareClick={onSquareClick}
                          inCheck={game.inCheck()}
                          bestMove={analysisData[1]?.from && analysisData[1]?.to ? { from: analysisData[1].from, to: analysisData[1].to } : null}
                          winChance={analysisData[1]?.winChance ?? 50}
                          pawnStructureMode={pawnStructureMode}
                      />
                  </div>
             </div>

             {/* Right Panel */}
             <div className="w-full md:w-[450px] bg-slate-900 border-l border-slate-800 flex flex-col">
                  {inTrainingMode ? (
                      <TrainingPanel 
                          isTraining={true}
                          mode={trainingMode}
                          feedback={trainingFeedback}
                          correctMoveSan={correctTrainingMove}
                          onNextPuzzle={() => {}} 
                          onRetry={() => {}} 
                          onStopTraining={() => setInTrainingMode(false)}
                          onToggleMode={setTrainingMode}
                          dueCount={dueMovesCount}
                          userStats={userStats}
                          analysisData={analysisData}
                          game={game}
                          onBotMove={handleBotMove}
                          rootNode={rootNode}
                          currentNode={currentNode}
                          onJumpToNode={(node) => {
                              setCurrentNode(node);
                              setGame(new Chess(node.fen));
                          }}
                          currentRepertoire={currentRepertoire}
                          drillSettings={drillSettings}
                      />
                  ) : (
                      <ControlPanel 
                          game={game}
                          gameState={{
                              fen: game.fen(),
                              turn: game.turn(),
                              inCheck: game.inCheck(),
                              inCheckmate: game.isCheckmate(),
                              inDraw: game.isDraw(),
                              isGameOver: game.isGameOver(),
                              hasHistory: game.history().length > 0
                          }}
                          rootNode={rootNode}
                          currentNode={currentNode}
                          onNavigate={(node) => {
                              if (!node) {
                                  setCurrentNode(null);
                                  setGame(new Chess(rootNode.fen));
                                  return;
                              }
                              setCurrentNode(node);
                              setGame(new Chess(node.fen));
                          }}
                          onReset={() => {
                              setCurrentNode(null);
                              setGame(new Chess(rootNode.fen));
                          }}
                          onFlip={() => setOrientation(o => o === 'white' ? 'black' : 'white')}
                          onCopyFen={() => navigator.clipboard.writeText(game.fen())}
                          onImport={() => {}} 
                          onUpdateComment={() => {}} 
                          onDelete={() => {}} 
                          isAnalyzing={isAnalyzing}
                          onToggleAnalysis={() => setIsAnalyzing(!isAnalyzing)}
                          analysisData={analysisData}
                          onStartTraining={(mode) => {
                              setInTrainingMode(true);
                              setTrainingMode(mode);
                          }}
                          explorerData={null} 
                          mastersData={mastersData}
                          lichessData={lichessData}
                          isExplorerLoading={isExplorerLoading}
                          onExplorerMove={() => {}} 
                          onLoadMasterGame={() => {}} 
                          explorerSettings={explorerSettings}
                          onUpdateExplorerSettings={setExplorerSettings}
                          onLichessImport={() => {}} 
                          importedGames={importedGames}
                          onLoadGame={() => {}} 
                          currentMovePath={[]} 
                          onDeleteGames={() => {}}
                          pawnStructureMode={pawnStructureMode}
                          onTogglePawnStructure={() => setPawnStructureMode(!pawnStructureMode)}
                          onViewGame={(meta) => setViewingGameMetadata(meta)}
                      />
                  )}
             </div>
        </div>

        {viewingGameMetadata && (
            <GameViewerModal 
                metadata={viewingGameMetadata} 
                onClose={() => setViewingGameMetadata(null)} 
            />
        )}
    </div>
  );
}

export default App;