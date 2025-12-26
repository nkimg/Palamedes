import { ExplorerData, ExplorerSettings, OpponentStats } from './types';

const MASTERS_API = 'https://explorer.lichess.ovh/masters';
const LICHESS_API = 'https://explorer.lichess.ovh/lichess';
const MASTER_GAME_API = 'https://explorer.lichess.ovh/master/pgn';
const USER_GAMES_API = 'https://lichess.org/api/games/user';

export const fetchOpeningStats = async (fen: string, settings: ExplorerSettings): Promise<ExplorerData | null> => {
  try {
    let url = '';
    
    if (settings.source === 'masters') {
        url = `${MASTERS_API}?fen=${encodeURIComponent(fen)}&moves=10`;
    } else {
        // Lichess DB Logic
        const speeds = settings.speeds.join(',');
        const ratings = settings.ratings.join(',');
        url = `${LICHESS_API}?fen=${encodeURIComponent(fen)}&moves=10&speeds=${speeds}&ratings=${ratings}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 429) {
        console.warn("Lichess Rate Limit Reached");
        return null;
      }
      throw new Error('Failed to fetch explorer data');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Lichess Explorer Error:", error);
    return null;
  }
};

// --- SIMULATED HUMAN OPPONENT ---
// Fetches moves from Lichess DB (2000+) and picks one based on frequency
export const fetchSimulatedHumanMove = async (fen: string): Promise<string | null> => {
    // Target 2000, 2200, 2500 for "Serious Amateur" simulation
    const settings: ExplorerSettings = {
        source: 'lichess',
        speeds: ['blitz', 'rapid', 'classical'],
        ratings: [2000, 2200, 2500]
    };

    const data = await fetchOpeningStats(fen, settings);
    if (!data || !data.moves || data.moves.length === 0) return null;

    // Weighted random selection based on game count
    const moves = data.moves;
    const totalGames = moves.reduce((sum, m) => sum + (m.white + m.black + m.draws), 0);
    
    let r = Math.random() * totalGames;
    for (const move of moves) {
        const count = move.white + move.black + move.draws;
        if (r < count) {
            return move.san;
        }
        r -= count;
    }
    
    return moves[0].san; // Fallback to most popular
};

export const fetchMasterGame = async (gameId: string): Promise<string | null> => {
  if (!gameId || gameId === 'undefined') {
      console.error("fetchMasterGame called with undefined ID");
      return null;
  }

  // 1. Try Masters API (for OTB games)
  try {
    const masterRes = await fetch(`${MASTER_GAME_API}/${gameId}`);
    if (masterRes.ok) {
        return await masterRes.text();
    }
  } catch (e) {
    // Continue to fallback if network error occurs on master API
    console.warn("Masters API unreachable, trying fallback...");
  }

  // 2. Fallback to Lichess API (for Community games)
  try {
    // Uses simple GET request (no custom headers) to avoid CORS preflight issues
    // Lichess defaults to PGN text response
    const lichessRes = await fetch(`https://lichess.org/game/export/${gameId}?clocks=false&evals=false&literate=true`);
    
    if (lichessRes.ok) {
        return await lichessRes.text();
    }
  } catch (e) {
    console.error("Lichess API Fallback Error:", e);
  }

  console.warn(`Failed to fetch game ${gameId} from both Masters and Lichess.`);
  return null;
};

export const fetchUserGames = async (username: string, max: number = 50, token?: string): Promise<string | null> => {
  try {
    // Removed 'Accept' header to avoid CORS Preflight (OPTIONS) request which often fails
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${USER_GAMES_API}/${username}?max=${max}&tags=true&clocks=false&evals=false&opening=true`, {
      headers
    });

    if (!response.ok) {
        if (response.status === 401) throw new Error("Invalid API Token");
        if (response.status === 429) throw new Error("Rate Limit Reached (Wait a minute)");
        throw new Error("Failed to fetch games");
    }

    const pgn = await response.text();
    return pgn;
  } catch (error) {
    console.error("Lichess Games Error:", error);
    throw error;
  }
};

// New function to analyze opponent
export const analyzeOpponentStats = async (username: string): Promise<OpponentStats | null> => {
    try {
        // CHANGED: Increased from 20 to 100 for better sample size
        const pgnData = await fetchUserGames(username, 100); 
        if (!pgnData) return null;

        const games = pgnData.split('[Event "').filter(g => g.trim().length > 0);
        const openingCounts: Record<string, { count: number, wins: number }> = {};
        let totalWins = 0;

        games.forEach(gamePgn => {
            const fullPgn = '[Event "' + gamePgn;
            const openingMatch = fullPgn.match(/\[Opening "(.*?)"\]/);
            const resultMatch = fullPgn.match(/\[Result "(.*?)"\]/);
            const whiteMatch = fullPgn.match(/\[White "(.*?)"\]/);

            // Determine if user won
            const isWhite = whiteMatch && whiteMatch[1].toLowerCase() === username.toLowerCase();
            const result = resultMatch ? resultMatch[1] : '*';
            let userWon = false;
            if (isWhite && result === '1-0') userWon = true;
            if (!isWhite && result === '0-1') userWon = true;

            if (userWon) totalWins++;

            // Simplify opening name (e.g. "Sicilian Defense: Najdorf" -> "Sicilian Defense")
            let opening = openingMatch ? openingMatch[1].split(':')[0] : 'Unknown';
            // Further simplify
            if (opening.includes(',')) opening = opening.split(',')[0];

            if (!openingCounts[opening]) openingCounts[opening] = { count: 0, wins: 0 };
            openingCounts[opening].count++;
            if (userWon) openingCounts[opening].wins++;
        });

        const topOpenings = Object.entries(openingCounts)
            .map(([name, data]) => ({
                name,
                count: data.count,
                winRate: Math.round((data.wins / data.count) * 100)
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Simple heuristic for style
        const playStyle = topOpenings.some(o => o.name.includes('Gambit') || o.name.includes('Sicilian')) 
            ? 'Aggressive' 
            : 'Solid';

        return {
            username,
            totalGames: games.length,
            winRate: Math.round((totalWins / games.length) * 100),
            topOpenings,
            playStyle
        };

    } catch (e) {
        console.error("Analysis Error", e);
        return null;
    }
};