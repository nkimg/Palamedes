import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { analyzeOpponentStats, TimeControlFilter } from '../lichessClient';
import { generatePersonalityProfile } from '../geminiService';
import { PersonalityProfile as ProfileType } from '../types';
import { User, Brain, Book, Swords, Zap, Target, Award, RefreshCw, Clock, Flame, Rabbit, Hourglass, Database, Save } from 'lucide-react';

const PersonalityProfile: React.FC = () => {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<ProfileType | null>(null);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [gameCount, setGameCount] = useState<number>(200); 
    
    // Filters & Persistence
    const [activeTimeControl, setActiveTimeControl] = useState<TimeControlFilter>('blitz');
    const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);
    const [isDbData, setIsDbData] = useState(false);

    // Initial Load: Try to get current user name if saved
    useEffect(() => {
        const savedUser = localStorage.getItem('lichess_username');
        if (savedUser) {
            setUsername(savedUser);
        }
    }, []);

    // Effect: Whenever username or time control changes, try to load from DB first
    useEffect(() => {
        if (username.trim()) {
            loadProfileFromDb(username, activeTimeControl);
        } else {
            setProfile(null);
            setLastFetchTime(null);
        }
    }, [username, activeTimeControl]);

    const loadProfileFromDb = async (user: string, tc: string) => {
        try {
            const { data: authUser } = await supabase.auth.getUser();
            if (!authUser.user) return;

            const { data } = await supabase
                .from('personality_profiles')
                .select('*')
                .eq('user_id', authUser.user.id)
                .eq('target_username', user)
                .eq('time_control', tc)
                .maybeSingle();

            if (data) {
                setProfile(data.profile_data);
                setLastFetchTime(data.created_at);
                setIsDbData(true);
            } else {
                setProfile(null);
                setLastFetchTime(null);
                setIsDbData(false);
            }
        } catch (e) {
            console.error("Error loading DB profile", e);
        }
    };

    const handleAnalyze = async (forceRefresh = false) => {
        if (!username.trim()) return;
        
        // Save username preference
        localStorage.setItem('lichess_username', username);

        setLoading(true);
        // Only clear profile if we are NOT refreshing (visual continuity)
        if (!forceRefresh) setProfile(null);
        
        setProgress(0);
        setStatus(`Fetching ${activeTimeControl} games...`);

        try {
            // 1. Fetch Stats for Specific Time Control
            const stats = await analyzeOpponentStats(
                username, 
                gameCount, 
                activeTimeControl, 
                (count) => {
                    setProgress(count);
                    setStatus(`Analyzed ${count} ${activeTimeControl} games...`);
                }
            );

            if (!stats || stats.totalGames === 0) {
                alert(`No ${activeTimeControl} games found for this user.`);
                setLoading(false);
                return;
            }

            setStatus(`Developing ${activeTimeControl} Personality...`);
            
            // 2. Generate Profile with Context
            const aiProfile = await generatePersonalityProfile(stats, activeTimeControl);
            
            // 3. Save to DB (Upsert)
            const { data: authUser } = await supabase.auth.getUser();
            if (authUser.user) {
                const now = new Date().toISOString();
                const payload = {
                    user_id: authUser.user.id,
                    target_username: username,
                    time_control: activeTimeControl,
                    profile_data: aiProfile,
                    created_at: now
                };

                const { error } = await supabase
                    .from('personality_profiles')
                    .upsert(payload, { onConflict: 'user_id,target_username,time_control' });
                
                if (!error) {
                    setLastFetchTime(now);
                    setIsDbData(true); // Now it's effectively DB data
                }
            }

            setProfile(aiProfile);

        } catch (e: any) {
            console.error(e);
            alert("Error analyzing profile: " + e.message);
        } finally {
            setLoading(false);
            setStatus('');
        }
    };

    const TimeControlTab = ({ type, icon: Icon, label }: { type: TimeControlFilter, icon: any, label: string }) => (
        <button 
            onClick={() => setActiveTimeControl(type)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-t-lg border-b-2 transition-all ${
                activeTimeControl === type 
                ? 'bg-slate-800 border-amber-500 text-amber-500 font-bold' 
                : 'bg-slate-900 border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
        >
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-200 p-6 md:p-12 overflow-y-auto">
            <div className="max-w-5xl mx-auto w-full">
                
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="inline-flex p-4 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-2xl mb-4">
                        <Brain size={48} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">My Personality</h1>
                    <p className="text-slate-400 text-sm max-w-lg mx-auto">
                        Discover your inner Grandmaster. Analysis adapts to your playstyle in each time control.
                    </p>
                </div>

                {/* Main Controls Container */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl mb-8">
                    
                    {/* Username Bar */}
                    <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row gap-4 items-center bg-slate-900/50">
                        <div className="relative flex-1 w-full">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Lichess Username"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-indigo-500 outline-none"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-700 w-full md:w-auto">
                            {[200, 500, 1000].map(n => (
                                <button 
                                    key={n}
                                    onClick={() => setGameCount(n)}
                                    className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded transition-colors ${gameCount === n ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Time Control Tabs */}
                    <div className="flex px-2 pt-2 bg-slate-950/30 border-b border-slate-800">
                        <TimeControlTab type="bullet" icon={Rabbit} label="Bullet" />
                        <TimeControlTab type="blitz" icon={Flame} label="Blitz" />
                        <TimeControlTab type="rapid" icon={Clock} label="Rapid" />
                        <TimeControlTab type="all" icon={Hourglass} label="Overall" />
                    </div>

                    {/* Action Area */}
                    <div className="p-6 bg-slate-900 min-h-[150px] flex items-center justify-center">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center w-full py-4 animate-in fade-in">
                                <div className="relative w-16 h-16 mb-4">
                                    <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                                    <Brain className="absolute inset-0 m-auto text-indigo-500 animate-pulse" size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{status}</h3>
                                <div className="w-full max-w-md h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${Math.min(100, (progress / gameCount) * 100)}%` }}></div>
                                </div>
                            </div>
                        ) : profile ? (
                            <div className="w-full flex flex-col items-center">
                                {/* Metadata Badge */}
                                <div className="inline-flex items-center gap-4 bg-slate-950 border border-slate-800 rounded-full px-5 py-2 mb-4 shadow-sm">
                                    {isDbData && (
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
                                            <Database size={12} /> Persisted
                                        </div>
                                    )}
                                    <div className="w-[1px] h-4 bg-slate-800"></div>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                        Last Updated: {lastFetchTime ? new Date(lastFetchTime).toLocaleString() : 'Just now'}
                                    </div>
                                </div>

                                {/* Main Action: Reload */}
                                <button 
                                    onClick={() => handleAnalyze(true)}
                                    className="group relative px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-900/20 transition-all flex items-center gap-2 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                                    <span>Update Analysis</span>
                                </button>
                                <p className="text-[10px] text-slate-500 mt-2">Fetches new games and regenerates profile</p>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <div className="text-slate-500 mb-4 text-sm max-w-md mx-auto">
                                    No saved personality for <strong>{activeTimeControl}</strong>. Click below to analyze your recent {gameCount} games.
                                </div>
                                <button 
                                    onClick={() => handleAnalyze(false)}
                                    disabled={!username.trim()}
                                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 mx-auto transition-transform active:scale-[0.98]"
                                >
                                    <Zap size={18} /> Analyze {activeTimeControl} Personality
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Result Dashboard */}
                {profile && !loading && (
                    <div className="animate-in slide-in-from-bottom-8 duration-700">
                        {/* 1. Hero Card: Archetype */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-8 mb-8 relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
                            
                            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                                <div className="flex-1 text-center md:text-left">
                                    <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center justify-center md:justify-start gap-2">
                                        <Target size={14} /> Your {activeTimeControl} Archetype
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
                                        {profile.archetype}
                                    </h2>
                                    <p className="text-slate-300 text-lg leading-relaxed">
                                        {profile.description}
                                    </p>
                                </div>
                                
                                {/* Traits Radar (Simplified as Bars) */}
                                <div className="w-full md:w-80 bg-slate-950/50 rounded-xl p-6 border border-slate-700/50 backdrop-blur-sm">
                                    <div className="space-y-4">
                                        {[
                                            { label: 'Aggression', val: profile.traits.aggression, color: 'bg-red-500' },
                                            { label: 'Calculation', val: profile.traits.calculation, color: 'bg-blue-500' },
                                            { label: 'Creativity', val: profile.traits.creativity, color: 'bg-purple-500' },
                                            { label: 'Endgame', val: profile.traits.endgame, color: 'bg-emerald-500' }
                                        ].map(trait => (
                                            <div key={trait.label}>
                                                <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                                                    <span>{trait.label}</span>
                                                    <span>{trait.val}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                                    <div className={`h-full ${trait.color}`} style={{ width: `${trait.val}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            
                            {/* 2. GM Doppelganger */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col">
                                <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
                                    <div className="p-2 bg-amber-900/20 rounded-lg text-amber-500">
                                        <Award size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">GM Doppelgänger</h3>
                                        <p className="text-xs text-slate-500">Playstyle Match</p>
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col items-center justify-center text-center">
                                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-2xl mb-3 border-2 border-amber-500/50">
                                        👑
                                    </div>
                                    <h4 className="text-2xl font-black text-amber-400 mb-2">{profile.similarGM.name}</h4>
                                    <p className="text-sm text-slate-400 leading-relaxed italic">
                                        "{profile.similarGM.description}"
                                    </p>
                                </div>
                            </div>

                            {/* 3. Book Recommendations */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col">
                                <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
                                    <div className="p-2 bg-emerald-900/20 rounded-lg text-emerald-500">
                                        <Book size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">Required Reading</h3>
                                        <p className="text-xs text-slate-500">Curated for you</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {profile.recommendedBooks.map((book, i) => (
                                        <div key={i} className="flex gap-3 items-start group">
                                            <div className="w-8 h-10 bg-slate-800 border border-slate-700 rounded shrink-0 flex items-center justify-center text-xs font-serif text-slate-600 group-hover:border-emerald-500/50 transition-colors">
                                                {i+1}
                                            </div>
                                            <div>
                                                <h5 className="font-bold text-slate-200 text-sm">{book.title}</h5>
                                                <p className="text-xs text-slate-500 mb-1">by {book.author}</p>
                                                <p className="text-[10px] text-emerald-400/80 leading-snug">{book.reason}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 4. Opening Suggestions */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col">
                                <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
                                    <div className="p-2 bg-blue-900/20 rounded-lg text-blue-500">
                                        <Swords size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">Expansion Pack</h3>
                                        <p className="text-xs text-slate-500">New weapons to try</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {profile.suggestedOpenings.map((op, i) => (
                                        <div key={i} className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                            <h5 className="font-bold text-blue-300 text-sm mb-1">{op.name}</h5>
                                            <p className="text-xs text-slate-400 leading-relaxed">{op.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PersonalityProfile;