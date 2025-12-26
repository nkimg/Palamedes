import React, { useState, useEffect } from 'react';
import { Brain, Swords, Target, Calendar, BarChart3, Search, User, Play, ChevronRight, Zap, Shield, FileText, Plus, Database, AlertCircle, BookOpen, X, Archive, RefreshCw, Trash2, Layers, CheckCircle, Lightbulb, Activity, Grid, PauseCircle, Shuffle, Repeat } from 'lucide-react';
import { TrainingMode, UserStats, EngineAnalysis, OpponentStats, PreparationDossier, Repertoire, DrillSettings } from '../types';
import { analyzeOpponentStats } from '../lichessClient';
import { supabase } from '../supabaseClient';
import { ECO_CODES, EcoCode } from '../ecoCodes';
import PreparationDashboard from './PreparationDashboard';

interface TrainingHubProps {
  // Pass-through props for the Active Training Panel
  isTrainingActive: boolean;
  onStartSession: (mode: TrainingMode, repertoire?: Repertoire, savedState?: any, drillSettings?: DrillSettings) => void;
  onExit?: () => void; 
  userStats: UserStats;
  dueCount: number; // This might be global or specific depending on context
  
  // Prep props
  repertoireColor?: 'white' | 'black'; 
  
  // Context Props (New)
  repertoires?: Repertoire[]; // List of available repertoires
  currentRepertoireId?: string; // If we are already inside a repertoire
}

const TrainingHub: React.FC<TrainingHubProps> = ({ 
    isTrainingActive, 
    onStartSession, 
    onExit,
    userStats, 
    dueCount,
    repertoireColor,
    repertoires = [],
    currentRepertoireId
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'prep'>('dashboard');
    const [prepView, setPrepView] = useState<'active' | 'archived'>('active');
    
    // Selection State
    const [selectedRep, setSelectedRep] = useState<Repertoire | null>(null);
    const [savedSession, setSavedSession] = useState<any | null>(null);
    
    // Drill Setup Modal
    const [showDrillSetup, setShowDrillSetup] = useState(false);
    const [drillSettings, setDrillSettings] = useState<DrillSettings>({
        mode: 'random',
        color: 'white',
        loop: false
    });

    // Detailed Dashboard State
    const [selectedDossier, setSelectedDossier] = useState<PreparationDossier | null>(null);

    // --- PREPARATION STATE ---
    const [scoutMode, setScoutMode] = useState<'opponent' | 'opening'>('opponent');
    const [opponentName, setOpponentName] = useState('');
    const [openingName, setOpeningName] = useState('');
    const [ecoCode, setEcoCode] = useState('');
    const [pgnInput, setPgnInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredEco, setFilteredEco] = useState<EcoCode[]>([]);
    const [scouting, setScouting] = useState(false);
    const [scoutResult, setScoutResult] = useState<OpponentStats | null>(null);
    const [preparations, setPreparations] = useState<PreparationDossier[]>([]);
    const [loadingPreps, setLoadingPreps] = useState(false);
    const [creationSuccess, setCreationSuccess] = useState<string | null>(null);

    // Initialize: If currentRepertoireId provided, find it and select it
    useEffect(() => {
        if (currentRepertoireId && repertoires.length > 0) {
            const found = repertoires.find(r => r.id === currentRepertoireId);
            if (found) {
                setSelectedRep(found);
                setDrillSettings(prev => ({ ...prev, color: found.color }));
                checkSavedSession(found.id);
            }
        }
    }, [currentRepertoireId, repertoires]);

    // Check for saved session when a rep is selected
    const checkSavedSession = (repId: string) => {
        try {
            const saved = localStorage.getItem(`training_session_${repId}`);
            if (saved) {
                setSavedSession(JSON.parse(saved));
            } else {
                setSavedSession(null);
            }
        } catch (e) { console.error(e); }
    };

    const handleRepertoireClick = (rep: Repertoire) => {
        setSelectedRep(rep);
        setDrillSettings(prev => ({ ...prev, color: rep.color }));
        checkSavedSession(rep.id);
    };

    const handleBackToRepList = () => {
        setSelectedRep(null);
        setSavedSession(null);
    };

    const handleStartDrill = () => {
        setShowDrillSetup(false);
        onStartSession('recall', selectedRep!, undefined, drillSettings);
    };

    // --- EFFECT: Fetch Dossiers ---
    useEffect(() => {
        if (activeTab === 'prep') {
            fetchDossiers();
        }
    }, [activeTab]);

    // --- EFFECT: ECO Filtering ---
    useEffect(() => {
        if (openingName.length > 1 && scoutMode === 'opening') {
            const term = openingName.toLowerCase();
            const matches = ECO_CODES.filter(eco => 
                eco.name.toLowerCase().includes(term) || 
                eco.code.toLowerCase().includes(term)
            ).slice(0, 5);
            setFilteredEco(matches);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    }, [openingName, scoutMode]);

    const fetchDossiers = async () => {
        setLoadingPreps(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) return;

            const { data, error } = await supabase
                .from('dossiers')
                .select('*')
                .eq('user_id', sessionData.session.user.id)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error("Database Error:", error);
                throw error;
            }
            
            const mapped: PreparationDossier[] = (data || []).map((d: any) => ({
                id: d.id,
                user_id: d.user_id,
                title: d.title,
                type: d.type,
                isArchived: d.is_archived,
                readiness: d.readiness || 'New',
                lastUpdated: new Date(d.updated_at).toLocaleDateString(),
                targetLinesCount: d.target_lines_count || 0,
                opponentName: d.opponent_name,
                openingName: d.opening_name,
                ecoCode: d.eco_code,
                pgn: d.pgn_content
            }));

            setPreparations(mapped);
        } catch (e: any) {
            console.error("Error fetching dossiers:", e);
            if (e.code === 'PGRST205' || e.message?.includes('not find the table')) {
                // Friendly warning to developer/user
                alert("Please create the 'dossiers' table in your Supabase database using the SQL provided.");
            }
        } finally {
            setLoadingPreps(false);
        }
    };

    const handleSelectEco = (eco: EcoCode) => {
        setOpeningName(eco.name);
        setEcoCode(eco.code);
        setPgnInput(eco.moves); // Pre-fill basic moves
        setShowSuggestions(false);
    };

    const handleScoutOpponent = async () => {
        if (!opponentName) return;
        setScouting(true);
        try {
            const stats = await analyzeOpponentStats(opponentName);
            setScoutResult(stats);
        } catch (e) {
            console.error(e);
        } finally {
            setScouting(false);
        }
    };

    const handleCreateOpeningPrep = async () => {
        if (!openingName) return;
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) return;

        const newPrepPayload = {
            user_id: sessionData.session.user.id,
            title: `Vs. ${openingName} ${ecoCode ? `(${ecoCode})` : ''}`,
            type: 'opening',
            is_archived: false,
            readiness: 'New',
            target_lines_count: 0,
            opening_name: openingName,
            eco_code: ecoCode,
            pgn_content: pgnInput
        };

        try {
            const { data, error } = await supabase
                .from('dossiers')
                .insert([newPrepPayload])
                .select()
                .single();

            if (error) throw error;
            
            const newPrep: PreparationDossier = {
                id: data.id,
                user_id: data.user_id,
                title: data.title,
                type: 'opening',
                isArchived: false,
                readiness: 'New',
                lastUpdated: 'Just now',
                targetLinesCount: 0,
                openingName: data.opening_name,
                ecoCode: data.eco_code,
                pgn: data.pgn_content
            };

            setPreparations([newPrep, ...preparations]);
            setCreationSuccess("Preparation Dossier Created!");
            setTimeout(() => setCreationSuccess(null), 3000);
            
            // Reset fields
            setOpeningName('');
            setEcoCode('');
            setPgnInput('');

        } catch (e: any) {
            console.error("Creation error:", e);
            alert("Failed to save dossier. Check database schema.");
        }
    };

    const createPrepFromScout = async () => {
        if (!scoutResult) return;
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) return;

        const newPrepPayload = {
            user_id: sessionData.session.user.id,
            title: `Vs. ${scoutResult.username}`,
            type: 'opponent',
            is_archived: false,
            readiness: 'New',
            target_lines_count: 0,
            opponent_name: scoutResult.username
        };

        try {
            const { data, error } = await supabase
                .from('dossiers')
                .insert([newPrepPayload])
                .select()
                .single();

            if (error) throw error;

             const newPrep: PreparationDossier = {
                id: data.id,
                user_id: data.user_id,
                title: data.title,
                type: 'opponent',
                isArchived: false,
                readiness: 'New',
                lastUpdated: 'Just now',
                targetLinesCount: 0,
                opponentName: data.opponent_name
            };
            setPreparations([newPrep, ...preparations]);
            setScoutResult(null);
            setOpponentName('');
            setCreationSuccess(`Prepared vs ${scoutResult.username}!`);
            setTimeout(() => setCreationSuccess(null), 3000);
        } catch (e) {
            console.error(e);
            alert("Failed to create prep. Check database schema.");
        }
    };

    const toggleArchiveStatus = async (dossier: PreparationDossier) => {
        try {
            const newStatus = !dossier.isArchived;
            const { error } = await supabase
                .from('dossiers')
                .update({ is_archived: newStatus })
                .eq('id', dossier.id);

            if (error) throw error;

            setPreparations(prev => prev.map(p => 
                p.id === dossier.id ? { ...p, isArchived: newStatus } : p
            ));
        } catch (e) {
            console.error("Update failed", e);
        }
    };

    const handleDeleteDossier = async (id: string) => {
        if(!confirm("Delete this dossier permanently?")) return;
        try {
            const { error } = await supabase.from('dossiers').delete().eq('id', id);
            if (error) throw error;
            setPreparations(prev => prev.filter(p => p.id !== id));
        } catch(e) {
            console.error("Delete failed", e);
        }
    };

    // Filter Logic
    const activePreps = preparations.filter(p => !p.isArchived);
    const archivedPreps = preparations.filter(p => p.isArchived);
    const displayedPreps = prepView === 'active' ? activePreps : archivedPreps;

    // Filter Active Repertoires for Selection List
    const activeRepertoires = repertoires; 

    if (isTrainingActive) return null; // Logic handled by parent to switch to Active Panel

    return (
        <>
            {/* RENDER DETAILED DASHBOARD IF SELECTED */}
            {selectedDossier && (
                <PreparationDashboard 
                    dossier={selectedDossier} 
                    onClose={() => setSelectedDossier(null)} 
                />
            )}

            {/* DRILL SETUP MODAL */}
            {showDrillSetup && (
                <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-sm w-full p-6">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Brain className="text-amber-500" /> Drill Configuration
                        </h3>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Play As</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setDrillSettings(s => ({ ...s, color: 'white' }))}
                                        className={`p-3 rounded-lg border font-bold flex items-center justify-center gap-2 transition-all ${drillSettings.color === 'white' ? 'bg-slate-200 text-slate-900 border-white' : 'bg-transparent text-slate-400 border-slate-700'}`}
                                    >
                                        <span className="w-3 h-3 bg-slate-200 rounded-full border border-slate-400"></span> White
                                    </button>
                                    <button 
                                        onClick={() => setDrillSettings(s => ({ ...s, color: 'black' }))}
                                        className={`p-3 rounded-lg border font-bold flex items-center justify-center gap-2 transition-all ${drillSettings.color === 'black' ? 'bg-slate-950 text-white border-black ring-1 ring-slate-700' : 'bg-transparent text-slate-400 border-slate-700'}`}
                                    >
                                        <span className="w-3 h-3 bg-slate-900 rounded-full border border-slate-600"></span> Black
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Drill Mode</label>
                                <div className="space-y-2">
                                    <button 
                                        onClick={() => setDrillSettings(s => ({ ...s, mode: 'random' }))}
                                        className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-all ${drillSettings.mode === 'random' ? 'bg-amber-900/20 border-amber-600 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Shuffle size={18} className={drillSettings.mode === 'random' ? 'text-amber-500' : ''} />
                                            <div>
                                                <div className="font-bold text-sm">Random Lines</div>
                                                <div className="text-[10px] opacity-70">Practice random branches from the repertoire</div>
                                            </div>
                                        </div>
                                        {drillSettings.mode === 'random' && <CheckCircle size={16} className="text-amber-500" />}
                                    </button>

                                    <button 
                                        onClick={() => setDrillSettings(s => ({ ...s, mode: 'spaced_repetition' }))}
                                        className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-all ${drillSettings.mode === 'spaced_repetition' ? 'bg-amber-900/20 border-amber-600 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Repeat size={18} className={drillSettings.mode === 'spaced_repetition' ? 'text-amber-500' : ''} />
                                            <div>
                                                <div className="font-bold text-sm">Spaced Repetition</div>
                                                <div className="text-[10px] opacity-70">Prioritize lines you struggle with (SRS)</div>
                                            </div>
                                        </div>
                                        {drillSettings.mode === 'spaced_repetition' && <CheckCircle size={16} className="text-amber-500" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button 
                                onClick={() => setShowDrillSetup(false)}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleStartDrill}
                                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
                            >
                                Start Drill <Play size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col h-full bg-slate-900 rounded-xl shadow-xl overflow-hidden border border-slate-800 relative">
                
                {creationSuccess && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-xl z-50 flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-2 fade-in">
                        <CheckCircle size={14} /> {creationSuccess}
                    </div>
                )}

                {/* HUB HEADER */}
                <div className="p-6 bg-slate-800 border-b border-slate-700">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Target className="text-amber-500" /> Training Center
                            </h2>
                            <p className="text-slate-400 text-xs mt-1">
                                {selectedRep ? `Training: ${selectedRep.name}` : "Professional regimes for serious improvement."}
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700">
                                <div className="text-right">
                                    <div className="text-[10px] uppercase text-slate-500 font-bold">Current Level</div>
                                    <div className="text-sm font-bold text-amber-500">Lvl {userStats.level}</div>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center">
                                    <Brain size={16} className="text-slate-300" />
                                </div>
                            </div>

                            {/* CLOSE BUTTON */}
                            {onExit && (
                                <button 
                                    onClick={onExit}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                                    title="Exit Training & Return to Notation"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* TABS */}
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'dashboard' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                            <BarChart3 size={16} /> Regimes
                        </button>
                        <button 
                            onClick={() => setActiveTab('prep')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'prep' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                            <FileText size={16} /> Preparation
                        </button>
                    </div>
                </div>

                {/* TAB CONTENT */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950/50">
                    
                    {/* --- DASHBOARD (REGIMES) TAB --- */}
                    {activeTab === 'dashboard' && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-300 h-full">
                            
                            {/* VIEW 1: REPERTOIRE SELECTION (If not selected) */}
                            {!selectedRep && (
                                <div className="h-full flex flex-col">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <BookOpen size={18} className="text-slate-400" /> Select Repertoire to Train
                                    </h3>
                                    {activeRepertoires.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
                                            <p>No active repertoires found.</p>
                                            <p className="text-xs mt-1">Create one in the dashboard.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {activeRepertoires.map(rep => (
                                                <button 
                                                    key={rep.id}
                                                    onClick={() => handleRepertoireClick(rep)}
                                                    className="group text-left bg-slate-900 border border-slate-800 hover:border-amber-600/50 p-4 rounded-xl transition-all hover:shadow-lg relative overflow-hidden"
                                                >
                                                    <div className={`absolute top-0 left-0 w-1 h-full ${rep.color === 'white' ? 'bg-slate-200' : 'bg-slate-950 border-r border-slate-800'}`} />
                                                    <div className="pl-3">
                                                        <h4 className="font-bold text-slate-200 group-hover:text-amber-500 transition-colors">{rep.name}</h4>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                                                {rep.color}
                                                            </span>
                                                            <span className="text-[10px] text-slate-500">
                                                                Created {new Date(rep.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* VIEW 2: REGIMES (If selected) */}
                            {selectedRep && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <button onClick={handleBackToRepList} className="text-xs text-slate-500 hover:text-white underline">All Repertoires</button>
                                        <span className="text-slate-600">/</span>
                                        <span className="text-xs text-amber-500 font-bold">{selectedRep.name}</span>
                                    </div>

                                    {/* RESUME SESSION CARD */}
                                    {savedSession && (
                                        <div className="bg-gradient-to-r from-slate-900 to-indigo-900/20 border border-indigo-500/50 rounded-xl p-4 flex justify-between items-center animate-in slide-in-from-top-2">
                                            <div>
                                                <h4 className="font-bold text-indigo-100 flex items-center gap-2">
                                                    <PauseCircle size={18} className="text-indigo-400" /> Resume Session
                                                </h4>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Continue your <strong>{savedSession.mode}</strong> training from where you left off.
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => onStartSession(savedSession.mode, selectedRep, savedSession)}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs shadow-lg transition-colors"
                                            >
                                                Resume
                                            </button>
                                        </div>
                                    )}

                                    {/* REGIME 1: OPENING DRILL MODE (Replaces SRS) */}
                                    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg group hover:border-amber-600/50 transition-colors">
                                        <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 flex justify-between items-center">
                                            <div>
                                                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                                    <Brain size={20} className="text-amber-500" /> Opening Drill Mode
                                                </h3>
                                                <p className="text-xs text-slate-400 mt-1">Practice your lines strictly. Mistakes are instant errors.</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl font-bold text-white block">{dueCount}</span>
                                                <span className="text-[10px] text-amber-500 uppercase font-bold">Moves Due</span>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-slate-900/50">
                                            <button 
                                                onClick={() => setShowDrillSetup(true)}
                                                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg transform hover:scale-[1.01]"
                                            >
                                                <Play size={16} /> Configure & Start Drill
                                            </button>
                                        </div>
                                    </div>

                                    {/* REGIME 2: PRACTICE (SMART SPARRING) */}
                                    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg group hover:border-indigo-500/50 transition-colors">
                                        <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-indigo-950/30 flex justify-between items-center">
                                            <div>
                                                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                                    <Swords size={20} className="text-indigo-400" /> Smart Sparring
                                                </h3>
                                                <p className="text-xs text-slate-400 mt-1">Play from random positions in your repertoire.</p>
                                            </div>
                                            <div className="bg-indigo-900/20 px-3 py-1 rounded-full border border-indigo-500/30">
                                                <span className="text-[10px] text-indigo-300 font-bold uppercase flex items-center gap-1">
                                                    <Activity size={10} /> Tolerance Training
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-slate-900/50 flex gap-3">
                                            <button 
                                                onClick={() => onStartSession('sparring', selectedRep)}
                                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg transform hover:scale-[1.01]"
                                            >
                                                <Swords size={16} /> Practice Lines
                                            </button>
                                        </div>
                                    </div>
                                    
                                </div>
                            )}

                        </div>
                    )}

                    {/* --- PREPARATION TAB --- */}
                    {activeTab === 'prep' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Scout Card */}
                            <div className="bg-indigo-950/20 rounded-xl border border-indigo-500/30 p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-indigo-100 text-sm flex items-center gap-2">
                                        <Search size={14} /> Scout & Prepare
                                    </h3>
                                    {/* Mode Toggle */}
                                    <div className="flex bg-slate-900 rounded p-0.5 border border-slate-700">
                                        <button 
                                            onClick={() => setScoutMode('opponent')}
                                            className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-colors ${scoutMode === 'opponent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                        >
                                            <User size={10} /> Opponent
                                        </button>
                                        <button 
                                            onClick={() => setScoutMode('opening')}
                                            className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-colors ${scoutMode === 'opening' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                        >
                                            <BookOpen size={10} /> Opening
                                        </button>
                                    </div>
                                </div>

                                {/* Opponent Input Mode */}
                                {scoutMode === 'opponent' && (
                                    <div className="animate-in fade-in duration-200">
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                                <input 
                                                    type="text" 
                                                    value={opponentName}
                                                    onChange={(e) => setOpponentName(e.target.value)}
                                                    placeholder="Lichess Username..." 
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:border-indigo-500 outline-none"
                                                />
                                            </div>
                                            <button 
                                                onClick={handleScoutOpponent}
                                                disabled={scouting || !opponentName}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors"
                                            >
                                                {scouting ? 'Scouting...' : 'Analyze'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Opening Input Mode */}
                                {scoutMode === 'opening' && (
                                    <div className="animate-in fade-in duration-200 flex flex-col gap-2 relative">
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                                <input 
                                                    type="text" 
                                                    value={openingName}
                                                    onChange={(e) => setOpeningName(e.target.value)}
                                                    placeholder="Opening Name (e.g. Caro-Kann or B90)..." 
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:border-indigo-500 outline-none"
                                                />
                                                {/* Autocomplete Dropdown */}
                                                {showSuggestions && filteredEco.length > 0 && (
                                                    <div className="absolute top-full left-0 w-full bg-slate-800 border border-slate-700 rounded-lg mt-1 z-50 shadow-xl overflow-hidden">
                                                        {filteredEco.map((eco) => (
                                                            <button 
                                                                key={eco.code + eco.name}
                                                                onClick={() => handleSelectEco(eco)}
                                                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 flex justify-between items-center group"
                                                            >
                                                                <span className="text-slate-200 font-bold">{eco.name}</span>
                                                                <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded font-mono group-hover:text-white transition-colors">{eco.code}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="relative w-24">
                                                <input 
                                                    type="text" 
                                                    value={ecoCode}
                                                    onChange={(e) => setEcoCode(e.target.value)}
                                                    placeholder="ECO" 
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:border-indigo-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                        
                                        <textarea 
                                            value={pgnInput}
                                            onChange={(e) => setPgnInput(e.target.value)}
                                            placeholder="(Optional) Paste PGN game/lines here..."
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 focus:border-indigo-500 outline-none resize-none h-16 font-mono"
                                        />

                                        <div className="flex justify-end">
                                            <button 
                                                onClick={handleCreateOpeningPrep}
                                                disabled={!openingName}
                                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1 shadow-lg"
                                            >
                                                <Plus size={12} /> Create Dossier
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Scout Result (Opponent Mode) */}
                                {scoutResult && scoutMode === 'opponent' && (
                                    <div className="mt-4 bg-slate-900 rounded-lg p-3 border border-slate-700 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="text-sm font-bold text-white">{scoutResult.username}</div>
                                                <div className="text-[10px] text-slate-400">{scoutResult.playStyle} Style • {scoutResult.winRate}% Win Rate</div>
                                            </div>
                                            <button onClick={createPrepFromScout} className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-bold flex items-center gap-1">
                                                <Plus size={10} /> Create Prep
                                            </button>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-bold text-slate-500 uppercase">Frequent Openings</div>
                                            {scoutResult.topOpenings.map((op, i) => (
                                                <div key={i} className="flex justify-between items-center text-xs text-slate-300">
                                                    <span className="truncate max-w-[150px]">{op.name}</span>
                                                    <span className="font-mono text-slate-500">{op.count} games</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 2. Active Preparations List */}
                            <div>
                                <div className="flex justify-between items-end mb-3 border-b border-slate-800 pb-2">
                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => setPrepView('active')}
                                            className={`text-xs font-bold pb-2 border-b-2 transition-colors flex items-center gap-2 ${prepView === 'active' ? 'text-white border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                                        >
                                            Active Dossiers <span className="bg-slate-800 px-1.5 rounded-full text-[9px]">{activePreps.length}</span>
                                        </button>
                                        <button 
                                            onClick={() => setPrepView('archived')}
                                            className={`text-xs font-bold pb-2 border-b-2 transition-colors flex items-center gap-2 ${prepView === 'archived' ? 'text-white border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                                        >
                                            Archived <span className="bg-slate-800 px-1.5 rounded-full text-[9px]">{archivedPreps.length}</span>
                                        </button>
                                    </div>
                                </div>
                                
                                {loadingPreps ? (
                                    <div className="text-center py-8 text-slate-500 text-xs animate-pulse">Loading Dossiers...</div>
                                ) : displayedPreps.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500 text-xs italic border border-dashed border-slate-800 rounded-lg">
                                        {prepView === 'active' ? 'No active preparations. Create one above!' : 'No archived dossiers.'}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {displayedPreps.map(prep => (
                                            <div key={prep.id} className="bg-slate-900 border border-slate-800 p-3 rounded-lg hover:border-indigo-500/50 transition-colors group relative">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex items-center gap-2">
                                                        {prep.type === 'opponent' ? (
                                                            <User size={14} className="text-indigo-500" />
                                                        ) : (
                                                            <Layers size={14} className="text-emerald-500" />
                                                        )}
                                                        <span className="font-bold text-sm text-slate-200 group-hover:text-indigo-400 transition-colors">
                                                            {prep.title}
                                                        </span>
                                                    </div>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${prep.readiness === 'Ready' ? 'bg-green-900/30 text-green-400' : 'bg-amber-900/30 text-amber-400'}`}>
                                                        {prep.readiness}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex justify-between items-end mt-2">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="text-[10px] text-slate-500">Updated {prep.lastUpdated}</div>
                                                        {prep.ecoCode && <div className="text-[9px] font-mono text-slate-600 border border-slate-800 px-1 rounded inline-block bg-slate-950 w-fit">{prep.ecoCode}</div>}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => toggleArchiveStatus(prep)}
                                                            className="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-white"
                                                            title={prep.isArchived ? "Restore" : "Archive"}
                                                        >
                                                            {prep.isArchived ? <RefreshCw size={12} /> : <Archive size={12} />}
                                                        </button>
                                                        
                                                        {prep.isArchived && (
                                                            <button 
                                                                onClick={() => handleDeleteDossier(prep.id)}
                                                                className="p-1.5 hover:bg-red-900/20 rounded text-slate-500 hover:text-red-400"
                                                                title="Delete Permanently"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}

                                                        <button 
                                                            onClick={() => setSelectedDossier(prep)}
                                                            className="text-[10px] flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 px-2 py-1 rounded transition-all ml-1 border border-slate-700 hover:border-indigo-500"
                                                        >
                                                            Open <ChevronRight size={10} />
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

                </div>
            </div>
        </>
    );
};

export default TrainingHub;