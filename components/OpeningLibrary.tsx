import React, { useState, useMemo } from 'react';
import { ECO_CODES, EcoCode } from '../ecoCodes';
import { OpeningStyle, OpeningStructure } from '../types';
import { Search, Filter, LayoutGrid, Zap, Shield } from 'lucide-react';

interface OpeningLibraryProps {
    onPreview: (eco: EcoCode) => void;
}

const OpeningLibrary: React.FC<OpeningLibraryProps> = ({ onPreview }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStyle, setFilterStyle] = useState<OpeningStyle | 'All'>('All');
    const [filterStructure, setFilterStructure] = useState<OpeningStructure | 'All'>('All');

    const filteredOpenings = useMemo(() => {
        return ECO_CODES.filter(eco => {
            const matchesSearch = eco.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  eco.code.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStyle = filterStyle === 'All' || eco.tags?.style === filterStyle;
            const matchesStructure = filterStructure === 'All' || eco.tags?.structure === filterStructure;
            
            return matchesSearch && matchesStyle && matchesStructure;
        });
    }, [searchTerm, filterStyle, filterStructure]);

    return (
        <div className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
            {/* Filters Header */}
            <div className="p-4 border-b border-slate-800 space-y-4 bg-slate-800/50">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search by name or ECO (e.g. Sicilian, B90)..." 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:border-indigo-500 outline-none placeholder:text-slate-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {/* Style Filters */}
                    {['All', 'Aggressive', 'Positional', 'Solid', 'Tactical'].map(style => (
                        <button 
                            key={style}
                            onClick={() => setFilterStyle(style as OpeningStyle | 'All')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap flex items-center gap-1
                                ${filterStyle === style 
                                    ? 'bg-indigo-600 text-white border-indigo-500' 
                                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                                }`}
                        >
                            {style === 'Aggressive' && <Zap size={10} />}
                            {style === 'Solid' && <Shield size={10} />}
                            {style}
                        </button>
                    ))}
                    <div className="w-[1px] h-6 bg-slate-700 mx-1 shrink-0"></div>
                    {/* Structure Filters */}
                    {['All', 'Open', 'Closed', 'Semi-Open'].map(struct => (
                        <button 
                            key={struct}
                            onClick={() => setFilterStructure(struct as OpeningStructure | 'All')}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap
                                ${filterStructure === struct
                                    ? 'bg-emerald-600 text-white border-emerald-500' 
                                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                                }`}
                        >
                            {struct}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-950/30">
                {filteredOpenings.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                        <Filter size={48} className="mb-2" />
                        <span className="text-sm">No openings match your filters.</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredOpenings.map(eco => (
                            <OpeningCard 
                                key={eco.code} 
                                eco={eco} 
                                onPreview={() => onPreview(eco)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const OpeningCard: React.FC<{ 
    eco: EcoCode; 
    onPreview: () => void; 
}> = ({ eco, onPreview }) => {
    
    const style = eco.tags?.style;

    // Bold, Solid Backgrounds for Cards
    const getCardClasses = (s?: OpeningStyle) => {
        switch(s) {
            case 'Aggressive': 
                return 'bg-gradient-to-br from-red-800 to-red-900 border-red-500 shadow-[0_0_15px_-3px_rgba(220,38,38,0.3)] hover:shadow-red-500/40';
            case 'Solid': 
                return 'bg-gradient-to-br from-blue-800 to-blue-900 border-blue-500 shadow-[0_0_15px_-3px_rgba(37,99,235,0.3)] hover:shadow-blue-500/40';
            case 'Positional': 
                return 'bg-gradient-to-br from-purple-800 to-purple-900 border-purple-500 shadow-[0_0_15px_-3px_rgba(147,51,234,0.3)] hover:shadow-purple-500/40';
            case 'Tactical': 
                return 'bg-gradient-to-br from-emerald-800 to-emerald-900 border-emerald-500 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)] hover:shadow-emerald-500/40';
            default: 
                return 'bg-slate-800 border-slate-600 hover:border-slate-500';
        }
    };

    // Matching High-Contrast Pills
    const getPillClasses = (s?: OpeningStyle) => {
        switch(s) {
            case 'Aggressive': return 'bg-red-950 text-red-100 border-red-400';
            case 'Solid': return 'bg-blue-950 text-blue-100 border-blue-400';
            case 'Positional': return 'bg-purple-950 text-purple-100 border-purple-400';
            case 'Tactical': return 'bg-emerald-950 text-emerald-100 border-emerald-400';
            default: return 'bg-slate-900 text-slate-300 border-slate-500';
        }
    };

    const pillClass = `px-2 py-0.5 rounded text-[10px] font-bold border shadow-sm ${getPillClasses(style)}`;

    return (
        <div 
            onClick={onPreview}
            className={`border rounded-xl p-4 transition-all duration-200 cursor-pointer group flex flex-col h-full transform hover:scale-[1.02] hover:-translate-y-1 ${getCardClasses(style)}`}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getPillClasses(style)}`}>
                    {eco.code}
                </span>
                {eco.tags?.isGambit && (
                    <span className="text-[9px] font-bold text-white uppercase tracking-wide bg-red-600 px-1.5 py-0.5 rounded shadow-sm border border-red-400">
                        Gambit
                    </span>
                )}
            </div>
            
            <h3 className="font-black text-white text-base mb-3 line-clamp-2 leading-tight drop-shadow-md tracking-tight">
                {eco.name}
            </h3>

            {/* Badges Grid - Matching Colors */}
            <div className="flex flex-wrap gap-1.5 mb-4">
                <span className={pillClass}>
                    {eco.tags?.style}
                </span>
                <span className={pillClass}>
                    {eco.tags?.structure}
                </span>
            </div>

            {/* Moves Preview */}
            <div className="mt-auto pt-3 border-t border-white/20 group-hover:border-white/40 transition-colors">
                <div className="text-xs text-white/80 font-mono truncate group-hover:text-white transition-colors">
                    {eco.moves}
                </div>
                
                <div className="mt-2 flex items-center justify-end text-xs font-bold text-white group-hover:text-white opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                    Preview <LayoutGrid size={12} className="ml-1" />
                </div>
            </div>
        </div>
    );
};

export default OpeningLibrary;