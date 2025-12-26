import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Repertoire } from '../types';
import { Plus, BookOpen, Trash2, LogOut, Layout, Library as LibraryIcon, X, ArrowRight, ArrowLeft, Settings, Info, GraduationCap, PenTool, Search, Filter, Target, Swords, User, Brain } from 'lucide-react';
import OpeningLibrary from './OpeningLibrary';
import PreparationCenter from './PreparationCenter';
import PersonalityProfile from './PersonalityProfile';
import { EcoCode } from '../ecoCodes';
import { Chess } from 'chess.js';
import Board from './Board';

interface DashboardProps {
  onSelectRepertoire: (rep: Repertoire) => void;
  onOpenTraining: () => void;
}

// --- SETTINGS MODAL ---
const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
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

// --- ABOUT SESHAT MODAL ---
const AboutModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[150] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
                 {/* Header */}
                 <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900 sticky top-0 z-10">
                     <div>
                         <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                             <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center shadow-lg">
                                 <BookOpen size={18} className="text-white" />
                             </div>
                             Seshat Chess
                         </h2>
                         <p className="text-xs text-amber-500 font-bold uppercase tracking-widest mt-2 ml-1">Research Artifact</p>
                     </div>
                     <button onClick={onClose} className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors"><X size={24} /></button>
                 </div>

                 {/* Scrollable Content */}
                 <div className="overflow-y-auto p-6 space-y-8 text-slate-300 leading-relaxed custom-scrollbar">
                     
                     {/* Mythology Section */}
                     <section className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                         <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                             <GraduationCap size={18} className="text-indigo-400" /> The Mistress of Books
                         </h3>
                         <p className="text-sm mb-4">
                             <strong>Seshat</strong> is the ancient Egyptian goddess of writing, accounting, historical record, and the measurement of time. Known as the "Mistress of Books" and the divine scribe, she was responsible for recording decrees, military campaigns, and the duration of reigns. Unlike Thoth, who embodies intellect and language itself, Seshat represents the <strong>concrete act of recording, classifying, and preserving</strong>. Her symbol, the seven-pointed star, represents the ordering of chaos through precise marking.
                         </p>
                         <p className="text-sm">
                             In the context of chess, Seshat speaks to <strong>repertoire preparation as a practice of continuous archiving</strong>. A serious repertoire is not just a choice of openings, but a living system of records: tested variations, corrections, model games, and abandoned lines.
                         </p>
                         <p className="text-sm mt-3 border-t border-slate-700/50 pt-3 italic text-slate-400">
                             "The player who does not record loses memory; the one who does not review loses historical coherence."
                         </p>
                     </section>

                     {/* Research Context */}
                     <section>
                         <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-800 pb-1">Philosophy & Design</h3>
                         <div className="space-y-4 text-sm">
                             <p>
                                 Seshat Chess transforms scattered study into <strong>structured memory</strong>. It serves as an "archive of chess thought," allowing users to trace the evolution of their repertoire over time—what was kept, what was discarded, and why.
                             </p>
                             <p>
                                 <strong>Seshat Chess</strong> is an <strong>experimental research and design project</strong> developed by <strong>Ephraim Ferreira Medeiros</strong>, UX Designer.
                             </p>
                             <ul className="list-disc pl-5 space-y-1 text-slate-400">
                                 <li>Cognition-driven UX</li>
                                 <li>Memory systems (Spaced Repetition)</li>
                                 <li>Interaction design for expert users</li>
                                 <li>Systematic data-assisted preparation</li>
                             </ul>
                         </div>
                     </section>

                     {/* Author Profile */}
                     <section className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row gap-6 items-start">
                         <div className="flex-1">
                             <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                <PenTool size={16} className="text-emerald-500" /> Ephraim Ferreira Medeiros
                             </h3>
                             <p className="text-xs text-emerald-500 font-bold uppercase tracking-wide mb-4">UX Designer & Research-Driven Product Designer</p>
                             
                             <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Specializations & Formal Training</h4>
                             <ul className="space-y-2 text-xs text-slate-400">
                                 <li className="flex justify-between border-b border-slate-800/50 pb-1">
                                     <span>User Experience Research and Design</span>
                                     <span className="text-slate-500">University of Michigan</span>
                                 </li>
                                 <li className="flex justify-between border-b border-slate-800/50 pb-1">
                                     <span>Google UX Design</span>
                                     <span className="text-slate-500">Google</span>
                                 </li>
                                 <li className="flex justify-between border-b border-slate-800/50 pb-1">
                                     <span>Machine Learning</span>
                                     <span className="text-slate-500">DeepLearning.AI · Stanford University</span>
                                 </li>
                                 <li className="flex justify-between border-b border-slate-800/50 pb-1">
                                     <span>AI for Good</span>
                                     <span className="text-slate-500">DeepLearning.AI</span>
                                 </li>
                                 <li className="flex justify-between pt-1">
                                     <span>Interaction Design</span>
                                     <span className="text-slate-500">University of California, San Diego</span>
                                 </li>
                             </ul>
                         </div>
                     </section>
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

const Dashboard: React.FC<DashboardProps> = ({ onSelectRepertoire, onOpenTraining }) => {
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newRepName, setNewRepName] = useState('');
  const [newRepColor, setNewRepColor] = useState<'white' | 'black'>('white');
  const [userEmail, setUserEmail] = useState<string | undefined>('');
  
  const [activeTab, setActiveTab] = useState<'repertoires' | 'library' | 'preparation' | 'personality'>('repertoires');

  // Settings & About
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // Library Preview State
  const [previewOpening, setPreviewOpening] = useState<EcoCode | null>(null);

  useEffect(() => {
    fetchRepertoires();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email));
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

  // If in Preparation Mode
  if (activeTab === 'preparation') {
      return <PreparationCenter onBack={() => setActiveTab('repertoires')} />;
  }

  // If in Personality Mode
  if (activeTab === 'personality') {
      return (
          <div className="h-screen w-full relative">
              <button 
                  onClick={() => setActiveTab('repertoires')}
                  className="absolute top-6 left-6 z-50 text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold uppercase tracking-wider bg-slate-900/50 p-2 rounded-lg backdrop-blur-sm"
              >
                  <ArrowLeft size={16} /> Dashboard
              </button>
              <PersonalityProfile />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 flex flex-col md:flex-row">
      
      {/* Modals */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

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
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center shadow-lg">
                      <BookOpen size={18} className="text-white" />
                  </div>
                  Seshat Chess
              </h1>
              <p className="text-slate-500 text-[10px] mt-2 truncate font-mono uppercase tracking-widest pl-1">
                  Systematic Prep
              </p>
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
                  onClick={() => setActiveTab('preparation')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'preparation' ? 'bg-slate-800 text-white shadow-md border border-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
              >
                  <Swords size={18} /> Preparation
              </button>
              <button 
                  onClick={() => setActiveTab('personality')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'personality' ? 'bg-slate-800 text-white shadow-md border border-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
              >
                  <Brain size={18} /> My Personality
              </button>
              <button 
                  onClick={onOpenTraining}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-amber-500 hover:text-amber-400 hover:bg-amber-900/10"
              >
                  <Target size={18} /> Training Center
              </button>
              
              <div className="pt-4 mt-4 border-t border-slate-800 space-y-1">
                   <button 
                      onClick={() => setShowSettings(true)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-slate-400 hover:text-white hover:bg-slate-800/50"
                  >
                      <Settings size={18} /> Settings
                  </button>
                  <button 
                      onClick={() => setShowAbout(true)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-indigo-400 hover:text-white hover:bg-indigo-900/20"
                  >
                      <Info size={18} /> About Seshat
                  </button>
              </div>
          </div>

          <div className="p-4 border-t border-slate-800">
              <div className="text-[10px] text-slate-600 mb-2 px-1 truncate">{userEmail}</div>
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
                                    className="group bg-slate-900 border border-slate-800 hover:border-amber-600/50 rounded-xl cursor-pointer transition-all hover:shadow-lg relative overflow-hidden flex"
                                >
                                    {/* Updated Visual Highlight Section - Now wider and distinct */}
                                    <div className={`w-24 sm:w-28 flex items-center justify-center shrink-0 ${rep.color === 'white' ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900' : 'bg-gradient-to-br from-slate-950 to-slate-800 text-slate-200 border-r border-slate-700'}`}>
                                        <BookOpen size={32} className="opacity-80" />
                                    </div>
                                    
                                    <div className="p-5 flex-1 flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-200 group-hover:text-amber-500 transition-colors">{rep.name}</h3>
                                            <div className="flex gap-2 text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">
                                                <span>{rep.color}</span> • <span>{new Date(rep.created_at).toLocaleDateString()}</span>
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