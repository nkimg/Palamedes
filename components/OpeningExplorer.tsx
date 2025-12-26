import React, { useState } from 'react';
import { ExplorerData, ExplorerSettings } from '../types';
import { Book, Trophy, ExternalLink, Download, Users, Settings2, Check } from 'lucide-react';

interface OpeningExplorerProps {
  data: ExplorerData | null;
  loading: boolean;
  onMoveClick: (san: string) => void;
  onLoadMasterGame?: (gameId: string) => void;
  settings: ExplorerSettings;
  onUpdateSettings: (s: ExplorerSettings) => void;
}

const RATINGS_OPTIONS = [1600, 1800, 2000, 2200, 2500];
const SPEEDS_OPTIONS = ['blitz', 'rapid', 'classical'];

const OpeningExplorer: React.FC<OpeningExplorerProps> = ({ 
    data, 
    loading, 
    onMoveClick, 
    onLoadMasterGame,
    settings,
    onUpdateSettings
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const toggleRating = (r: number) => {
      const newRatings = settings.ratings.includes(r) 
        ? settings.ratings.filter(x => x !== r)
        : [...settings.ratings, r];
      // Ensure at least one rating is selected
      if (newRatings.length > 0) onUpdateSettings({ ...settings, ratings: newRatings });
  };

  const toggleSpeed = (s: string) => {
      const newSpeeds = settings.speeds.includes(s)
        ? settings.speeds.filter(x => x !== s)
        : [...settings.speeds, s];
      if (newSpeeds.length > 0) onUpdateSettings({ ...settings, speeds: newSpeeds });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50">
      {/* Header & Source Toggle */}
      <div className="bg-slate-900 border-b border-slate-800 p-2">
         <div className="flex bg-slate-800 rounded-lg p-1 mb-2">
            <button 
                onClick={() => onUpdateSettings({ ...settings, source: 'masters' })}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all ${settings.source === 'masters' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
                <Book size={14} /> Masters
            </button>
            <button 
                onClick={() => onUpdateSettings({ ...settings, source: 'lichess' })}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all ${settings.source === 'lichess' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
                <Users size={14} /> Lichess
            </button>
         </div>

         {/* Filter Toggle (Lichess Only) */}
         {settings.source === 'lichess' && (
             <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-xs border ${showFilters ? 'bg-slate-800 border-amber-600 text-amber-500' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
             >
                 <div className="flex items-center gap-2">
                    <Settings2 size={12} />
                    <span>Rating: {Math.min(...settings.ratings)}+ • {settings.speeds.length} speeds</span>
                 </div>
                 <span className="text-[10px] uppercase font-bold">{showFilters ? 'Hide' : 'Edit'}</span>
             </button>
         )}

         {/* Filters Panel */}
         {settings.source === 'lichess' && showFilters && (
             <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-800 animate-in slide-in-from-top-2">
                 <div className="mb-2">
                     <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Avg Rating</span>
                     <div className="flex flex-wrap gap-1">
                         {RATINGS_OPTIONS.map(r => (
                             <button 
                                key={r}
                                onClick={() => toggleRating(r)}
                                className={`px-2 py-1 rounded text-[10px] font-mono border ${settings.ratings.includes(r) ? 'bg-blue-900/30 border-blue-600 text-blue-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                             >
                                {r}
                             </button>
                         ))}
                     </div>
                 </div>
                 <div>
                     <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Time Control</span>
                     <div className="flex flex-wrap gap-1">
                         {SPEEDS_OPTIONS.map(s => (
                             <button 
                                key={s}
                                onClick={() => toggleSpeed(s)}
                                className={`px-2 py-1 rounded text-[10px] uppercase font-bold border ${settings.speeds.includes(s) ? 'bg-green-900/30 border-green-600 text-green-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                             >
                                {s}
                             </button>
                         ))}
                     </div>
                 </div>
             </div>
         )}
      </div>

      {/* Stats Content */}
      <div className="overflow-y-auto flex-1 p-2">
        {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                <Users className="animate-pulse mb-2" size={24} />
                <span className="text-xs">Fetching Stats...</span>
            </div>
        ) : !data || data.moves.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                <span className="text-xs">No games found.</span>
            </div>
        ) : (
            <div className="flex flex-col gap-1">
                 <div className="mb-2 text-[10px] text-slate-500 flex justify-between px-1">
                     <span>Total: {(data.white + data.draws + data.black).toLocaleString()}</span>
                     {data.averageRating && <span>Avg Elo: {data.averageRating}</span>}
                 </div>

                {data.moves.map((move) => {
                    const moveTotal = move.white + move.draws + move.black;
                    const wPct = (move.white / moveTotal) * 100;
                    const dPct = (move.draws / moveTotal) * 100;
                    const bPct = (move.black / moveTotal) * 100;

                    return (
                    <div 
                        key={move.san}
                        onClick={() => onMoveClick(move.san)}
                        className="group flex flex-col p-2 rounded hover:bg-slate-800 cursor-pointer border border-transparent hover:border-slate-700 transition-all relative overflow-hidden"
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-sm text-slate-200 group-hover:text-amber-500">{move.san}</span>
                            
                            <div className="flex items-center gap-3">
                                {move.averageRating && (
                                     <div className="flex items-center gap-1 bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-900/50">
                                         <span className="text-[9px] font-bold text-amber-600/80">ELO</span>
                                         <span className="text-[10px] font-bold text-amber-500">{move.averageRating}</span>
                                     </div>
                                )}
                                <span className="text-xs text-slate-500 font-mono min-w-[30px] text-right">{moveTotal.toLocaleString()}</span>
                            </div>
                        </div>
                        
                        {/* Bar Chart */}
                        <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-slate-700">
                        <div style={{ width: `${wPct}%` }} className="bg-slate-300" title={`White Wins: ${Math.round(wPct)}%`} />
                        <div style={{ width: `${dPct}%` }} className="bg-slate-500" title={`Draws: ${Math.round(dPct)}%`} />
                        <div style={{ width: `${bPct}%` }} className="bg-slate-800" title={`Black Wins: ${Math.round(bPct)}%`} />
                        </div>
                        
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1 opacity-60 group-hover:opacity-100">
                        <span>{Math.round(wPct)}%</span>
                        <span>{Math.round(dPct)}%</span>
                        <span>{Math.round(bPct)}%</span>
                        </div>
                    </div>
                    );
                })}
            </div>
        )}

        {/* Top Games Section */}
        {data && data.topGames && data.topGames.length > 0 && (
           <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                 <Trophy size={10} /> Top Games
              </div>
              <div className="flex flex-col gap-2">
                 {data.topGames.slice(0, 5).map(game => (
                    <div 
                      key={game.id} 
                      className="text-xs bg-slate-800 p-2 rounded hover:bg-slate-700 block transition-colors border border-slate-700/50 group"
                    >
                       <div className="flex justify-between mb-1">
                          <span className="text-slate-300 font-bold truncate max-w-[120px]">{game.white.name} ({game.white.rating})</span>
                          <span className="text-slate-500">{game.year}</span>
                       </div>
                       <div className="text-slate-400 truncate max-w-[140px]">vs {game.black.name} ({game.black.rating})</div>
                       <div className="flex justify-between items-center mt-2">
                           <div className="text-[10px] text-amber-600/70 font-bold">{game.winner === 'white' ? '1-0' : (game.winner === 'black' ? '0-1' : '1/2-1/2')}</div>
                           
                           <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               {onLoadMasterGame && (
                                   <button 
                                      onClick={(e) => { e.stopPropagation(); onLoadMasterGame(game.id); }}
                                      className="flex items-center gap-1 bg-amber-600 hover:bg-amber-500 text-white px-2 py-0.5 rounded text-[10px] font-bold"
                                      title="Import to Repertoire"
                                   >
                                      <Download size={10} /> Import
                                   </button>
                               )}
                               <a 
                                  href={`https://lichess.org/${game.id}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-slate-500 hover:text-white"
                                  title="Open in Lichess"
                               >
                                   <ExternalLink size={12} />
                               </a>
                           </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default OpeningExplorer;