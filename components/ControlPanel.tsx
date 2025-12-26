import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  RotateCcw, Copy, Repeat, Trophy, AlertTriangle, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  Import, MessageSquare, Cpu, Activity, Trash2, GitBranch, CornerDownRight, Brain, BookOpen, Database, Search, FileText, X, Play, Pause, ChevronDown, PlayCircle, Layers, CheckSquare, Square, Swords, Download, ExternalLink, TrendingUp, User, Globe, Loader2, Lightbulb, ShieldAlert, ShieldCheck, Book, Library, Calendar, Paperclip, Settings, Zap, LayoutList, AlignLeft, Grid3X3, Split, Video, Plus, Star
} from 'lucide-react';
import { GameState, MoveNode, EngineAnalysis, ExplorerData, ImportedGame, GameMetadata, ExplorerSettings, TrainingMode, PawnStructureAnalysis, Repertoire, VideoMetadata } from '../types';
import { Chess, Move } from 'chess.js';
import OpeningExplorer from './OpeningExplorer';
import Board from './Board'; 
import { analyzeStructure } from '../strategy';

interface ControlPanelProps {
  game: Chess;
  gameState: GameState;
  rootNode: MoveNode;
  currentNode: MoveNode | null;
  onReset: () => void;
  onFlip: () => void;
  onCopyFen: () => void;
  onNavigate: (node: MoveNode | null) => void;
  onImport: (pgnOrFen: string) => void;
  onUpdateComment: (comment: string) => void;
  onDelete: () => void;
  isAnalyzing: boolean;
  onToggleAnalysis: () => void;
  analysisData: Record<number, EngineAnalysis>;
  onStartTraining: (mode: TrainingMode, fromCurrentPosition?: boolean) => void;
  
  // Explorer Props
  explorerData: ExplorerData | null;
  mastersData: ExplorerData | null;
  lichessData: ExplorerData | null;
  isExplorerLoading: boolean;
  onExplorerMove: (san: string) => void;
  onLoadMasterGame: (gameId: string) => void;
  onFetchPgn?: (gameId: string) => Promise<string | null>;
  explorerSettings: ExplorerSettings;
  onUpdateExplorerSettings: (s: ExplorerSettings) => void;
  
  // Import & Games Props
  onLichessImport: (username: string, count: number, token?: string) => void;
  importedGames: ImportedGame[];
  onLoadGame: (pgn: string) => void;
  currentMovePath: string[]; 
  onDeleteGames: (ids: string[]) => void;

  // Visual Props
  pawnStructureMode: boolean;
  onTogglePawnStructure: () => void;

  // Viewer Props (New)
  onViewGame: (metadata: GameMetadata) => void;

  // Video Library Props
  currentRepertoire: Repertoire | null;
  onUpdateRepertoire: (rep: Repertoire) => void;
}

// --- CONFIRMATION MODAL ---
const ConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-sm w-full p-6 transform scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4 text-red-500">
                    <div className="p-3 bg-red-900/20 rounded-full">
                        <Trash2 size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                </div>
                
                <p className="text-slate-400 mb-6 leading-relaxed">
                    {message}
                </p>

                <div className="flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors font-bold text-sm"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => { onConfirm(); onClose(); }}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 font-bold text-sm flex items-center gap-2"
                    >
                        <Trash2 size={16} /> Confirm Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- VIDEO MODAL ---
const VideoPlayerModal: React.FC<{ video: VideoMetadata; onClose: () => void }> = ({ video, onClose }) => {
    // Adding origin to fix Error 153 (configuration error for some embedded videos)
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const src = `https://www.youtube.com/embed/${video.id}?autoplay=1&origin=${origin}`;

    return (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-4xl relative">
                <button 
                    onClick={onClose}
                    className="absolute -top-10 right-0 text-slate-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>
                <div className="relative pt-[56.25%] bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800">
                    <iframe 
                        className="absolute inset-0 w-full h-full"
                        src={src}
                        title={video.title}
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                    ></iframe>
                </div>
                
                <div className="mt-4 flex flex-col items-center text-center gap-3">
                    <h3 className="text-xl font-bold text-white">{video.title}</h3>

                    {/* AdBlock / Error 153 Warning */}
                    <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-3 flex flex-col sm:flex-row items-center gap-3 text-left max-w-2xl w-full">
                        <div className="p-2 bg-amber-900/30 rounded-full shrink-0">
                             <AlertTriangle className="text-amber-500" size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-amber-200 uppercase mb-0.5">Erro de Reprodução (153)?</p>
                            <p className="text-xs text-amber-100/70 leading-relaxed">
                                Se o vídeo não carregar, é provável que seu <strong>AdBlock</strong> esteja bloqueando o player. Desative-o para este site ou assista no YouTube.
                            </p>
                        </div>
                        <a 
                            href={video.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shadow-md shrink-0"
                        >
                            Ver no YouTube <ExternalLink size={14} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- TREE RENDERER (Recursive) ---
const MoveTreeRenderer: React.FC<{
  node: MoveNode;
  activeNodeId: string | undefined;
  onNavigate: (node: MoveNode) => void;
  onOpenGame: (metadata: GameMetadata) => void;
  depth?: number;
  gamesFenSet: Set<string>;
}> = ({ node, activeNodeId, onNavigate, onOpenGame, depth = 0, gamesFenSet }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isActive = node.id === activeNodeId;
  const isWhite = node.color === 'w';
  const hasChildren = node.children.length > 0;
  
  // Rule: Child 0 is Main Line. Children 1+ are Alternatives.
  const mainChild = hasChildren ? node.children[0] : null;
  const variations = hasChildren ? node.children.slice(1) : [];

  useEffect(() => {
    if (isActive) {
      setIsExpanded(true);
    }
  }, [isActive]);

  return (
    <div className="inline">
      <div 
        id={`node-${node.id}`}
        onClick={(e) => { e.stopPropagation(); onNavigate(node); }}
        className={`
          inline-flex items-center gap-1 px-1.5 py-0.5 my-0.5 rounded cursor-pointer transition-all border group relative
          ${isActive 
            ? 'bg-amber-600 text-white border-amber-500 shadow-md z-10' 
            : 'hover:bg-slate-800 border-transparent text-slate-300'
          }
        `}
      >
        <span className="text-[10px] font-mono opacity-60 select-none">
          {isWhite ? `${node.moveNumber}.` : (depth === 0 && node.moveNumber === 1 ? '' : (!mainChild && !isWhite ? `${node.moveNumber}...` : ''))}
        </span>
        
        <span className="font-medium text-sm flex items-center gap-1">
            {node.san}
        </span>

        {node.metadata && (
            <button
                onClick={(e) => { e.stopPropagation(); onOpenGame(node.metadata!); }}
                className={`ml-1 p-0.5 rounded-full hover:scale-110 transition-transform flex items-center justify-center ${isActive ? 'text-white' : 'text-amber-500 bg-amber-900/20'}`}
                title={`Play Game: ${node.metadata.white} vs ${node.metadata.black}`}
            >
                <PlayCircle size={14} className="fill-current" />
            </button>
        )}

        {(node.comment || gamesFenSet.has(node.fen)) && (
            <div className="flex items-center gap-0.5 ml-1">
                {node.comment && <Book size={10} className={`${isActive ? 'text-white' : 'text-emerald-400'}`} />}
                {gamesFenSet.has(node.fen) && <Database size={10} className={`${isActive ? 'text-white' : 'text-amber-400'}`} />}
            </div>
        )}
      </div>

      {variations.length > 0 && (
        <div className="inline align-text-top mx-1">
            <button 
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                className={`inline-flex items-center justify-center w-4 h-4 rounded hover:bg-slate-700 transition-colors ${isExpanded ? 'bg-slate-800 text-slate-300' : 'bg-slate-800/50 text-slate-500'}`}
            >
                {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </button>
            
            {isExpanded && (
                <div className="flex flex-col w-full my-1 pl-2 border-l border-slate-700/50 ml-1">
                {variations.map((variant) => (
                    <div key={variant.id} className="relative flex flex-col pl-2 my-0.5 animate-in fade-in slide-in-from-left-1 duration-150">
                        <div className="flex items-center gap-2">
                            <GitBranch size={10} className="text-slate-600 shrink-0" />
                            <MoveTreeRenderer node={variant} activeNodeId={activeNodeId} onNavigate={onNavigate} onOpenGame={onOpenGame} depth={depth + 1} gamesFenSet={gamesFenSet} />
                        </div>
                    </div>
                ))}
                </div>
            )}
        </div>
      )}

      {mainChild && (
        <MoveTreeRenderer node={mainChild} activeNodeId={activeNodeId} onNavigate={onNavigate} onOpenGame={onOpenGame} depth={depth} gamesFenSet={gamesFenSet} />
      )}
    </div>
  );
};

// --- RECURSIVE SHEET RENDERER ---
const MoveSheetRecursive: React.FC<{
    node: MoveNode;
    activeNodeId: string | undefined;
    onNavigate: (node: MoveNode) => void;
    isMainLine: boolean;
}> = ({ node, activeNodeId, onNavigate, isMainLine }) => {
    const isActive = node.id === activeNodeId;
    const isWhite = node.color === 'w';
    
    // Main Line is child[0], Vars are child[1+]
    const mainChild = node.children[0];
    const variations = node.children.slice(1);

    return (
        <span className="inline">
            <span 
                id={`sheet-node-${node.id}`}
                onClick={() => onNavigate(node)}
                className={`
                    cursor-pointer hover:bg-slate-800 rounded px-1 transition-colors group
                    ${isActive ? 'bg-amber-600 text-white font-bold' : (isMainLine ? 'text-slate-300' : 'text-slate-400')}
                `}
            >
                {isWhite ? <span className="text-slate-500 font-mono mr-1 select-none">{node.moveNumber}.</span> : (!node.parent || node.parent.color !== 'w' || !isMainLine ? <span className="text-slate-500 font-mono mr-1 select-none">{node.moveNumber}...</span> : '')}
                {node.san}
            </span>
            <span className="mr-1.5"></span>

            {/* Render Variations in Parentheses */}
            {variations.length > 0 && (
                <span className="text-slate-500 text-xs italic mx-1">
                    {variations.map((v, i) => (
                        <span key={v.id} className="inline-block border-l border-slate-700 pl-1 mr-1">
                            <span className="select-none text-[10px] opacity-70">(</span>
                            <MoveSheetRecursive node={v} activeNodeId={activeNodeId} onNavigate={onNavigate} isMainLine={false} />
                            <span className="select-none text-[10px] opacity-70">)</span>
                        </span>
                    ))}
                </span>
            )}

            {/* Continue Main Line */}
            {mainChild && (
                <MoveSheetRecursive node={mainChild} activeNodeId={activeNodeId} onNavigate={onNavigate} isMainLine={isMainLine} />
            )}
        </span>
    );
};

// --- CARD GRID RENDERER (Modified for Clarity) ---
const MoveCardRenderer: React.FC<{
    movePath: MoveNode[];
    activeNodeId: string | undefined;
    onNavigate: (node: MoveNode) => void;
    gamesFenSet: Set<string>;
    onOpenGame: (metadata: GameMetadata) => void;
}> = ({ movePath, activeNodeId, onNavigate, gamesFenSet, onOpenGame }) => {
    return (
        <div className="p-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {movePath.map((node) => {
                const isActive = node.id === activeNodeId;
                // Get siblings (moves that share the same parent as this node)
                const siblings = node.parent ? node.parent.children.filter(c => c.id !== node.id) : [];
                const hasSiblings = siblings.length > 0;

                return (
                    <div 
                        key={node.id}
                        id={`card-node-${node.id}`}
                        onClick={() => onNavigate(node)}
                        className={`
                            relative flex flex-col p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02]
                            ${isActive 
                                ? 'bg-amber-600 border-amber-500 text-white shadow-xl z-10 ring-1 ring-amber-400' 
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-750'
                            }
                        `}
                    >
                        {/* Number */}
                        <div className={`text-[10px] font-bold uppercase mb-1 flex justify-between ${isActive ? 'text-amber-200' : 'text-slate-500'}`}>
                            <span>{node.moveNumber}{node.color === 'w' ? '.' : '...'}</span>
                            {node.color === 'w' ? <span className="w-2 h-2 bg-slate-200 rounded-full" /> : <span className="w-2 h-2 bg-slate-950 border border-slate-600 rounded-full" />}
                        </div>
                        
                        {/* SAN */}
                        <div className="text-2xl font-black truncate leading-none mb-4 tracking-tighter">
                            {node.san}
                        </div>

                        {/* Footer Info & Variations */}
                        <div className="mt-auto flex flex-col gap-2">
                            <div className="flex justify-between items-end">
                                <div className="flex gap-1">
                                    {node.comment && <Book size={12} className={isActive ? 'text-white' : 'text-emerald-400'} />}
                                    {gamesFenSet.has(node.fen) && <Database size={12} className={isActive ? 'text-white' : 'text-amber-400'} />}
                                </div>
                            </div>

                            {/* Branch Indicator in Card - Explicitly rendered for variants */}
                            {hasSiblings && (
                                <div className={`border-t pt-2 mt-1 ${isActive ? 'border-amber-500/50' : 'border-slate-700'}`}>
                                    <span className={`text-[9px] uppercase font-bold block mb-1 flex items-center gap-1 ${isActive ? 'text-amber-200' : 'text-indigo-400'}`}>
                                        <Split size={8} /> Alts:
                                    </span>
                                    <div className="flex gap-1 flex-wrap">
                                        {siblings.slice(0, 3).map(sib => (
                                            <span 
                                                key={sib.id}
                                                onClick={(e) => { e.stopPropagation(); onNavigate(sib); }}
                                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-colors ${isActive ? 'bg-black/20 hover:bg-black/40' : 'bg-slate-900 border border-slate-600 hover:border-slate-400 text-slate-400 hover:text-white'}`}
                                            >
                                                {sib.san}
                                            </span>
                                        ))}
                                        {siblings.length > 3 && <span className="text-[9px] opacity-50">+</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  gameState, 
  rootNode,
  currentNode,
  onReset, 
  onFlip, 
  onCopyFen,
  onNavigate,
  onImport,
  onUpdateComment,
  onDelete,
  isAnalyzing,
  onToggleAnalysis,
  analysisData,
  onStartTraining,
  explorerData,
  mastersData,
  lichessData,
  isExplorerLoading,
  onExplorerMove,
  onLichessImport,
  importedGames,
  onLoadGame,
  currentMovePath,
  onLoadMasterGame,
  onFetchPgn,
  explorerSettings,
  onUpdateExplorerSettings,
  onDeleteGames,
  pawnStructureMode,
  onTogglePawnStructure,
  onViewGame,
  currentRepertoire,
  onUpdateRepertoire
}) => {
  const historyRef = useRef<HTMLDivElement>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [gameToDeleteId, setGameToDeleteId] = useState<string | null>(null);
  const [videoToDeleteId, setVideoToDeleteId] = useState<string | null>(null);
  const [isGamesListOpen, setIsGamesListOpen] = useState(false);
  const [lichessUsername, setLichessUsername] = useState('');
  const [lichessToken, setLichessToken] = useState('');
  const [importCount, setImportCount] = useState(10);
  const [importMode, setImportMode] = useState<'text' | 'lichess'>('text');
  const [activeTab, setActiveTab] = useState<'moves' | 'explorer' | 'strategy' | 'videos'>('moves');
  const [strategyReport, setStrategyReport] = useState<PawnStructureAnalysis | null>(null);
  
  const [movesViewMode, setMovesViewMode] = useState<'tree' | 'sheet' | 'cards'>('tree');
  
  // Video State
  const [videoUrl, setVideoUrl] = useState('');
  const [addingVideo, setAddingVideo] = useState(false);
  const [playVideo, setPlayVideo] = useState<VideoMetadata | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const latestAnalysisRef = useRef(analysisData);
  useEffect(() => { latestAnalysisRef.current = analysisData; }, [analysisData]);

  const gamesFenSet = useMemo(() => {
      const set = new Set<string>();
      importedGames.forEach(g => {
          if (g.associated_fen) set.add(g.associated_fen);
      });
      return set;
  }, [importedGames]);

  // --- UPDATED PATH LOGIC FOR CARDS ---
  const linearMovePath = useMemo(() => {
      // 1. History (Root to Current)
      const history: MoveNode[] = [];
      let temp = currentNode;
      while (temp && temp.id !== 'root') {
          history.unshift(temp);
          temp = temp.parent;
      }

      // 2. Future (Current's Main Line Children)
      const future: MoveNode[] = [];
      let next = currentNode 
          ? (currentNode.children.length > 0 ? currentNode.children[0] : null)
          : (rootNode.children.length > 0 ? rootNode.children[0] : null);

      while (next) {
          future.push(next);
          if (next.children.length > 0) {
              next = next.children[0];
          } else {
              next = null;
          }
      }

      return [...history, ...future];
  }, [currentNode, rootNode]);

  useEffect(() => {
      if (currentNode && historyRef.current) {
          const idPrefix = movesViewMode === 'cards' ? 'card-node-' : (movesViewMode === 'sheet' ? 'sheet-node-' : 'node-');
          const el = document.getElementById(`${idPrefix}${currentNode.id}`);
          if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      }
  }, [currentNode, movesViewMode]);

  useEffect(() => {
    const savedToken = localStorage.getItem('lichess_token');
    const savedUser = localStorage.getItem('lichess_username');
    if (savedToken) setLichessToken(savedToken);
    if (savedUser) setLichessUsername(savedUser);
  }, []);

  useEffect(() => {
    if (activeTab === 'strategy' || pawnStructureMode) {
        setStrategyReport(analyzeStructure(gameState.fen));
    }
  }, [gameState.fen, activeTab, pawnStructureMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (currentNode && currentNode.parent) setShowDeleteConfirm(true);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentNode]);

  const handleImportSubmit = () => {
    if (importMode === 'text' && importText.trim()) {
      onImport(importText);
      setImportText('');
      setShowImport(false);
    } else if (importMode === 'lichess' && lichessUsername.trim()) {
      if (lichessToken.trim()) localStorage.setItem('lichess_token', lichessToken.trim());
      localStorage.setItem('lichess_username', lichessUsername.trim());
      onLichessImport(lichessUsername, importCount, lichessToken.trim() || undefined);
      setShowImport(false);
    }
  };

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleAddVideo = async () => {
    if (!videoUrl || !currentRepertoire) return;
    setAddingVideo(true);

    const videoId = extractYoutubeId(videoUrl);
    if (!videoId) {
        alert("Invalid YouTube URL");
        setAddingVideo(false);
        return;
    }

    try {
        // Fetch metadata using noembed (No API Key required)
        const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        const data = await response.json();
        
        if (!data.title) throw new Error("Could not fetch video metadata");

        const newVideo: VideoMetadata = {
            id: videoId,
            title: data.title,
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            isFavorite: false
        };

        const currentGallery = currentRepertoire.video_gallery || [];
        // Prevent duplicates
        if (currentGallery.some(v => v.id === videoId)) {
            alert("Video already exists in library");
            setAddingVideo(false);
            setVideoUrl('');
            return;
        }

        const updatedGallery = [newVideo, ...currentGallery];
        onUpdateRepertoire({ ...currentRepertoire, video_gallery: updatedGallery });
        setVideoUrl('');

    } catch (e) {
        console.error("Video add error", e);
        alert("Failed to add video. Please check the URL.");
    } finally {
        setAddingVideo(false);
    }
  };

  // Trigger Confirmation
  const handleDeleteVideo = (videoId: string) => {
    setVideoToDeleteId(videoId);
  };

  // Perform Actual Delete
  const confirmDeleteVideo = () => {
    if (!currentRepertoire || !currentRepertoire.video_gallery || !videoToDeleteId) return;
    
    const updatedGallery = currentRepertoire.video_gallery.filter(v => v.id !== videoToDeleteId);
    onUpdateRepertoire({ ...currentRepertoire, video_gallery: updatedGallery });
    setVideoToDeleteId(null);
  };

  const handleToggleFavorite = (videoId: string) => {
      if (!currentRepertoire?.video_gallery) return;
      const updatedGallery = currentRepertoire.video_gallery.map(v => 
          v.id === videoId ? { ...v, isFavorite: !v.isFavorite } : v
      );
      onUpdateRepertoire({ ...currentRepertoire, video_gallery: updatedGallery });
  };

  // Logic Variables
  const startNodes = rootNode.children;
  // Moves from current position:
  const currentChildren = currentNode ? currentNode.children : startNodes;
  // Sibling Moves (Alternates to current move):
  const siblings = currentNode && currentNode.parent ? currentNode.parent.children.filter(n => n.id !== currentNode.id) : [];
  
  const anchoredGames = importedGames.filter(g => g.associated_fen === gameState.fen);
  const pathMatchingGames = importedGames.filter(g => {
      if (g.associated_fen === gameState.fen) return false;
      if (!g.movesArray) return false;
      if (currentMovePath.length === 0) return true;
      if (g.movesArray.length < currentMovePath.length) return false;
      for(let i=0; i < currentMovePath.length; i++) {
          if (g.movesArray[i] !== currentMovePath[i]) return false;
      }
      return true;
  });

  // Strict Separation for UI
  const mainLineMove = currentChildren.length > 0 ? currentChildren[0] : null;
  const variationMoves = currentChildren.length > 1 ? currentChildren.slice(1) : [];

  // Filtered Videos Logic
  const filteredVideos = useMemo(() => {
      if (!currentRepertoire?.video_gallery) return [];
      if (showFavoritesOnly) return currentRepertoire.video_gallery.filter(v => v.isFavorite);
      return currentRepertoire.video_gallery;
  }, [currentRepertoire, showFavoritesOnly]);

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl shadow-xl overflow-hidden border border-slate-800 relative">
      
      {playVideo && (
          <VideoPlayerModal video={playVideo} onClose={() => setPlayVideo(null)} />
      )}

      <ConfirmationModal 
         isOpen={showDeleteConfirm}
         onClose={() => setShowDeleteConfirm(false)}
         onConfirm={onDelete}
         title="Delete Move?"
         message="Are you sure you want to delete this move? This action will permanently remove this move and all its sub-variations from your repertoire."
      />

      <ConfirmationModal 
         isOpen={!!gameToDeleteId}
         onClose={() => setGameToDeleteId(null)}
         onConfirm={() => {
             if (gameToDeleteId) {
                 onDeleteGames([gameToDeleteId]);
                 setGameToDeleteId(null);
             }
         }}
         title="Delete Game?"
         message="Are you sure you want to remove this game from your library? This action cannot be undone."
      />

      <ConfirmationModal 
         isOpen={!!videoToDeleteId}
         onClose={() => setVideoToDeleteId(null)}
         onConfirm={confirmDeleteVideo}
         title="Remove Video?"
         message="Are you sure you want to remove this video from your library?"
      />

      {/* Import Overlay */}
      {showImport && (
        <div className="absolute inset-0 z-30 bg-slate-900/95 p-4 flex flex-col gap-3 animate-in fade-in duration-200 overflow-y-auto">
           <div className="flex justify-between items-center text-slate-300 mb-2">
            <h3 className="font-bold">Import Game</h3>
            <button onClick={() => setShowImport(false)} className="text-sm hover:text-white">Cancel</button>
          </div>
          <div className="flex gap-2 mb-3">
             <button onClick={() => setImportMode('text')} className={`flex-1 py-1 text-xs rounded border ${importMode === 'text' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>Paste PGN/FEN</button>
             <button onClick={() => setImportMode('lichess')} className={`flex-1 py-1 text-xs rounded border ${importMode === 'lichess' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>Lichess User</button>
          </div>
          {importMode === 'text' ? (
            <textarea className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-500 resize-none min-h-[150px]" placeholder="Paste PGN or FEN here..." value={importText} onChange={(e) => setImportText(e.target.value)}/>
          ) : (
            <div className="flex-1 flex flex-col gap-3">
               <input type="text" className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-amber-500 text-sm" placeholder="Lichess Username" value={lichessUsername} onChange={(e) => setLichessUsername(e.target.value)}/>
               <input type="number" min="1" max="100" className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-amber-500 text-sm" value={importCount} onChange={(e) => setImportCount(Number(e.target.value))}/>
            </div>
          )}
          <button onClick={handleImportSubmit} className="bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg font-bold transition-colors shadow-lg mt-2 shrink-0">{importMode === 'text' ? 'Load Text' : 'Fetch Games'}</button>
        </div>
      )}

      {/* Header */}
      <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between shrink-0">
        <div className={`font-semibold text-sm flex items-center gap-2 text-slate-200 truncate max-w-[150px]`}>
          <div className={`w-2 h-2 rounded-full ${gameState.turn === 'w' ? 'bg-slate-200' : 'bg-slate-900 border border-slate-500'}`}></div>
          {gameState.turn === 'w' ? "White's Turn" : "Black's Turn"}
        </div>
        <div className="flex gap-2">
           <button onClick={() => onStartTraining('recall')} className="text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors bg-amber-600 hover:bg-amber-500 text-white font-bold border border-amber-500"><Brain size={14} /><span className="hidden sm:inline">Train</span></button>
           <button onClick={() => onStartTraining('sparring', true)} className="text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors bg-indigo-600 hover:bg-indigo-500 text-white font-bold border border-indigo-500 shadow-sm"><Swords size={14} /><span className="hidden sm:inline">Spar</span></button>
           <button onClick={onToggleAnalysis} className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors border ${isAnalyzing ? 'bg-green-900/50 border-green-700 text-green-400' : 'bg-slate-700 border-transparent text-slate-300 hover:bg-slate-600'}`}><Cpu size={14} className={isAnalyzing ? 'animate-pulse' : ''} /><span className="hidden sm:inline">Engine</span></button>
           <button onClick={() => setShowImport(true)} className="text-xs flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition-colors"><Import size={12} /> <span className="hidden sm:inline">Import</span></button>
        </div>
      </div>

      {/* Engine Info */}
      {isAnalyzing && (
        <div className="bg-slate-950 p-2 border-b border-slate-800 text-xs font-mono shrink-0 max-h-[160px] overflow-y-auto min-h-[60px]">
           {Object.keys(analysisData).length > 0 ? (
             <div className="flex flex-col gap-2">
               {Object.entries(analysisData).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([key, data]: [string, EngineAnalysis]) => (
                   <div key={key} className={`flex flex-col gap-0.5 pb-2 border-b border-slate-800 last:border-0`}>
                     <div className="flex justify-between items-center"><span className="text-slate-500 flex items-center gap-2"><span className="w-4 h-4 bg-slate-800 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-400">{key}</span><span className="text-[10px]">depth {data.depth}</span></span><span className={`font-bold ${data.eval && data.eval > 0 ? 'text-green-400' : (data.eval && data.eval < 0 ? 'text-red-400' : 'text-slate-200')}`}>{data.mate ? `M${Math.abs(data.mate)}` : data.eval?.toFixed(2)}</span></div>
                     {data.continuationArr && <div className="text-slate-400 truncate pl-6"><span className="text-amber-600 font-bold mr-1 text-[10px]">{data.san}</span>{data.continuationArr.slice(1, 6).join(' ')}...</div>}
                   </div>
               ))}
             </div>
           ) : (<div className="text-slate-500 italic flex items-center justify-center gap-2 py-2 h-full"><Activity size={12} className="animate-spin text-amber-500" />Stockfish loading...</div>)}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/50 shrink-0 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('moves')} className={`flex-1 min-w-[70px] py-2 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'moves' ? 'border-amber-600 text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-400'}`}>Moves</button>
        <button onClick={() => setActiveTab('videos')} className={`flex-1 min-w-[70px] py-2 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'videos' ? 'border-amber-600 text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-400'}`}><Video size={12} /> Library</button>
        <button onClick={() => setActiveTab('explorer')} className={`flex-1 min-w-[70px] py-2 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'explorer' ? 'border-amber-600 text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-400'}`}><BookOpen size={12} /> Explorer</button>
        <button onClick={() => setActiveTab('strategy')} className={`flex-1 min-w-[70px] py-2 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'strategy' ? 'border-amber-600 text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-400'}`}><Lightbulb size={12} /> Strategy</button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col min-h-[300px]">
        {activeTab === 'moves' && (
          <div className="flex flex-col h-full">
             {/* VIEW TOGGLE TOOLBAR */}
             <div className="px-2 py-1.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0 sticky top-0 z-20">
                 <span className="text-[10px] font-bold text-slate-500 uppercase">Notation View</span>
                 <div className="flex bg-slate-950 rounded p-0.5 border border-slate-800">
                     <button 
                        onClick={() => setMovesViewMode('tree')} 
                        title="Tree View"
                        className={`p-1 rounded transition-colors ${movesViewMode === 'tree' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                         <LayoutList size={12} />
                     </button>
                     <button 
                        onClick={() => setMovesViewMode('sheet')} 
                        title="Score Sheet View"
                        className={`p-1 rounded transition-colors ${movesViewMode === 'sheet' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                         <AlignLeft size={12} />
                     </button>
                     <button 
                        onClick={() => setMovesViewMode('cards')} 
                        title="Card Grid View"
                        className={`p-1 rounded transition-colors ${movesViewMode === 'cards' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                         <Grid3X3 size={12} />
                     </button>
                 </div>
             </div>

             {/* SCROLLABLE CONTENT */}
             <div ref={historyRef} className="flex-1 overflow-y-auto p-4 leading-relaxed bg-slate-900/50">
                
                {/* 1. TREE VIEW */}
                {movesViewMode === 'tree' && (
                    startNodes.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 opacity-50"><div className="text-4xl">♔</div><div className="text-sm italic">Start moves to analyze</div></div>) : (
                    <div className="text-slate-300 text-sm">
                        {startNodes.map(node => (
                            <MoveTreeRenderer key={node.id} node={node} activeNodeId={currentNode?.id} onNavigate={onNavigate} onOpenGame={onViewGame} gamesFenSet={gamesFenSet} />
                        ))}
                    </div>)
                )}

                {/* 2. SHEET VIEW (NOW RECURSIVE) */}
                {movesViewMode === 'sheet' && (
                    startNodes.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 opacity-50">
                            <div className="text-4xl mb-2">♔</div>
                            <div className="text-xs italic">Start Position</div>
                        </div>
                    ) : (
                        <div className="p-4 text-sm leading-7 text-slate-300 font-serif">
                            {startNodes.map(node => (
                                <MoveSheetRecursive key={node.id} node={node} activeNodeId={currentNode?.id} onNavigate={onNavigate} isMainLine={true} />
                            ))}
                        </div>
                    )
                )}

                {/* 3. CARD GRID VIEW */}
                {movesViewMode === 'cards' && (
                    linearMovePath.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 opacity-50">
                            <div className="text-4xl mb-2">♔</div>
                            <div className="text-xs italic">Start Position</div>
                        </div>
                    ) : (
                        <MoveCardRenderer movePath={linearMovePath} activeNodeId={currentNode?.id} onNavigate={onNavigate} gamesFenSet={gamesFenSet} onOpenGame={onViewGame} />
                    )
                )}

             </div>

             {/* CONTEXTUAL MOVES SECTION (Updated Logic) */}
             <div className="shrink-0 bg-slate-950 border-t border-slate-800 text-xs flex flex-col shadow-[0_-5px_15px_rgba(0,0,0,0.5)] z-20 max-h-[350px] overflow-y-auto pb-6">
                <div className="flex flex-col gap-2 p-3">
                    
                    {/* Main Line & Variations (Children of Current Node) */}
                    {(mainLineMove || variationMoves.length > 0) && (
                        <div className="flex flex-col gap-2 border-b border-slate-800/50 pb-2 mb-1">
                            {mainLineMove && (
                                <div className="flex items-center gap-2">
                                    <div className="text-[10px] uppercase text-emerald-500 font-bold flex items-center gap-1 shrink-0 bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-900/50 w-24 justify-center">
                                        <CornerDownRight size={10} /> Main Line
                                    </div>
                                    <button onClick={() => onNavigate(mainLineMove)} className="px-4 py-1.5 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-700/50 hover:border-emerald-500 text-emerald-100 font-bold rounded-full transition-all shadow-sm flex items-center gap-1 group">
                                        {mainLineMove.san}
                                        {mainLineMove.comment && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover:animate-pulse"></span>}
                                    </button>
                                </div>
                            )}
                            
                            {variationMoves.length > 0 && (
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                                    <div className="text-[10px] uppercase text-amber-500 font-bold flex items-center gap-1 shrink-0 px-1.5 py-0.5 w-24 justify-center">
                                        <Split size={10} /> Variations
                                    </div>
                                    <div className="flex gap-2">
                                        {variationMoves.map(v => (
                                            <button key={v.id} onClick={() => onNavigate(v)} className="px-3 py-1 bg-amber-900/20 hover:bg-amber-900/40 border border-amber-700/50 hover:border-amber-500 text-amber-200 hover:text-amber-100 rounded-full transition-all whitespace-nowrap shadow-sm font-medium text-[11px]">
                                                {v.san}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Siblings (Alternates to Current Move) */}
                    {siblings.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
                            <div className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1 shrink-0 px-1.5 py-0.5 w-24 justify-center">
                                <GitBranch size={10} /> Alts to this
                            </div>
                            <div className="flex gap-2">
                                {siblings.map(sib => (
                                    <button key={sib.id} onClick={() => onNavigate(sib)} className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 rounded-full transition-all whitespace-nowrap shadow-sm text-[11px]">
                                        {sib.san}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Games Section (Anchored and Illustrative) */}
                {anchoredGames.length > 0 && (
                    <div className="px-3 pb-2 animate-in fade-in slide-in-from-right-2">
                        <div className="text-[10px] font-bold text-amber-500 uppercase mb-2 flex items-center gap-1 px-1">
                            <Paperclip size={10} /> Attached Games ({anchoredGames.length})
                        </div>
                        <div className="flex flex-col gap-2">
                            {anchoredGames.map(game => (
                                <div 
                                    key={game.id}
                                    onClick={() => onViewGame({
                                        id: game.id,
                                        pgn: game.pgn,
                                        white: game.white_name,
                                        black: game.black_name,
                                        result: game.result,
                                        date: game.date
                                    })}
                                    className="bg-amber-900/10 hover:bg-amber-900/20 border border-amber-600/30 hover:border-amber-500 rounded p-2 cursor-pointer transition-all group relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col gap-0.5 max-w-[85%]">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shadow-sm" />
                                                <span className="font-bold text-slate-200 truncate text-[11px]">{game.white_name}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 border border-slate-500 shadow-sm" />
                                                <span className="font-bold text-slate-300 truncate text-[11px]">{game.black_name}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${game.result === '1-0' ? 'bg-green-900/30 text-green-400' : (game.result === '0-1' ? 'bg-red-900/30 text-red-400' : 'bg-slate-800 text-slate-400')}`}>
                                                {game.result}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-1 flex justify-between items-center">
                                        <span className="text-[9px] text-amber-500/70 font-mono flex items-center gap-1"><Database size={8}/> Anchored</span>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setGameToDeleteId(game.id);
                                            }}
                                            className="p-1 hover:bg-red-900/20 rounded text-slate-600 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {pathMatchingGames.length > 0 && (
                    <div className="px-3 pt-2 pb-4 border-t border-slate-800/50">
                        <button 
                            onClick={() => setIsGamesListOpen(!isGamesListOpen)}
                            className="w-full flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase mb-2 px-1 hover:text-slate-300 transition-colors"
                        >
                            <span className="flex items-center gap-1"><Database size={10} /> Illustrative Games ({pathMatchingGames.length})</span>
                            {isGamesListOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                        
                        {isGamesListOpen && (
                            <div className="flex flex-col gap-2 animate-in slide-in-from-top-2 fade-in">
                                {pathMatchingGames.map(game => (
                                    <div 
                                        key={game.id}
                                        onClick={() => onViewGame({
                                            id: game.id,
                                            pgn: game.pgn,
                                            white: game.white_name,
                                            black: game.black_name,
                                            result: game.result,
                                            date: game.date
                                        })}
                                        className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 rounded p-2 cursor-pointer transition-all group relative overflow-hidden"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col gap-0.5 max-w-[85%]">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shadow-sm" />
                                                    <span className="font-bold text-slate-300 truncate text-[11px]">{game.white_name}</span>
                                                    <span className="text-[9px] text-slate-500">{game.white_rating}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600 border border-slate-500 shadow-sm" />
                                                    <span className="font-bold text-slate-400 truncate text-[11px]">{game.black_name}</span>
                                                    <span className="text-[9px] text-slate-600">{game.black_rating}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${game.result === '1-0' ? 'bg-green-900/30 text-green-400' : (game.result === '0-1' ? 'bg-red-900/30 text-red-400' : 'bg-slate-800 text-slate-400')}`}>
                                                    {game.result}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-2 flex justify-between items-center pt-1 border-t border-slate-800/50">
                                            <div className="flex items-center gap-1 text-[9px] text-slate-600 font-mono">
                                                <Calendar size={8} /> {game.date}
                                            </div>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setGameToDeleteId(game.id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-900/20 rounded text-slate-600 hover:text-red-400"
                                                title="Remove Game"
                                            >
                                                <Trash2 size={10} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
             </div>
          </div>
        )}

        {/* --- VIDEO LIBRARY TAB --- */}
        {activeTab === 'videos' && (
            <div className="flex flex-col h-full overflow-hidden">
                {/* Add Video Section */}
                <div className="p-4 bg-slate-900/80 border-b border-slate-800">
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Add to Library</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Video className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input 
                                type="text"
                                placeholder="Paste YouTube URL..."
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:border-amber-500 outline-none"
                            />
                        </div>
                        <button 
                            onClick={handleAddVideo}
                            disabled={!videoUrl || addingVideo}
                            className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1 disabled:opacity-50 transition-colors"
                        >
                            {addingVideo ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
                        </button>
                    </div>

                    {/* Filter Bar */}
                    <div className="mt-3 flex items-center justify-between">
                        <button 
                            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors border ${showFavoritesOnly ? 'bg-yellow-900/30 border-yellow-500/50 text-yellow-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
                        >
                            <Star size={12} className={showFavoritesOnly ? 'fill-current' : ''} /> 
                            {showFavoritesOnly ? 'Favorites Only' : 'Show All'}
                        </button>
                        <span className="text-[10px] text-slate-500 font-mono">
                            {filteredVideos.length} Video{filteredVideos.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {/* Video Grid */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-950/50">
                    {!currentRepertoire?.video_gallery || currentRepertoire.video_gallery.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                            <Video size={48} className="mb-2" />
                            <span className="text-sm">No videos in this repertoire.</span>
                            <span className="text-xs mt-1">Paste a YouTube link above to start.</span>
                        </div>
                    ) : filteredVideos.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                            <Star size={48} className="mb-2" />
                            <span className="text-sm">No favorite videos found.</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredVideos.map(video => (
                                <div key={video.id} className="group bg-slate-900 border border-slate-800 hover:border-amber-600/50 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all relative">
                                    <div 
                                        className="relative aspect-video cursor-pointer"
                                        onClick={() => setPlayVideo(video)}
                                    >
                                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/0 transition-colors">
                                            <div className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                                                <Play size={20} className="text-white fill-current ml-0.5" />
                                            </div>
                                        </div>
                                        
                                        {/* Favorite Toggle Overlay */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleToggleFavorite(video.id); }}
                                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm text-slate-300 hover:text-yellow-400 transition-colors z-20"
                                            title={video.isFavorite ? "Unfavorite" : "Favorite"}
                                        >
                                            <Star size={14} className={video.isFavorite ? "fill-yellow-400 text-yellow-400" : ""} />
                                        </button>
                                    </div>
                                    <div className="p-3 relative">
                                        <h4 className="text-xs font-bold text-slate-200 line-clamp-2 leading-tight mb-2 group-hover:text-amber-500 transition-colors pr-6">
                                            {video.title}
                                        </h4>
                                        <div className="flex justify-between items-center relative z-10">
                                            <a 
                                                href={video.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-[10px] text-slate-500 hover:text-white flex items-center gap-1"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Open <ExternalLink size={10} />
                                            </a>
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    handleDeleteVideo(video.id); 
                                                }}
                                                className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-900/10 rounded transition-colors z-20"
                                                title="Remove Video"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'explorer' && (
          <div className="flex-1 overflow-y-auto">
             <OpeningExplorer 
                data={explorerData} 
                loading={isExplorerLoading} 
                onMoveClick={onExplorerMove} 
                onLoadMasterGame={onLoadMasterGame}
                settings={explorerSettings}
                onUpdateSettings={onUpdateExplorerSettings}
             />
          </div>
        )}

        {/* --- STRATEGY TAB --- */}
        {activeTab === 'strategy' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Toggle Visual Mode */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex justify-between items-center shadow-md">
                    <div>
                        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                            <Layers size={16} className="text-indigo-400" />
                            Pawn Skeleton View
                        </h3>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">Isolate pawn structure for clarity.</p>
                    </div>
                    <button 
                        onClick={onTogglePawnStructure}
                        className={`relative w-12 h-6 rounded-full transition-colors ${pawnStructureMode ? 'bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)]' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${pawnStructureMode ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* Analysis Report */}
                {strategyReport ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                         {/* Center Control Card */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10"><Activity size={64} /></div>
                            <div className="flex items-center gap-2 mb-2 relative z-10">
                                <Activity size={16} className="text-blue-400" />
                                <span className="text-xs font-bold uppercase text-blue-200 tracking-wide">Center Control</span>
                            </div>
                            <div className="text-2xl font-black text-white mb-2 relative z-10">{strategyReport.centerControl}</div>
                            <div className="text-xs text-slate-300 leading-relaxed font-medium relative z-10 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50 backdrop-blur-sm">
                                {strategyReport.centerControl === 'Open' ? 'Tactics prevail! Bishops are often superior due to long diagonals.' : 
                                 strategyReport.centerControl === 'Locked' ? 'Positional grind. Knights are superior for maneuvering.' : 
                                 'Dynamic & flexible. Control key squares before launching attacks.'}
                            </div>
                        </div>

                        {/* Pawn Structures Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* White Structure */}
                            <div className="bg-slate-900 border border-slate-800 border-t-4 border-t-slate-300 rounded-xl p-3 shadow-md">
                                <h4 className="text-xs font-bold text-slate-300 mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-slate-200 rounded-full"></span> White Structure
                                </h4>
                                <div className="space-y-2">
                                    {strategyReport.white.passed.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase w-full">Passed</span>
                                            {strategyReport.white.passed.map(sq => (
                                                <span key={sq} className="px-2 py-1 bg-emerald-500 text-slate-900 border border-emerald-400 rounded text-xs font-bold shadow-sm">{sq}</span>
                                            ))}
                                        </div>
                                    )}
                                    {strategyReport.white.isolated.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase w-full">Isolated</span>
                                            {strategyReport.white.isolated.map(f => (
                                                <span key={f} className="px-2 py-1 bg-rose-500 text-white border border-rose-600 rounded text-xs font-bold uppercase shadow-sm">{f}-file</span>
                                            ))}
                                        </div>
                                    )}
                                    {strategyReport.white.passed.length === 0 && strategyReport.white.isolated.length === 0 && (
                                        <div className="mt-2 py-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg flex flex-col items-center justify-center">
                                            <ShieldCheck size={24} className="text-emerald-400 mb-1" />
                                            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Solid Structure</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Black Structure */}
                            <div className="bg-slate-900 border border-slate-800 border-t-4 border-t-slate-600 rounded-xl p-3 shadow-md">
                                <h4 className="text-xs font-bold text-slate-300 mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-slate-600 rounded-full border border-slate-500"></span> Black Structure
                                </h4>
                                <div className="space-y-2">
                                    {strategyReport.black.passed.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase w-full">Passed</span>
                                            {strategyReport.black.passed.map(sq => (
                                                <span key={sq} className="px-2 py-1 bg-emerald-500 text-slate-900 border border-emerald-400 rounded text-xs font-bold shadow-sm">{sq}</span>
                                            ))}
                                        </div>
                                    )}
                                    {strategyReport.black.isolated.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase w-full">Isolated</span>
                                            {strategyReport.black.isolated.map(f => (
                                                <span key={f} className="px-2 py-1 bg-rose-500 text-white border border-rose-600 rounded text-xs font-bold uppercase shadow-sm">{f}-file</span>
                                            ))}
                                        </div>
                                    )}
                                    {strategyReport.black.passed.length === 0 && strategyReport.black.isolated.length === 0 && (
                                        <div className="mt-2 py-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg flex flex-col items-center justify-center">
                                            <ShieldCheck size={24} className="text-emerald-400 mb-1" />
                                            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Solid Structure</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center p-8 text-slate-500">
                        <Loader2 className="animate-spin" />
                    </div>
                )}
            </div>
        )}

      </div>

      {/* Footer Controls */}
      <div className="bg-slate-800 border-t border-slate-700 p-2 shrink-0 z-10">
         <div className="flex items-center justify-center gap-1 mb-2">
            <button onClick={() => onNavigate(null)} disabled={!currentNode} className="p-2 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30"><ChevronsLeft size={20} /></button>
            <button onClick={() => onNavigate(currentNode?.parent || null)} disabled={!currentNode} className="p-2 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30"><ChevronLeft size={20} /></button>
            <button 
              onClick={() => {
                if (currentNode && currentNode.children.length > 0) onNavigate(currentNode.children[0]);
                else if (!currentNode && startNodes.length > 0) onNavigate(startNodes[0]);
              }}
              disabled={currentNode ? currentNode.children.length === 0 : startNodes.length === 0}
              className="p-2 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30"
            ><ChevronRight size={20} /></button>
            <button 
              onClick={() => {
                  let next = currentNode ? currentNode.children[0] : startNodes[0];
                  while(next) {
                      if (next.children.length > 0) next = next.children[0];
                      else break;
                  }
                  if (next) onNavigate(next);
              }}
              disabled={currentNode ? currentNode.children.length === 0 : startNodes.length === 0}
              className="p-2 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30"
            ><ChevronsRight size={20} /></button>
         </div>

        <div className="grid grid-cols-4 gap-2">
          <button onClick={onReset} className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
            <RotateCcw size={16} className="mb-1" /><span className="text-[10px] uppercase font-bold tracking-wider">Reset</span>
          </button>
          <button onClick={onFlip} className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
            <Repeat size={16} className="mb-1" /><span className="text-[10px] uppercase font-bold tracking-wider">Flip</span>
          </button>
          <button onClick={onCopyFen} className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
            <Copy size={16} className="mb-1" /><span className="text-[10px] uppercase font-bold tracking-wider">FEN</span>
          </button>
          <button 
            onClick={(e) => {
                e.stopPropagation();
                if (currentNode && currentNode.parent) setShowDeleteConfirm(true);
            }} 
            disabled={!currentNode || !currentNode.parent}
            title={!currentNode || !currentNode.parent ? "Cannot delete start position" : "Delete Move (DEL)"}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 border border-red-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} className="mb-1" /><span className="text-[10px] uppercase font-bold tracking-wider">Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;