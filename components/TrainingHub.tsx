import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Repertoire } from '../types';
import { Target, BookOpen, ArrowLeft, Play, Layout, Trophy, Crown, Medal, Star, Shield, Activity, Calendar } from 'lucide-react';

interface TrainingHubProps {
    onStartTraining: (repertoire: Repertoire) => void;
    onBack: () => void;
}

interface RepertoireStats {
    points: number;
    correct: number;
    total: number;
    lastPlayed: string | null;
}

const TrainingHub: React.FC<TrainingHubProps> = ({ onStartTraining, onBack }) => {
    const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
    const [stats, setStats] = useState<Record<string, RepertoireStats>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 1. Fetch Repertoires
                const { data: reps, error: repError } = await supabase
                    .from('repertoires')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });
                
                if (repError) throw repError;

                // 2. Fetch Logs to calculate per-repertoire stats
                const { data: logs, error: logError } = await supabase
                    .from('training_logs')
                    .select('repertoire_id, points_delta, is_correct, created_at')
                    .eq('user_id', user.id);

                if (logError) throw logError;

                // 3. Process Stats
                const newStats: Record<string, RepertoireStats> = {};
                
                // Initialize stats for existing reps
                reps?.forEach(r => {
                    newStats[r.id] = { points: 0, correct: 0, total: 0, lastPlayed: null };
                });

                // Aggregate logs
                logs?.forEach(log => {
                    if (newStats[log.repertoire_id]) {
                        newStats[log.repertoire_id].points += log.points_delta;
                        newStats[log.repertoire_id].total += 1;
                        if (log.is_correct) newStats[log.repertoire_id].correct += 1;
                        
                        // Find most recent date
                        const logDate = new Date(log.created_at).getTime();
                        const currentLast = newStats[log.repertoire_id].lastPlayed ? new Date(newStats[log.repertoire_id].lastPlayed!).getTime() : 0;
                        
                        if (logDate > currentLast) {
                            newStats[log.repertoire_id].lastPlayed = log.created_at;
                        }
                    }
                });

                setRepertoires(reps || []);
                setStats(newStats);

            } catch (error) {
                console.error('Error fetching training data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Helper: Level Calculation
    const getLevelInfo = (points: number) => {
        if (points < 100) return { label: 'Novice', color: 'text-slate-400', icon: Shield };
        if (points < 500) return { label: 'Basic Domain', color: 'text-emerald-400', icon: Star };
        if (points < 2000) return { label: 'Intermediate', color: 'text-blue-400', icon: Medal };
        if (points < 5000) return { label: 'Expert', color: 'text-purple-400', icon: Trophy };
        return { label: 'Master', color: 'text-yellow-400', icon: Crown };
    };

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-12 font-sans">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button 
                        onClick={onBack}
                        className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold uppercase tracking-wider mb-4 transition-colors"
                    >
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(217,119,6,0.3)] text-white">
                            <Target size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Training Center</h1>
                            <p className="text-slate-400 text-sm mt-1">Select a repertoire to practice and level up.</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
                        <Layout className="animate-spin" size={32} />
                        <span className="text-sm font-bold">Loading Stats...</span>
                    </div>
                ) : repertoires.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-slate-800 rounded-xl text-slate-500">
                        No repertoires found. Create one in the dashboard first.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {repertoires.map(rep => {
                            const stat = stats[rep.id] || { points: 0, correct: 0, total: 0, lastPlayed: null };
                            const levelInfo = getLevelInfo(stat.points);
                            const LevelIcon = levelInfo.icon;
                            const accuracy = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;

                            return (
                                <div 
                                    key={rep.id} 
                                    className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-amber-600/50 transition-all shadow-xl group flex flex-col relative"
                                >
                                    {/* Background decorative gradient */}
                                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full pointer-events-none transition-opacity opacity-50 group-hover:opacity-100`}></div>

                                    <div className="p-6 flex-1 flex flex-col">
                                        {/* Card Header */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider w-max ${rep.color === 'white' ? 'bg-slate-200 text-slate-900' : 'bg-slate-950 text-slate-200 border border-slate-700'}`}>
                                                    {rep.color}
                                                </span>
                                                <h3 className="text-xl font-bold text-white group-hover:text-amber-500 transition-colors truncate max-w-[200px]">{rep.name}</h3>
                                            </div>
                                            <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-slate-500 group-hover:text-amber-500 transition-colors">
                                                <BookOpen size={20} />
                                            </div>
                                        </div>

                                        {/* Gamified Stats */}
                                        <div className="flex items-center gap-3 mb-6 bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                                            <div className={`p-2 rounded-full bg-slate-900 border border-slate-800 ${levelInfo.color}`}>
                                                <LevelIcon size={24} />
                                            </div>
                                            <div>
                                                <div className={`text-xs font-bold uppercase tracking-widest ${levelInfo.color}`}>
                                                    {levelInfo.label}
                                                </div>
                                                <div className="text-white font-black text-lg leading-none">
                                                    {stat.points} <span className="text-[10px] font-medium text-slate-500 uppercase">XP</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Accuracy & Activity */}
                                        <div className="space-y-3 mt-auto">
                                            <div>
                                                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500 mb-1">
                                                    <span>Accuracy</span>
                                                    <span>{accuracy}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full transition-all duration-1000 ${accuracy > 80 ? 'bg-emerald-500' : (accuracy > 50 ? 'bg-amber-500' : 'bg-slate-600')}`}
                                                        style={{ width: `${accuracy}%` }}
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
                                                <Calendar size={12} />
                                                {stat.lastPlayed 
                                                    ? `Last trained: ${new Date(stat.lastPlayed).toLocaleDateString()}` 
                                                    : 'No training data yet'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="p-4 bg-slate-950/80 border-t border-slate-800 backdrop-blur-sm">
                                        <button 
                                            onClick={() => onStartTraining(rep)}
                                            className="w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98] group-hover:shadow-amber-900/20"
                                        >
                                            <Play size={16} className="fill-current" /> Start Drill
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrainingHub;