import React, { useEffect, useState, useRef } from 'react';
import { Brain, CheckCircle, XCircle, FastForward, RotateCcw, Calendar, TrendingUp, Swords, RotateCw, Shield, Zap, Activity, User, PauseCircle, RefreshCw, GitBranch, ArrowRight, Play, List, Crosshair, Shuffle, Trophy } from 'lucide-react';
import { TrainingMode, UserStats, EngineAnalysis, MoveNode, Repertoire, TrainingExercise, TrainingSequenceStep, DrillSettings } from '../types';
import { fetchSimulatedHumanMove } from '../lichessClient';
import { Chess } from 'chess.js';

interface TrainingPanelProps {
  isTraining: boolean;
  mode: TrainingMode;
  feedback: 'correct' | 'incorrect' | 'waiting' | null;
  correctMoveSan: string | null;
  onNextPuzzle: () => void;
  onRetry: (fen?: string) => void;
  onStopTraining: () => void;
  onToggleMode: (mode: TrainingMode) => void;
  dueCount: number;
  userStats: UserStats;
  analysisData: Record<number, EngineAnalysis>;
  
  // New props for Game interaction
  game?: Chess;
  onBotMove?: (san: string) => void;
  // For selecting random start positions
  rootNode?: MoveNode;
  currentNode?: MoveNode | null;
  onJumpToNode?: (node: MoveNode) => void;
  currentRepertoire?: Repertoire | null;
  drillSettings?: DrillSettings | null;
}

const TrainingPanel: React.FC<TrainingPanelProps> = ({
  isTraining,
  mode,
  feedback,
  correctMoveSan,
  onNextPuzzle,
  onRetry,
  onStopTraining,
  onToggleMode,
  dueCount,
  userStats,
  analysisData,
  game,
  onBotMove,
  rootNode,
  currentNode,
  onJumpToNode,
  currentRepertoire,
  drillSettings
}) => {
  if (!isTraining) return null;

  // XP Calculation helpers
  const nextLevelXp = userStats.level * 100;
  const xpProgress = (userStats.xp % 100) / 100 * 100;

  // --- SESSION STATE ---
  const [sessionActive, setSessionActive] = useState(false);
  const [lineProgress, setLineProgress] = useState(0); // Moves made in current line
  const [isLineComplete, setIsLineComplete] = useState(false);

  // --- SMART SPARRING STATE ---
  const [botStatus, setBotStatus] = useState<'idle' | 'thinking'>('idle');
  const [sparringSource, setSparringSource] = useState<'human' | 'engine'>('human');

  // --- DRILL ENGINE (RECALL MODE) ---
  useEffect(() => {
      // 1. INIT: Start a new line if not active and in Recall mode
      if (mode === 'recall' && !sessionActive && rootNode && drillSettings) {
          startNewDrillLine();
      }
  }, [mode, sessionActive, rootNode, drillSettings]);

  // --- BOT RESPONSE ENGINE (RECALL MODE) ---
  useEffect(() => {
      if (mode === 'recall' && sessionActive && !isLineComplete && currentNode && game && onBotMove) {
          // Check if it's bot's turn based on drillSettings color
          const userColor = drillSettings?.color === 'white' ? 'w' : 'b';
          
          if (game.turn() !== userColor) {
              // Bot Turn
              const children = currentNode.children;
              
              if (children.length === 0) {
                  // End of line
                  setIsLineComplete(true);
              } else {
                  // Pick a move
                  // If multiple, pick random (Drill Logic) or weighted
                  const nextNode = children[Math.floor(Math.random() * children.length)];
                  
                  // Simulate delay for realism
                  const timer = setTimeout(() => {
                      if (onBotMove) {
                          onBotMove(nextNode.san);
                          setLineProgress(prev => prev + 1);
                      }
                  }, 600);
                  
                  return () => clearTimeout(timer);
              }
          }
      }
  }, [mode, sessionActive, currentNode, game?.fen(), onBotMove, drillSettings, isLineComplete]);

  // --- SUCCESS DETECTION (USER MOVE) ---
  useEffect(() => {
      if (mode === 'recall' && feedback === 'correct') {
          setLineProgress(prev => prev + 1);
          // Check if this user move ended the line (no children for bot)
          if (currentNode && currentNode.children.length === 0) {
              setIsLineComplete(true);
          }
      }
  }, [feedback, currentNode]);


  const startNewDrillLine = () => {
      if (!rootNode || !onJumpToNode || !drillSettings) return;

      setSessionActive(true);
      setIsLineComplete(false);
      setLineProgress(0);
      onNextPuzzle(); // Reset feedback in parent

      // 1. Determine Start Node
      let startNode = rootNode;
      // Future: Logic to pick random sub-node if mode === 'random'
      
      onJumpToNode(startNode);
  };

  const handleNextLine = () => {
      startNewDrillLine();
  };

  // --- SPARRING LOGIC ---
  const pickRandomStartPosition = () => {
      if (!rootNode || !onJumpToNode) return;
      const nodes: MoveNode[] = [];
      const traverse = (node: MoveNode) => {
          if (node.id !== 'root') nodes.push(node);
          node.children.forEach(traverse);
      };
      traverse(rootNode);

      if (nodes.length > 0) {
          const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
          onJumpToNode(randomNode);
      }
  };

  // --- EFFECT: Smart Sparring Bot Move ---
  useEffect(() => {
      if (mode === 'sparring' && game && onBotMove) {
          const userColor = currentRepertoire?.color === 'black' ? 'b' : 'w';
          
          if (game.turn() !== userColor && botStatus === 'idle') {
              setBotStatus('thinking');
              const playBotMove = async () => {
                  let moveSan: string | null = null;
                  let source = sparringSource;
                  try {
                      moveSan = await fetchSimulatedHumanMove(game.fen());
                  } catch (e) { console.error(e); }
                  if (!moveSan) {
                      source = 'engine';
                      const moves = game.moves();
                      if (moves.length > 0) moveSan = moves[Math.floor(Math.random() * moves.length)];
                  }
                  setSparringSource(source);
                  setTimeout(() => {
                      if (moveSan && onBotMove) onBotMove(moveSan);
                      setBotStatus('idle');
                  }, 1000 + Math.random() * 1000);
              };
              playBotMove();
          }
      }
  }, [mode, game?.fen(), onBotMove, currentRepertoire]);

  const handlePauseTraining = () => {
      if (currentRepertoire && game) {
          const sessionData = {
              repertoireId: currentRepertoire.id,
              mode: mode,
              fen: game.fen(),
              timestamp: new Date().toISOString(),
              drillSettings: drillSettings // Save settings too
          };
          localStorage.setItem(`training_session_${currentRepertoire.id}`, JSON.stringify(sessionData));
          onStopTraining();
      } else {
          onStopTraining();
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl shadow-xl overflow-hidden border border-slate-800 relative">
      {/* Header with Stats */}
      <div className="bg-slate-800 border-b border-slate-700">
         <div className="p-4 flex items-center justify-between">
             <div className="flex items-center gap-2">
                 <div className="relative">
                     <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center font-bold text-white shadow-lg border border-amber-500/50">
                         {userStats.level}
                     </div>
                     <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-900 rounded-full flex items-center justify-center">
                        <TrendingUp size={10} className="text-green-400" />
                     </div>
                 </div>
                 <div>
                     <div className="text-[10px] uppercase font-bold text-slate-400">Level {userStats.level}</div>
                     <div className="w-24 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                         <div style={{ width: `${xpProgress}%` }} className="h-full bg-amber-500 transition-all duration-500" />
                     </div>
                 </div>
             </div>
             
             <div className="flex flex-col items-end gap-1">
                  <div className="text-xs text-slate-400 font-mono bg-slate-950/50 px-2 py-1 rounded border border-slate-700/50 flex items-center gap-2">
                     <Calendar size={12} className="text-blue-400" />
                     Due: <span className="text-white font-bold">{dueCount}</span>
                  </div>
                  <button 
                    onClick={handlePauseTraining}
                    className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                  >
                      <PauseCircle size={10} /> Pause & Save
                  </button>
             </div>
         </div>

         {/* Mode Toggles */}
         <div className="flex p-1 gap-1 bg-slate-950/30">
             <button 
                onClick={() => onToggleMode('recall')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded transition-all ${mode === 'recall' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
             >
                 <Brain size={14} /> Drill
             </button>
             <button 
                onClick={() => onToggleMode('sparring')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded transition-all ${mode === 'sparring' ? 'bg-indigo-900/50 text-indigo-200 border border-indigo-500/30 shadow' : 'text-slate-500 hover:text-slate-300'}`}
             >
                 <Swords size={14} /> Sparring
             </button>
         </div>
      </div>

      {/* Main Feedback Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-900/50">
        
        {/* --- DRILL (RECALL) MODE UI --- */}
        {mode === 'recall' && (
            <div className="flex flex-col h-full">
                {/* Status Bar */}
                <div className="p-3 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {drillSettings?.mode === 'random' ? <Shuffle size={14} className="text-amber-500" /> : <RotateCw size={14} className="text-amber-500" />}
                        <span className="text-xs font-bold text-slate-300 capitalize">{drillSettings?.mode} Drill</span>
                    </div>
                    <span className="text-xs font-mono text-slate-500">
                        Move {lineProgress}
                    </span>
                </div>

                {/* Drill Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center relative">
                    
                    {/* Visual Error Border Effect (handled in App via toast/logic, but we can add an overlay here) */}
                    {feedback === 'incorrect' && (
                        <div className="absolute inset-0 border-4 border-red-500/30 pointer-events-none animate-pulse z-0" />
                    )}

                    {!isLineComplete ? (
                        <>
                            {feedback === 'waiting' && (
                                <div className="animate-in fade-in zoom-in duration-300 relative z-10">
                                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 mx-auto border-4 border-slate-700 shadow-inner">
                                        <Crosshair size={32} className="text-amber-500 animate-pulse" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-200 mb-2">Your Turn</h2>
                                    <p className="text-slate-500 text-sm">Play the move from your repertoire.</p>
                                </div>
                            )}

                            {feedback === 'correct' && (
                                <div className="animate-in fade-in zoom-in duration-200 relative z-10 w-full max-w-xs">
                                    <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mb-4 mx-auto border-4 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                                        <CheckCircle size={32} className="text-green-500" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-green-400 mb-2">Correct!</h2>
                                </div>
                            )}

                            {feedback === 'incorrect' && (
                                <div className="animate-in shake duration-300 relative z-10 w-full max-w-sm">
                                    <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4 mx-auto border-4 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                                        <XCircle size={32} className="text-red-500" />
                                    </div>
                                    <h2 className="text-xl font-bold text-red-400 mb-1">Incorrect Move</h2>
                                    <p className="text-slate-400 text-xs mb-4">
                                        That move is not in your repertoire for this position.
                                    </p>
                                    <p className="text-amber-500 text-sm font-bold animate-pulse">Try Again</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="animate-in fade-in zoom-in duration-300 relative z-10 w-full max-w-xs">
                            <div className="w-20 h-20 bg-amber-600 rounded-full flex items-center justify-center mb-6 mx-auto shadow-xl">
                                <Trophy size={40} className="text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Line Completed!</h2>
                            <p className="text-slate-400 text-sm mb-8">
                                You've reached the end of this variation.
                            </p>
                            
                            <button 
                                onClick={handleNextLine}
                                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg transform hover:scale-[1.02]"
                            >
                                Next Line <ArrowRight size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- SPARRING MODE UI --- */}
        {mode === 'sparring' && (
            <div className="animate-in fade-in duration-500 relative z-10 w-full p-6 flex flex-col items-center justify-center h-full">
                <div className="bg-indigo-950/30 border border-indigo-500/30 p-4 rounded-xl mb-6 w-full text-center">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <Swords size={24} className="text-indigo-400" />
                        <h2 className="text-lg font-bold text-indigo-100">Simulated Human (2000 Elo)</h2>
                    </div>
                    <p className="text-xs text-indigo-200/70 mb-2">
                        Practice converting against realistic human responses.
                    </p>
                    <div className="flex items-center justify-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${botStatus === 'thinking' ? 'bg-amber-500 animate-ping' : 'bg-slate-600'}`} />
                        <span className="text-[10px] text-slate-400 uppercase font-bold">
                            {botStatus === 'thinking' ? 'Opponent Thinking...' : 'Your Turn'}
                        </span>
                    </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 inline-flex flex-col gap-1 min-w-[150px] text-center">
                     <span className="text-[10px] text-slate-500 uppercase font-bold">Bot Source</span>
                     <span className={`text-sm font-bold flex items-center justify-center gap-2 ${sparringSource === 'human' ? 'text-indigo-400' : 'text-slate-400'}`}>
                         {sparringSource === 'human' ? <User size={14} /> : <Zap size={14} />}
                         {sparringSource === 'human' ? 'Lichess DB' : 'Stockfish'}
                     </span>
                </div>
                
                <div className="mt-8 flex justify-center gap-3">
                    <button 
                       onClick={pickRandomStartPosition}
                       className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded flex items-center gap-1 border border-slate-700"
                    >
                        <RefreshCw size={12} /> New Position
                    </button>
                    <button 
                       onClick={handlePauseTraining}
                       className="text-xs text-slate-500 hover:text-white flex items-center gap-1"
                    >
                        Pause Session
                    </button>
                </div>
            </div>
        )}

      </div>

      {/* Footer Actions */}
      <div className="bg-slate-950 p-4 border-t border-slate-800">
          <button 
            onClick={onStopTraining}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg py-3 text-slate-400 hover:text-white transition-colors"
          >
             <RotateCw size={16} />
             <span className="text-xs font-bold uppercase">Exit Training</span>
          </button>
      </div>
    </div>
  );
};

export default TrainingPanel;