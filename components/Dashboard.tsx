import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Repertoire, UserStats, TrainingMode } from '../types';
import { Plus, BookOpen, Trash2, LogOut, Target, Layout, Library as LibraryIcon, X, Check, ArrowRight, Settings, Mic } from 'lucide-react';
import TrainingHub from './TrainingHub';
import OpeningLibrary from './OpeningLibrary';
import { EcoCode } from '../ecoCodes';
import { Chess } from 'chess.js';
import Board from './Board';

interface DashboardProps {
  onSelectRepertoire: (rep: Repertoire) => void;
  onStartTrainingSession?: (rep: Repertoire, mode: TrainingMode, savedState?: any) => void;
  onEnterCoachMode: () => void; // Kept for interface compatibility but disabled
  userStats: UserStats;
}

// --- SETTINGS MODAL ---
const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    // Basic settings could go here in future
    return (
        <div className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6 relative">
                 <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
                 
                 <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                     <Settings size={20} className="text-indigo-400" /> Settings
                 </h2>
                 <p className="text-xs text-slate-400 mb-6">Configure your application preferences.</p>

                 <div className="text-sm text-slate-500 italic">
                     No settings available currently.
                 </div>

                 <div className="mt-8 flex justify-end">
                     <button 
                         onClick={onClose}
                         className="px-6 py-2 rounded-lg font-bold text-sm bg-slate-700 hover:bg-slate-600 text-white"
                     >
                         Close
                     </button>
                 </div>
            </div>
        </div>
    );
};


// --- OPENING PREVIEW MODAL ---
const OpeningPreviewModal: React.FC<{
    eco: EcoCode | null;
    onClose: () => void;
    onCreateRepertoire: (eco: EcoCode, name: string, color: 'white' | 'black') => void;
}> = ({ eco, onClose, onCreateRepertoire }) => {
    const [name, setName] = useState('');
    const [color, setColor] = useState<'white'|'black'>('white');
    const [game] = useState(new Chess());
    
    useEffect(() => {
        if (eco) {
            setName(eco.name);
            try {
                const temp = new Chess();
                temp.loadPgn(eco.moves);
                game.loadPgn(eco.moves);
            } catch (e) {
                console.warn("Failed to load opening preview", e);
            }
        }
    }, [eco]);

    if (!eco) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden my-8">
                
                {/* Left: Board Preview */}
                <div className="p-6 bg-slate-950/50 flex flex-col items-center justify-center border-r border-slate-800 w-full md:w-1/2">
                    <div className="w-full max-w-[350px] aspect-square pointer-events-none">
                         <Board 
                            game={game}
                            orientation={color} 
                            selectedSquare={null}
                            validMoves={[]}
                            lastMove={null}
                            onSquareClick={() => {}}
                            inCheck={false}
                            bestMove={null}
                            winChance={null}
                         />
                    </div>
                    <div className="mt-4 text-center">
                        <div className="text-xl font-bold text-white mb-1">{eco.code}</div>
                        <div className="text-sm text-slate-400 font-mono">{eco.moves}</div>
                    </div>
                </div>

                {/* Right: Config & Create */}
                <div className="p-6 flex flex-col w-full md:w-1/2 bg-slate-900">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-2xl font-bold text-white">Create Repertoire</h2>
                        <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={24} /></button>
                    </div>

                    <div className="space-y-6 flex-1">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Repertoire Name</label>
                            <input 
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Your Color</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => setColor('white')}
                                    className={`p-3 rounded-lg border font-bold flex items-center justify-center gap-2 transition-all ${color === 'white' ? 'bg-slate-200 text-slate-900 border-white' : 'bg-transparent text-slate-400 border-slate-700'}`}
                                >
                                    <span className="w-3 h-3 bg-slate-200 rounded-full border border-slate-400"></span> White
                                </button>
                                <button 
                                    onClick={() => setColor('black')}
                                    className={`p-3 rounded-lg border font-bold flex items-center justify-center gap-2 transition-all ${color === 'black' ? 'bg-slate-950 text-white border-black ring-1 ring-slate-700' : 'bg-transparent text-slate-400 border-slate-700'}`}
                                >
                                    <span className="w-3 h-3 bg-slate-900 rounded-full border border-slate-600"></span> Black
                                </button>
                            </div>
                        </div>

                        <div className="bg-amber-900/20 border border-amber-900/50 p-4 rounded-lg text-xs text-amber-200/80 leading-relaxed">
                            This will create a new repertoire named <strong>"{name}"</strong> and automatically import the main line moves for <strong>{eco.name}</strong> as your starting point.
                        </div>
                    </div>

                    <button 
                        onClick={() => onCreateRepertoire(eco, name, color)}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white py-4 rounded-lg font-bold text-sm shadow-lg flex items-center justify-center gap-2 mt-6 transition-transform active:scale-[0.98]"
                    >
                        Create Repertoire <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ onSelectRepertoire, onStartTrainingSession, onEnterCoachMode, userStats }) => {
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newRepName, setNewRepName] = useState('');
  const [newRepColor, setNewRepColor] = useState<'white' | 'black'>('white');
  const [userEmail, setUserEmail] = useState<string | undefined>('');
  
  const [activeTab, setActiveTab] = useState<'repertoires' | 'training' | 'library'>('repertoires');
  const [globalDueCount, setGlobalDueCount] = useState(0);

  // Settings
  const [showSettings, setShowSettings] = useState(false);

  // Library Preview State
  const [previewOpening, setPreviewOpening] = useState<EcoCode | null>(null);

  useEffect(() => {
    fetchRepertoires();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email));
    
    // Simple fetch for total due moves count
    const fetchGlobalDue = async () => {
        try {
            const today = new Date().toISOString();
            const { count, error } = await supabase
                .from('moves')
                .select('*', { count: 'exact', head: true })
                .lte('next_review_at', today);
            
            if (!error && count !== null) {
                setGlobalDueCount(count);
            }
        } catch(e) { console.error(e); }
    };
    fetchGlobalDue();
  }, []);

  const fetchRepertoires = async () => {
    try {
      const { data, error } = await supabase
        .from('repertoires')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRepertoires(data || []);
    } catch (error) {
      console.error('Error fetching repertoires:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRepertoire = async () => {
    if (!newRepName.trim()) return;
    
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { data, error } = await supabase
        .from('repertoires')
        .insert([{
          user_id: user.id,
          name: newRepName,
          color: newRepColor
        }])
        .select()
        .single();

      if (error) throw error;

      setRepertoires([data, ...repertoires]);
      setIsCreating(false);
      setNewRepName('');
    } catch (error) {
      console.error('Error creating repertoire:', error);
    }
  };

  const createRepertoireFromOpening = async (eco: EcoCode, name: string, color: 'white' | 'black') => {
      try {
          const user = (await supabase.auth.getUser()).data.user;
          if (!user) return;

          // 1. Create Repertoire
          const { data: repData, error: repError } = await supabase
            .from('repertoires')
            .insert([{
                user_id: user.id,
                name: name,
                color: color
            }])
            .select()
            .single();
          
          if (repError) throw repError;
          
          // 2. Parse Moves & Insert recursively
          const tempGame = new Chess();
          tempGame.loadPgn(eco.moves);
          const history = tempGame.history({ verbose: true });
          
          let parentId: string | null = null; 
          let replayGame = new Chess();
          
          for (let i = 0; i < history.length; i++) {
              const move = history[i];
              replayGame.move(move);
              
              const payload = {
                  repertoire_id: repData.id,
                  fen: replayGame.fen(),
                  san: move.san,
                  uci: move.from + move.to + (move.promotion || ''),
                  parent_id: parentId,
                  move_number: i % 2 === 0 ? (Math.floor(i/2) + 1) : (Math.floor(i/2) + 1),
                  color: move.color,
                  comment: i === history.length - 1 ? `Main line: ${eco.name}` : '' 
              };

              const { data: moveData, error: moveError } = await supabase
                .from('moves')
                .insert([payload])
                .select()
                .single();
              
              if (moveError) {
                  console.error("Failed to insert move", moveError);
                  break; 
              }
              parentId = moveData.id;
          }

          setRepertoires([repData, ...repertoires]);
          setPreviewOpening(null);
          alert(`Repertoire "${name}" created successfully!`);
          
      } catch (err) {
          console.error("Failed to create from opening", err);
          alert("Error creating repertoire.");
      }
  };

  const deleteRepertoire = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure? This will delete all moves in this repertoire.')) return;

    try {
      const { error } = await supabase.from('repertoires').delete().eq('id', id);
      if (error) throw error;
      setRepertoires(repertoires.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting repertoire:', error);
    }
  };

  const handleSignOut = () => supabase.auth.signOut();

  const handleHubSessionStart = (mode: TrainingMode, rep?: Repertoire, savedState?: any) => {
      if (!rep) {
          alert("Please select a repertoire first.");
          return;
      }
      if (onStartTrainingSession) {
          onStartTrainingSession(rep, mode, savedState);
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 flex flex-col md:flex-row">
      
      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {previewOpening && (
          <OpeningPreviewModal 
             eco={previewOpening} 
             onClose={() => setPreviewOpening(null)} 
             onCreateRepertoire={createRepertoireFromOpening}
          />
      )}

      {/* SIDEBAR NAVIGATION - Sticky on desktop */}
      <div className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0 md:sticky md:top-0 md:h-screen z-10">
          <div className="p-6 border-b border-slate-800">
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center shadow-lg">
                      <BookOpen size={18} className="text-white" />
                  </div>
                  Chess Vibe
              </h1>
              <p className="text-slate-500 text-xs mt-2 truncate">{userEmail}</p>
          </div>

          <div className="flex-1 p-4 space-y-2 overflow-y-auto">
              <button 
                  onClick={() => setActiveTab('repertoires')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'repertoires' ? 'bg-slate-800 text-white shadow-md border border-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
              >
                  <Layout size={18} /> Repertoires
              </button>
              <button 
                  onClick={() => setActiveTab('library')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'library' ? 'bg-slate-800 text-white shadow-md border border-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
              >
                  <LibraryIcon size={18} /> Opening Library
              </button>
              <button 
                  onClick={() => setActiveTab('training')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'training' ? 'bg-slate-800 text-white shadow-md border border-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
              >
                  <Target size={18} /> Training Center
                  {globalDueCount > 0 && (
                      <span className="ml-auto bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{globalDueCount}</span>
                  )}
              </button>
              
              <div className="pt-4 mt-4 border-t border-slate-800">
                   <button 
                      onClick={() => setShowSettings(true)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-slate-400 hover:text-white hover:bg-slate-800/50"
                  >
                      <Settings size={18} /> Settings
                  </button>
              </div>
          </div>

          <div className="p-4 border-t border-slate-800">
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2 bg-slate-950 hover:bg-red-900/20 text-slate-400 hover:text-red-400 rounded-lg text-sm transition-colors border border-slate-800 hover:border-red-900/50"
              >
                <LogOut size={16} /> Sign Out
              </button>
          </div>
      </div>

      {/* MAIN CONTENT - Allow body scroll (Removed overflow-hidden and internal scroll) */}
      <div className="flex-1 p-6 md:p-12 min-h-screen">
        <div className="max-w-6xl mx-auto">
            
            {activeTab === 'repertoires' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-bold text-white">Your Repertoires</h2>
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm shadow-lg transition-colors"
                        >
                            <Plus size={16} /> New Repertoire
                        </button>
                    </div>

                    {isCreating && (
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-8 animate-in fade-in slide-in-from-top-2 shadow-xl">
                            <h3 className="font-bold text-white mb-4">Create Repertoire</h3>
                            <div className="flex flex-col md:flex-row gap-4">
                                <input 
                                    type="text" 
                                    placeholder="Repertoire Name (e.g., White - Sicilian)" 
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:border-amber-500 outline-none text-white"
                                    value={newRepName}
                                    onChange={(e) => setNewRepName(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setNewRepColor('white')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold border ${newRepColor === 'white' ? 'bg-slate-200 text-slate-900 border-slate-200' : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500'}`}
                                    >White</button>
                                    <button 
                                        onClick={() => setNewRepColor('black')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold border ${newRepColor === 'black' ? 'bg-slate-800 text-white border-black' : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500'}`}
                                    >Black</button>
                                </div>
                                <button 
                                    onClick={createRepertoire}
                                    disabled={!newRepName.trim()}
                                    className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                >Create</button>
                                <button 
                                    onClick={() => setIsCreating(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white"
                                >Cancel</button>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center text-slate-500 py-12">Loading repertoires...</div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {repertoires.map(rep => (
                                <div 
                                    key={rep.id}
                                    onClick={() => onSelectRepertoire(rep)}
                                    className="group bg-slate-900 border border-slate-800 hover:border-amber-600/50 p-5 rounded-xl cursor-pointer transition-all hover:shadow-lg relative overflow-hidden"
                                >
                                    <div className={`absolute top-0 left-0 w-1 h-full ${rep.color === 'white' ? 'bg-slate-200' : 'bg-slate-950 border-r border-slate-800'}`} />
                                    <div className="flex justify-between items-start pl-3">
                                        <div className="flex items-start gap-3">
                                            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-amber-600">
                                                <BookOpen size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-200 group-hover:text-amber-500 transition-colors">{rep.name}</h3>
                                                <div className="flex gap-2 text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">
                                                    <span>{rep.color}</span> • <span>{new Date(rep.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => deleteRepertoire(e, rep.id)}
                                            className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-900/10 rounded-lg transition-colors z-10"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {repertoires.length === 0 && !loading && (
                                <div className="col-span-full text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500">
                                    No repertoires found. Create one to start building!
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'training' && (
                <div className="h-full">
                    {/* Render TrainingHub in 'Global' mode with Repertoires context */}
                    <TrainingHub 
                        isTrainingActive={false} 
                        onStartSession={handleHubSessionStart}
                        userStats={userStats}
                        dueCount={globalDueCount}
                        repertoires={repertoires} // Pass active repertoires to Hub
                        repertoireColor="white" 
                    />
                </div>
            )}

            {activeTab === 'library' && (
                <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-white mb-2">Opening Library</h2>
                        <p className="text-slate-400 text-sm">Explore standard openings and add them to your repertoire.</p>
                    </div>
                    <div className="flex-1 min-h-[500px]">
                        <OpeningLibrary onPreview={(eco) => setPreviewOpening(eco)} />
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default Dashboard;