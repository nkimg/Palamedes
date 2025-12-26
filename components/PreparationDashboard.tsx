import React, { useEffect, useState } from 'react';
import { PreparationDossier, PrepAnalysis, StyleMetric, RecommendedLine } from '../types';
import { 
    X, User, Shield, Swords, Zap, Activity, TrendingUp, 
    Target, BookOpen, ChevronRight, AlertTriangle, CheckCircle, 
    BarChart3, Brain, PlayCircle, Lock, Sparkles, Loader2
} from 'lucide-react';

interface PreparationDashboardProps {
    dossier: PreparationDossier;
    onClose: () => void;
}

// --- MOCK ANALYZER (Fallback if no API Key) ---
const generateMockAnalysis = (opponentName: string = "Opponent"): PrepAnalysis => {
    // Deterministic pseudo-random based on name length
    const seed = opponentName.length;
    const isAggressive = seed % 2 === 0;

    return {
        estimatedRating: 1950 + (seed * 10),
        playstyleTags: isAggressive 
            ? ['Aggressive', 'Tactical', 'Gambit Lover'] 
            : ['Solid', 'Positional', 'Endgame Specialist'],
        metrics: [
            { attribute: 'Opening Theory', heroValue: 75, villainValue: isAggressive ? 40 : 85, description: 'Knowledge of main lines' },
            { attribute: 'Tactical Alertness', heroValue: 65, villainValue: isAggressive ? 90 : 60, description: 'Spotting combinations' },
            { attribute: 'Endgame Technique', heroValue: 80, villainValue: isAggressive ? 50 : 80, description: 'Converting advantages' },
            { attribute: 'Time Management', heroValue: 60, villainValue: 70, description: 'Clock handling' },
        ],
        recommendations: [
            {
                id: '1',
                name: isAggressive ? 'Caro-Kann Defense' : 'Sicilian Najdorf',
                color: 'black',
                winRate: 58,
                confidence: 'High',
                reason: isAggressive 
                    ? 'Frustrates their need for early attacks. They score poorly vs solid structures.' 
                    : 'Exploits their passive play in open positions.',
                moves: ['1.e4', 'c6', '2.d4', 'd5']
            },
            {
                id: '2',
                name: 'London System',
                color: 'white',
                winRate: 54,
                confidence: 'Medium',
                reason: 'Neutralizes their prep against 1.e4. Forces a strategic game.',
                moves: ['1.d4', 'Nf6', '2.Bf4']
            }
        ],
        insights: [
            {
                type: 'strength',
                title: 'Dangerous Attacker',
                description: 'Over-performs in positions with queens on the board and open files.'
            },
            {
                type: 'weakness',
                title: 'Impatience',
                description: 'Frequently creates weaknesses (f3/g4 pushes) when the position is locked.'
            },
            {
                type: 'opportunity',
                title: 'Trade Queens Early',
                description: 'Win rate drops by 25% in queenless middlegames.'
            }
        ]
    };
};

const MetricBar: React.FC<{ metric: StyleMetric }> = ({ metric }) => {
    return (
        <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-indigo-400">You ({metric.heroValue})</span>
                <span className="font-bold text-slate-400 uppercase tracking-wider">{metric.attribute}</span>
                <span className="font-bold text-red-400">Them ({metric.villainValue})</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
                {/* Center marker */}
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-700 z-10" />
                
                {/* Hero Bar (Left) */}
                <div 
                    className="absolute top-0 bottom-0 bg-indigo-600 rounded-l-full opacity-80"
                    style={{ 
                        left: '0%', 
                        width: '50%',
                        transform: `scaleX(${metric.heroValue / 100})`, 
                        transformOrigin: 'left' 
                    }} 
                />
                
                {/* Villain Bar (Right) */}
                <div 
                    className="absolute top-0 bottom-0 bg-red-600 rounded-r-full opacity-80"
                    style={{ 
                        right: '0%', 
                        width: '50%',
                        transform: `scaleX(${metric.villainValue / 100})`, 
                        transformOrigin: 'right' 
                    }} 
                />
            </div>
            <p className="text-[10px] text-slate-500 mt-1 italic text-center">{metric.description}</p>
        </div>
    );
};

const PreparationDashboard: React.FC<PreparationDashboardProps> = ({ dossier, onClose }) => {
    const [analysis, setAnalysis] = useState<PrepAnalysis | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'lines' | 'games'>('overview');
    
    useEffect(() => {
        // Simulate loading base analysis
        const data = generateMockAnalysis(dossier.opponentName || dossier.openingName);
        setAnalysis(data);
    }, [dossier]);

    if (!analysis) return <div className="p-8 text-center text-slate-500">Loading Intelligence...</div>;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* TOP BAR */}
            <div className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center shrink-0 shadow-md z-20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/20">
                        {dossier.type === 'opponent' ? <User size={24} className="text-white" /> : <BookOpen size={24} className="text-white" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-white tracking-tight">{dossier.title}</h1>
                            <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-[10px] font-bold text-amber-500">
                                ~{analysis.estimatedRating} ELO
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full ${dossier.readiness === 'Ready' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                            <span className="text-xs text-slate-400 font-medium">Status: {dossier.readiness}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button 
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Scout Report
                        </button>
                        <button 
                            onClick={() => setActiveTab('lines')}
                            className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeTab === 'lines' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Recommended Lines
                        </button>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-700"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-950 relative">
                <div className="max-w-7xl mx-auto grid grid-cols-1lg:grid-cols-12 gap-6">
                    
                    {/* LEFT COLUMN: PROFILE (Always visible or specific to Overview) */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Playstyle Card */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <Swords size={120} />
                            </div>
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Activity size={16} /> Player Archetype
                            </h2>
                            <div className="flex flex-wrap gap-2 mb-6">
                                {analysis.playstyleTags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 rounded-full text-xs font-bold shadow-sm">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            
                            {/* Insight Highlights */}
                            <div className="space-y-3">
                                {analysis.insights.map((insight, i) => (
                                    <div key={i} className={`p-3 rounded-lg border flex gap-3 ${
                                        insight.type === 'strength' ? 'bg-red-900/10 border-red-900/30' : 
                                        insight.type === 'weakness' ? 'bg-green-900/10 border-green-900/30' : 
                                        'bg-amber-900/10 border-amber-900/30'
                                    }`}>
                                        <div className={`mt-0.5 shrink-0 ${
                                             insight.type === 'strength' ? 'text-red-500' : 
                                             insight.type === 'weakness' ? 'text-green-500' : 
                                             'text-amber-500'
                                        }`}>
                                            {insight.type === 'strength' ? <AlertTriangle size={16} /> : 
                                             insight.type === 'weakness' ? <Target size={16} /> : 
                                             <Zap size={16} />}
                                        </div>
                                        <div>
                                            <h4 className={`text-xs font-bold uppercase mb-0.5 ${
                                                 insight.type === 'strength' ? 'text-red-400' : 
                                                 insight.type === 'weakness' ? 'text-green-400' : 
                                                 'text-amber-400'
                                            }`}>{insight.title}</h4>
                                            <p className="text-xs text-slate-300 leading-snug">{insight.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Style Comparison */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <BarChart3 size={16} /> Style Matchup
                            </h2>
                            <div>
                                {analysis.metrics.map((m, i) => (
                                    <MetricBar key={i} metric={m} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: TABS */}
                    <div className="lg:col-span-8">
                        {activeTab === 'overview' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                                
                                {/* Strategic Plan Banner (No AI) */}
                                <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 border border-emerald-500/30 rounded-xl p-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-emerald-600/10 to-transparent" />
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-2">
                                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                                <Brain className="text-emerald-400" /> Strategic Imperative
                                            </h2>
                                        </div>
                                        
                                        <p className="text-emerald-100/80 text-sm leading-relaxed max-w-2xl">
                                            Against {dossier.opponentName || 'this opponent'}, avoid sharp tactical complications early. 
                                            Their calculation is strong, but they become impatient in closed positions.
                                            <br/><br/>
                                            <strong>Winning Formula:</strong> Dry out the position, exchange Queens, and aim for a technical endgame.
                                        </p>
                                    </div>
                                </div>

                                {/* Top Recommendations Preview */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-white">Recommended Approach</h3>
                                        <button onClick={() => setActiveTab('lines')} className="text-xs text-indigo-400 hover:text-white flex items-center gap-1">
                                            View All Lines <ChevronRight size={12} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {analysis.recommendations.map(line => (
                                            <div key={line.id} className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-4 rounded-xl transition-all group cursor-pointer relative">
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${line.color === 'white' ? 'bg-slate-200' : 'bg-slate-950 border-r border-slate-800'}`} />
                                                <div className="pl-3">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">As {line.color}</span>
                                                        <span className="text-xs font-bold text-green-400 bg-green-900/20 px-2 py-0.5 rounded border border-green-900/50">{line.winRate}% Win</span>
                                                    </div>
                                                    <h4 className="font-bold text-white text-lg mb-1 group-hover:text-indigo-400 transition-colors">{line.name}</h4>
                                                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">{line.reason}</p>
                                                    <div className="flex gap-1">
                                                        {line.moves.map((m, idx) => (
                                                            <span key={idx} className="bg-slate-800 text-slate-300 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-700">
                                                                {m}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'lines' && (
                             <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                 <h2 className="text-xl font-bold text-white mb-4">Detailed Repertoire Recommendations</h2>
                                 <p className="text-slate-400 text-sm mb-6">
                                     Based on your opponent's playstyle and your own statistics, these lines offer the highest probability of a favorable outcome.
                                 </p>
                                 
                                 {analysis.recommendations.map(line => (
                                     <div key={line.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                                         <div className="flex justify-between items-start">
                                             <div>
                                                 <div className="flex items-center gap-2 mb-1">
                                                     <span className={`w-3 h-3 rounded-full ${line.color === 'white' ? 'bg-slate-200' : 'bg-slate-900 border border-slate-600'}`} />
                                                     <h3 className="text-2xl font-bold text-white">{line.name}</h3>
                                                 </div>
                                                 <p className="text-indigo-400 text-sm font-bold mb-4">{line.reason}</p>
                                             </div>
                                             <div className="text-right">
                                                 <div className="text-3xl font-black text-white">{line.winRate}%</div>
                                                 <div className="text-xs text-slate-500 uppercase font-bold">Exp. Win Rate</div>
                                             </div>
                                         </div>
                                         
                                         <div className="bg-slate-900 rounded-lg p-3 border border-slate-800 font-mono text-sm text-slate-300 flex items-center gap-2 mb-4">
                                             <PlayCircle size={16} className="text-amber-500" />
                                             {line.moves.join(' ')} ...
                                         </div>
                                         
                                         <div className="flex gap-3">
                                             <button className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-bold text-sm transition-colors">
                                                 Practice this Line
                                             </button>
                                             <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg font-bold text-sm transition-colors">
                                                 View Master Games
                                             </button>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PreparationDashboard;