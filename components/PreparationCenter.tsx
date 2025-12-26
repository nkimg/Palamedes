import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Dossier, Repertoire, OpponentStats } from '../types';
import { analyzeOpponentStats, TimeControlFilter } from '../lichessClient';
import { generateOpponentReport } from '../geminiService';
import { Search, Archive, Trash2, Plus, Loader2, FileText, User, Swords, ArrowRight, Layout, AlertCircle, Clock, Database, AlertTriangle, Brain, Lightbulb, ClipboardList, Target, Crown, Shield } from 'lucide-react';

interface PreparationCenterProps {
    onBack: () => void;
}

// --- PARSER TYPES ---
interface ReportSection {
    title: string;
    content: string[]; // Raw lines or paragraphs
    type: 'profile' | 'analysis' | 'crosscheck' | 'lines' | 'action' | 'general';
}

// --- HELPER: Parse Markdown to Structured Data ---
const parseReport = (markdown: string): ReportSection[] => {
    if (!markdown) return [];

    const lines = markdown.split('\n');
    const sections: ReportSection[] = [];
    let currentSection: ReportSection | null = null;

    const detectType = (title: string): ReportSection['type'] => {
        const t = title.toLowerCase();
        if (t.includes('psychological') || t.includes('profile')) return 'profile';
        if (t.includes('opening analysis') || t.includes('structure')) return 'analysis';
        if (t.includes('cross-check') || t.includes('repertoire')) return 'crosscheck';
        if (t.includes('suggested lines') || t.includes('critical')) return 'lines';
        if (t.includes('action plan') || t.includes('summary')) return 'action';
        return 'general';
    };

    lines.forEach(line => {
        const cleanLine = line.trim();
        
        // Detect Headers (### or ## or #)
        if (cleanLine.startsWith('#')) {
            if (currentSection) {
                sections.push(currentSection);
            }
            const title = cleanLine.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
            currentSection = {
                title,
                content: [],
                type: detectType(title)
            };
        } else if (cleanLine.length > 0) {
            if (currentSection) {
                currentSection.content.push(cleanLine);
            } else {
                // Content before first header
                currentSection = {
                    title: 'Overview',
                    content: [cleanLine],
                    type: 'general'
                };
            }
        }
    });

    if (currentSection) sections.push(currentSection);
    return sections;
};

// --- HELPER: Rich Text Renderer ---
// Converts **bold**, *bullets*, and $moves$ into React Elements
const RichTextRenderer: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
    // 1. Handle Bullet Points
    const isBullet = text.startsWith('* ') || text.startsWith('- ');
    let cleanText = isBullet ? text.substring(2) : text;

    // 2. Split by Tokens to handle **bold** and $move$
    // Regex matches: (**text**) OR ($text$)
    const parts = cleanText.split(/(\*\*.*?\*\*|\$.*?\$)/g);

    return (
        <div className={`${className} ${isBullet ? 'flex gap-2 mb-2' : 'mb-3'}`}>
            {isBullet && <span className="text-amber-500 mt-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" />}
            <p className="leading-relaxed text-slate-300">
                {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
                    }
                    if (part.startsWith('$') && part.endsWith('$')) {
                        return (
                            <span key={i} className="mx-1 px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-xs font-bold border border-slate-700 shadow-sm inline-block">
                                {part.slice(1, -1)}
                            </span>
                        );
                    }
                    return <span key={i}>{part}</span>;
                })}
            </p>
        </div>
    );
};

const PreparationCenter: React.FC<PreparationCenterProps> = ({ onBack }) => {
    const [dossiers, setDossiers] = useState<Dossier[]>([]);
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
    const [loading, setLoading] = useState(true);
    
    // Creation State
    const [showCreate, setShowCreate] = useState(false);
    const [targetUsername, setTargetUsername] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);
    
    // Filters & Progress
    const [timeControl, setTimeControl] = useState<TimeControlFilter>('blitz');
    const [sampleSize, setSampleSize] = useState<number | 'all'>(200);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Confirmation for "All Games"
    const [showAllGamesConfirm, setShowAllGamesConfirm] = useState(false);

    // Confirmation for Deletion
    const [dossierToDelete, setDossierToDelete] = useState<string | null>(null);

    // Selected Dossier View
    const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
    // User Data for AI Context
    const [userRepertoires, setUserRepertoires] = useState<Repertoire[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            // Fetch Dossiers
            const { data: dossData, error: dossError } = await supabase
                .from('dossiers')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (dossError) throw dossError;
            setDossiers(dossData || []);

            // Fetch Repertoires (for AI context)
            const { data: repData } = await supabase
                .from('repertoires')
                .select('*')
                .eq('user_id', user.id);
            
            setUserRepertoires(repData || []);

        } catch (e) {
            console.error("Error fetching data", e);
        } finally {
            setLoading(false);
        }
    };

    const initiateDossierCreation = () => {
        if (!targetUsername.trim()) return;
        setCreateError(null);
        
        if (sampleSize === 'all') {
            setShowAllGamesConfirm(true);
        } else {
            processDossier();
        }
    };

    const processDossier = async () => {
        setShowAllGamesConfirm(false);
        setIsProcessing(true);
        setDownloadProgress(0);
        setStatusMessage('Initializing Connection to Lichess...');
        setCreateError(null);

        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error("No user");

            // 1. Analyze Lichess Data (Streaming)
            const stats = await analyzeOpponentStats(
                targetUsername, 
                sampleSize, 
                timeControl,
                (count) => {
                    setDownloadProgress(count);
                    setStatusMessage(`Downloaded ${count} games...`);
                }
            );

            if (!stats || stats.totalGames === 0) {
                setCreateError(`No games found for "${targetUsername}" in ${timeControl} time control. Please check the username or try a different filter.`);
                setIsProcessing(false);
                setStatusMessage('');
                return;
            }

            // Warning for partial data
            if (typeof sampleSize === 'number' && stats.totalGames < sampleSize) {
                alert(`Warning: Only found ${stats.totalGames} games available (requested ${sampleSize}). Analysis will proceed with the available data.`);
            }

            setStatusMessage('Analyzing Patterns & Generating AI Report...');

            // 2. Generate AI Report
            const report = await generateOpponentReport(stats, userRepertoires);

            // 3. Save to DB
            const { data, error } = await supabase
                .from('dossiers')
                .insert([{
                    user_id: user.id,
                    opponent_username: stats.username,
                    status: 'active',
                    stats: stats,
                    report: report
                }])
                .select()
                .single();

            if (error) throw error;

            setDossiers([data, ...dossiers]);
            setShowCreate(false);
            setTargetUsername('');
            setCreateError(null);
            setSelectedDossier(data); // Auto-open

        } catch (e: any) {
            console.error("Creation failed", e);
            setCreateError("Failed to create dossier: " + e.message);
        } finally {
            setIsProcessing(false);
            setStatusMessage('');
        }
    };

    const toggleArchive = async (dossier: Dossier) => {
        const newStatus = dossier.status === 'active' ? 'archived' : 'active';
        setDossiers(prev => prev.map(d => d.id === dossier.id ? { ...d, status: newStatus } : d));
        if (selectedDossier?.id === dossier.id) {
             setSelectedDossier(prev => prev ? { ...prev, status: newStatus } : null);
        }
        await supabase.from('dossiers').update({ status: newStatus }).eq('id', dossier.id);
    };

    const confirmDeleteDossier = async () => {
        if (!dossierToDelete) return;
        
        const id = dossierToDelete;
        setDossiers(prev => prev.filter(d => d.id !== id));
        if (selectedDossier?.id === id) setSelectedDossier(null);
        
        setDossierToDelete(null); // Close modal immediately for UX
        
        try {
            const { error } = await supabase.from('dossiers').delete().eq('id', id);
            if (error) throw error;
        } catch(e) {
            console.error("Failed to delete from DB", e);
            alert("Failed to delete from database. Please refresh.");
        }
    };

    // Memoize the parsed report so we don't re-parse on every render
    const parsedReport = useMemo(() => {
        if (!selectedDossier) return [];
        return parseReport(selectedDossier.report);
    }, [selectedDossier?.id, selectedDossier?.report]);

    const filteredDossiers = dossiers.filter(d => d.status === activeTab);
    const archivedCount = dossiers.filter(d => d.status === 'archived').length;

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans flex flex-col h-screen overflow-hidden">
            
            {/* --- DELETE CONFIRMATION MODAL --- */}
            {dossierToDelete && (
                <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-sm w-full p-6 transform scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4 text-red-500">
                            <div className="p-3 bg-red-900/20 rounded-full">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white">Delete Dossier?</h3>
                        </div>
                        
                        <p className="text-slate-400 mb-6 leading-relaxed text-sm">
                            Are you sure you want to delete this dossier? This action will permanently remove the strategic report and analysis stats from the database.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setDossierToDelete(null)}
                                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors font-bold text-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDeleteDossier}
                                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 font-bold text-sm flex items-center gap-2"
                            >
                                <Trash2 size={16} /> Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE MODAL --- */}
            {showCreate && (
                <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full p-6 relative">
                        {isProcessing ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-4">
                                <div className="relative">
                                    <Loader2 className="animate-spin text-amber-500" size={48} />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-white mb-1">{statusMessage}</h3>
                                    <p className="text-sm text-slate-400">Please wait, compiling intelligence...</p>
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden max-w-xs mt-2">
                                    <div className="h-full bg-amber-500 animate-pulse w-full"></div>
                                </div>
                                {downloadProgress > 0 && (
                                    <span className="text-xs font-mono text-amber-500">{downloadProgress} games analyzed</span>
                                )}
                            </div>
                        ) : showAllGamesConfirm ? (
                            <div className="animate-in zoom-in-95">
                                <div className="flex items-center gap-2 text-amber-500 mb-4">
                                    <AlertTriangle size={24} />
                                    <h3 className="text-lg font-bold">Massive Data Warning</h3>
                                </div>
                                <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                                    You are about to download <strong>ALL</strong> games for this user. 
                                    Depending on their history, this could involve tens of thousands of games and 
                                    take several minutes to process.
                                </p>
                                <p className="text-slate-400 text-xs mb-6 bg-slate-800 p-3 rounded border border-slate-700">
                                    Note: Palamedes uses stream processing to handle this load, but ensure you have a stable connection.
                                </p>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={processDossier}
                                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg"
                                    >
                                        I Understand, Proceed
                                    </button>
                                    <button 
                                        onClick={() => setShowAllGamesConfirm(false)}
                                        className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Swords size={20} className="text-amber-500" /> Compile New Dossier
                                </h2>

                                {createError && (
                                    <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                        <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                                        <div>
                                            <h3 className="text-sm font-bold text-red-200">Unable to Proceed</h3>
                                            <p className="text-xs text-red-300/80 mt-1 leading-relaxed">{createError}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-5">
                                    {/* Username Input */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Opponent Username</label>
                                        <input 
                                            type="text" 
                                            autoFocus
                                            value={targetUsername}
                                            onChange={(e) => setTargetUsername(e.target.value)}
                                            placeholder="e.g. MagnusCarlsen"
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none"
                                        />
                                    </div>

                                    {/* Filters Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Time Control */}
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-2 flex items-center gap-1">
                                                <Clock size={12} /> Time Control
                                            </label>
                                            <select 
                                                value={timeControl}
                                                onChange={(e) => setTimeControl(e.target.value as TimeControlFilter)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-amber-500 outline-none"
                                            >
                                                <option value="blitz">Blitz</option>
                                                <option value="rapid">Rapid</option>
                                                <option value="bullet">Bullet</option>
                                                <option value="classical">Classical</option>
                                                <option value="all">Any / Mixed</option>
                                            </select>
                                        </div>

                                        {/* Sample Size */}
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-2 flex items-center gap-1">
                                                <Database size={12} /> Sample Size
                                            </label>
                                            <div className="flex bg-slate-950 rounded-lg border border-slate-700 p-1">
                                                <button 
                                                    onClick={() => setSampleSize(200)}
                                                    className={`flex-1 py-1.5 text-xs font-bold rounded ${sampleSize === 200 ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    200
                                                </button>
                                                <button 
                                                    onClick={() => setSampleSize(500)}
                                                    className={`flex-1 py-1.5 text-xs font-bold rounded ${sampleSize === 500 ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    500
                                                </button>
                                                <button 
                                                    onClick={() => setSampleSize('all')}
                                                    className={`flex-1 py-1.5 text-xs font-bold rounded ${sampleSize === 'all' ? 'bg-amber-900/40 text-amber-500 shadow border border-amber-900/50' : 'text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    ALL
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Box */}
                                    <div className="bg-slate-800/50 border border-slate-700 p-3 rounded-lg text-xs text-slate-400 leading-relaxed">
                                        Palamedes will analyze <strong>{sampleSize === 'all' ? 'ALL available' : `the last ${sampleSize}`}</strong> games 
                                        filtered by <strong>{timeControl}</strong> time control. 
                                        {sampleSize === 'all' && <span className="text-amber-500 block mt-1 font-bold">Warning: Downloading all games may take time.</span>}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 pt-2">
                                        <button 
                                            onClick={initiateDossierCreation}
                                            disabled={!targetUsername.trim()}
                                            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-amber-900/20"
                                        >
                                            Generate Report
                                        </button>
                                        <button 
                                            onClick={() => { setShowCreate(false); setCreateError(null); }}
                                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg font-bold transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-6 shrink-0">
                <h1 className="text-2xl font-black text-white flex items-center gap-3">
                    <Layout size={24} className="text-amber-500" /> Preparation Center
                </h1>
                <button onClick={onBack} className="text-slate-400 hover:text-white text-sm font-bold">Back to Dashboard</button>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Sidebar List */}
                <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shrink-0">
                    <div className="p-4 border-b border-slate-800">
                        <button 
                            onClick={() => setShowCreate(true)}
                            className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg mb-4 hover:shadow-amber-900/20 transition-all"
                        >
                            <Plus size={16} /> New Dossier
                        </button>
                        <div className="flex bg-slate-950 rounded-lg p-1">
                            <button 
                                onClick={() => setActiveTab('active')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${activeTab === 'active' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Active
                            </button>
                            <button 
                                onClick={() => setActiveTab('archived')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'archived' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Archived
                                {archivedCount > 0 && (
                                    <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-full text-[9px] font-bold border border-slate-600">
                                        {archivedCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {loading ? (
                            <div className="text-center py-10 text-slate-500"><Loader2 className="animate-spin mx-auto mb-2" />Loading...</div>
                        ) : filteredDossiers.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 text-sm">No {activeTab} dossiers.</div>
                        ) : (
                            filteredDossiers.map(d => (
                                <div 
                                    key={d.id}
                                    onClick={() => setSelectedDossier(d)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedDossier?.id === d.id ? 'bg-slate-800 border-amber-500/50' : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-slate-200">{d.opponent_username}</h3>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${d.stats.playStyle === 'Aggressive' ? 'bg-red-900/30 text-red-400' : 'bg-blue-900/30 text-blue-400'}`}>
                                            {d.stats.playStyle}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 flex justify-between items-center">
                                        <span>Games: {d.stats.totalGames}</span>
                                        <span>{new Date(d.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Content (Report) */}
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col relative">
                    {!selectedDossier ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-50">
                            <FileText size={64} className="mb-4" />
                            <p className="text-lg font-bold">Select a Dossier</p>
                            <p className="text-sm">View strategic analysis and counter-prep.</p>
                        </div>
                    ) : (
                        <>
                            {/* Toolbar */}
                            <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center border border-slate-600">
                                        <User size={20} className="text-slate-300" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white leading-none">{selectedDossier.opponent_username}</h2>
                                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                            <span>Analyzed {selectedDossier.stats.totalGames} games</span>
                                            <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                                            <span>Style: {selectedDossier.stats.playStyle}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => toggleArchive(selectedDossier)}
                                        className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                                        title={selectedDossier.status === 'active' ? "Archive" : "Unarchive"}
                                    >
                                        <Archive size={18} />
                                    </button>
                                    <button 
                                        onClick={() => setDossierToDelete(selectedDossier.id)}
                                        className="p-2 hover:bg-red-900/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Report Body - Styled Cards */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                                
                                {/* 1. Opponent Top Openings Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    {selectedDossier.stats.topOpenings.slice(0, 3).map((op, idx) => (
                                        <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-xl shadow-md">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="text-[10px] uppercase font-bold text-slate-500">Most Played #{idx + 1}</div>
                                                {idx === 0 && <Crown size={12} className="text-amber-500" />}
                                            </div>
                                            <div className="font-black text-lg text-slate-200 truncate mb-1">{op.name}</div>
                                            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-2">
                                                <span>{op.count} games</span>
                                            </div>
                                            <div className="relative h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full ${op.winRate > 55 ? 'bg-red-500' : (op.winRate < 45 ? 'bg-green-500' : 'bg-blue-500')}`} style={{width: `${op.winRate}%`}}></div>
                                            </div>
                                            <div className="flex justify-between mt-1.5 text-[10px] font-bold">
                                                <span className="text-slate-500">Win Rate</span>
                                                <span className={`${op.winRate > 55 ? 'text-red-400' : (op.winRate < 45 ? 'text-green-400' : 'text-blue-400')}`}>{op.winRate}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* 2. Parsed Analysis Cards */}
                                <div className="space-y-6">
                                    {parsedReport.map((section, idx) => (
                                        <div key={idx} className={`rounded-xl border shadow-lg overflow-hidden animate-in slide-in-from-bottom-2 duration-500 delay-${idx*100}
                                            ${section.type === 'profile' ? 'bg-indigo-950/20 border-indigo-500/30' : 
                                              section.type === 'lines' ? 'bg-gradient-to-br from-amber-950/20 to-slate-900 border-amber-500/30' : 
                                              section.type === 'action' ? 'bg-emerald-950/20 border-emerald-500/30' :
                                              'bg-slate-900 border-slate-800'}
                                        `}>
                                            <div className={`px-5 py-3 border-b flex items-center gap-2
                                                ${section.type === 'profile' ? 'border-indigo-500/20 bg-indigo-900/10' : 
                                                  section.type === 'lines' ? 'border-amber-500/20 bg-amber-900/10' :
                                                  section.type === 'action' ? 'border-emerald-500/20 bg-emerald-900/10' :
                                                  'border-slate-800 bg-slate-950/30'}
                                            `}>
                                                {section.type === 'profile' && <Brain size={18} className="text-indigo-400" />}
                                                {section.type === 'analysis' && <Database size={18} className="text-blue-400" />}
                                                {section.type === 'crosscheck' && <Swords size={18} className="text-slate-400" />}
                                                {section.type === 'lines' && <Lightbulb size={18} className="text-amber-400" />}
                                                {section.type === 'action' && <ClipboardList size={18} className="text-emerald-400" />}
                                                
                                                <h3 className={`font-bold text-sm uppercase tracking-wider
                                                    ${section.type === 'profile' ? 'text-indigo-300' : 
                                                      section.type === 'lines' ? 'text-amber-300' :
                                                      section.type === 'action' ? 'text-emerald-300' :
                                                      'text-slate-300'}
                                                `}>
                                                    {section.title}
                                                </h3>
                                            </div>

                                            <div className="p-5">
                                                {section.content.map((line, i) => (
                                                    <RichTextRenderer key={i} text={line} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Footer Note */}
                                <div className="mt-8 text-center">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-500">
                                        <Shield size={10} />
                                        <span>AI Analysis generated by Palamedes Intelligence Engine</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PreparationCenter;