import React from 'react';
import { Play, CheckCircle, AlertCircle, ArrowRight, X, Trophy, Medal, Crown, Star, Shield, RotateCcw, Target, Activity } from 'lucide-react';
import { UserTrainingStats, TrainingSessionStats } from '../types';

interface TrainingPanelProps {
    feedback: 'correct' | 'incorrect' | 'waiting' | 'none' | 'completed';
    onNext: () => void;
    onExit: () => void;
    onRestart: () => void;
    turnColor: 'w' | 'b';
    userStats: UserTrainingStats | null;
    sessionStats: TrainingSessionStats;
}

const TrainingPanel: React.FC<TrainingPanelProps> = ({ feedback, onNext, onExit, onRestart, turnColor, userStats, sessionStats }) => {
    
    // Badge Helper
    const getBadgeIcon = (level: string) => {
        switch(level) {
            case 'Master': return <Crown size={20} className="text-yellow-400" />;
            case 'Expert': return <Trophy size={18} className="text-purple-400" />;
            case 'Intermediate': return <Medal size={18} className="text-blue-400" />;
            case 'Basic Domain': return <Star size={18} className="text-emerald-400" />;
            default: return <Shield size={18} className="text-slate-400" />;
        }
    };

    const getNextLevelThreshold = (points: number) => {
        if (points < 100) return 100;
        if (points < 500) return 500;
        if (points < 2000) return 2000;
        if (points < 5000) return 5000;
        return points; // Master cap
    };

    const currentPoints = userStats?.total_points || 0;
    const nextThreshold = getNextLevelThreshold(currentPoints);
    const progressPercent = Math.min(100, (currentPoints / nextThreshold) * 100);

    // Calculate Accuracy
    const totalMoves = sessionStats.correct + sessionStats.errors;
    const accuracy = totalMoves > 0 ? Math.round((sessionStats.correct / totalMoves) * 100) : 0;

    return (
        <div className="flex flex-col h-full bg-slate-900 rounded-xl shadow-xl overflow-hidden border border-slate-800 relative">
            
            {/* Header */}
            <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-2 text-white font-bold text-sm uppercase tracking-wider">
                    <Play size={16} className="text-amber-500" /> Training Mode
                </div>
                <button onClick={onExit} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Stats Bar */}
            <div className="bg-slate-950 p-4 border-b border-slate-800">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        {getBadgeIcon(userStats?.current_level || 'Novice')}
                        <div>
                            <div className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                                {userStats?.current_level || 'Novice'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                                Rank
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-black text-white leading-none">
                            {currentPoints}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">PTS</div>
                    </div>
                </div>
                
                {/* Global Progress Bar */}
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-amber-600 to-yellow-500 transition-all duration-1000 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <div className="flex justify-between text-[9px] text-slate-600 mt-1 font-mono">
                    <span>Current Session</span>
                    <span>Next Rank: {nextThreshold}</span>
                </div>
            </div>

            {/* Sub-Header: Moves Left */}
            {feedback !== 'completed' && (
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                        <Target size={12} /> Moves Left
                    </span>
                    <span className="text-xs font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                        {sessionStats.movesLeft}
                    </span>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-6 relative overflow-y-auto">
                
                {feedback === 'completed' ? (
                    // --- FINAL REPORT ---
                    <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mb-4 border border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                            <Trophy size={40} className="text-amber-500" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-1">Line Completed!</h2>
                        <p className="text-slate-400 text-sm mb-6">Great session. Here is your summary.</p>

                        <div className="grid grid-cols-2 gap-4 w-full mb-6">
                            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center">
                                <span className="text-2xl font-black text-green-400">{sessionStats.correct}</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Correct</span>
                            </div>
                            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center">
                                <span className="text-2xl font-black text-red-400">{sessionStats.errors}</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Mistakes</span>
                            </div>
                        </div>

                        <div className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Activity size={20} className="text-blue-400" />
                                <div className="text-left">
                                    <div className="text-xs font-bold text-slate-300 uppercase">Accuracy</div>
                                    <div className="text-[10px] text-slate-500">Session Performance</div>
                                </div>
                            </div>
                            <div className={`text-2xl font-black ${accuracy >= 80 ? 'text-blue-400' : (accuracy >= 50 ? 'text-yellow-400' : 'text-red-400')}`}>
                                {accuracy}%
                            </div>
                        </div>

                        <div className="flex w-full gap-3">
                            <button onClick={onExit} className="flex-1 py-3 rounded-lg border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 transition-colors">
                                Training Center
                            </button>
                            <button onClick={onRestart} className="flex-1 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98]">
                                <RotateCcw size={16} /> Restart
                            </button>
                        </div>
                    </div>
                ) : (
                    // --- ACTIVE DRILL ---
                    <>
                        {/* Instruction */}
                        <div className="space-y-2">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Current Task</div>
                            <h2 className="text-2xl font-black text-white">
                                Play {turnColor === 'w' ? 'White' : 'Black'}
                            </h2>
                            <p className="text-slate-400 text-sm">Make the move defined in your repertoire.</p>
                        </div>

                        {/* Feedback State */}
                        <div className="w-full max-w-xs relative min-h-[160px] flex items-center justify-center">
                            {feedback === 'waiting' && (
                                <div className="p-6 bg-slate-950/50 rounded-xl border border-slate-800 border-dashed flex flex-col items-center gap-3 w-full">
                                    <div className={`w-3 h-3 rounded-full ${turnColor === 'w' ? 'bg-slate-200' : 'bg-slate-700 border border-slate-500'} animate-pulse`} />
                                    <span className="text-slate-500 text-sm font-bold">Waiting for move...</span>
                                </div>
                            )}

                            {feedback === 'correct' && (
                                <div className="p-6 bg-green-900/20 rounded-xl border border-green-500/50 flex flex-col items-center gap-4 animate-in zoom-in-95 w-full">
                                    <CheckCircle size={48} className="text-green-500" />
                                    <div className="text-green-400 font-bold text-lg">Correct!</div>
                                    
                                    {/* Floating Points Animation */}
                                    <div className="absolute top-0 right-10 text-xl font-black text-green-400 animate-out fade-out slide-out-to-top-10 duration-1000 fill-mode-forwards">
                                        +10 PTS
                                    </div>

                                    <div className="text-green-300/70 text-xs font-medium animate-pulse">
                                        Board is active - Play next move!
                                    </div>
                                    <button 
                                        onClick={onNext}
                                        className="w-full py-2 bg-green-900/40 hover:bg-green-900/60 border border-green-700 text-green-100 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors mt-2"
                                    >
                                        Skip / Continue <ArrowRight size={14} />
                                    </button>
                                </div>
                            )}

                            {feedback === 'incorrect' && (
                                <div className="p-6 bg-red-900/20 rounded-xl border border-red-500/50 flex flex-col items-center gap-3 animate-in shake w-full">
                                    <AlertCircle size={48} className="text-red-500" />
                                    <div className="text-red-400 font-bold text-lg">Incorrect</div>
                                    
                                    {/* Floating Points Animation */}
                                    <div className="absolute top-0 right-10 text-xl font-black text-red-400 animate-out fade-out slide-out-to-bottom-10 duration-1000 fill-mode-forwards">
                                        -5 PTS
                                    </div>

                                    <p className="text-red-300/70 text-xs">That move is not in your main line.</p>
                                    <div className="text-slate-400 text-xs mt-2 font-bold animate-pulse">Try Again</div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Footer */}
            {feedback !== 'completed' && (
                <div className="p-4 border-t border-slate-800 bg-slate-950/50 text-center">
                    <p className="text-[10px] text-slate-500">Main Line Drill</p>
                </div>
            )}
        </div>
    );
};

export default TrainingPanel;