import { ExplorerData, ExplorerSettings, OpponentStats } from './types';

const MASTERS_API = 'https://explorer.lichess.ovh/masters';
const LICHESS_API = 'https://explorer.lichess.ovh/lichess';
const MASTER_GAME_API = 'https://explorer.lichess.ovh/master/pgn';
const USER_GAMES_API = 'https://lichess.org/api/games/user';

export type TimeControlFilter = 'blitz' | 'rapid' | 'classical' | 'bullet' | 'all';

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
    console.warn("Masters API unreachable, trying fallback...");
  }

  // 2. Fallback to Lichess API (for Community games)
  try {
    const lichessRes = await fetch(`https://lichess.org/game/export/${gameId}?clocks=false&evals=false&literate=true`);
    if (lichessRes.ok) {
        return await lichessRes.text();
    }
  } catch (e) {
    console.error("Lichess API Fallback Error:", e);
  }

  return null;
};

// Modified to return PGN string but utilizing streaming internally if needed in future
// Kept simple for import compatibility
export const fetchUserGames = async (username: string, max: number = 50, token?: string): Promise<string | null> => {
    try {
        return await fetchGamesStreamed(username, max, 'all', () => {});
    } catch (error) {
        console.error("Lichess Games Error:", error);
        throw error;
    }
};

/**
 * Advanced Fetch with Streaming support for large datasets and Progress Bars.
 * Lichess returns NDJSON (Newline Delimited JSON) for multiple games.
 */
const fetchGamesStreamed = async (
    username: string, 
    max: number | 'all', 
    perfType: TimeControlFilter,
    onProgress: (count: number) => void
): Promise<string> => {
    const headers: HeadersInit = {
        'Accept': 'application/x-ndjson'
    };
    
    // Construct URL
    let url = `${USER_GAMES_API}/${username}?tags=true&clocks=false&evals=false&opening=true`;
    
    if (max !== 'all') {
        url += `&max=${max}`;
    }
    
    if (perfType !== 'all') {
        url += `&perfType=${perfType}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
        if (response.status === 404) throw new Error("User not found");
        if (response.status === 429) throw new Error("Rate limit reached. Please wait.");
        throw new Error(`Lichess API Error: ${response.statusText}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let receivedGamesCount = 0;
    let pgnAccumulator = "";
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        
        // Process all complete lines
        buffer = lines.pop() || ""; // Keep the last partial line in buffer

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const gameJson = JSON.parse(line);
                // Convert JSON back to PGN format manually for compatibility with parser
                // or just accumulate moves if we only need stats.
                // For this app, we reconstruct a basic PGN string.
                
                const white = gameJson.players.white.user?.name || "Unknown";
                const black = gameJson.players.black.user?.name || "Unknown";
                const result = gameJson.winner === 'white' ? '1-0' : (gameJson.winner === 'black' ? '0-1' : '1/2-1/2');
                const date = gameJson.createdAt ? new Date(gameJson.createdAt).toLocaleDateString().replace(/\//g, '.') : "????.??.??";
                const opening = gameJson.opening?.name || "Unknown Opening";
                const moves = gameJson.moves || "";

                const pgnEntry = `[Event "Lichess Game"]\n[Date "${date}"]\n[White "${white}"]\n[Black "${black}"]\n[Result "${result}"]\n[Opening "${opening}"]\n\n${moves} ${result}\n\n`;
                
                pgnAccumulator += pgnEntry;
                receivedGamesCount++;
                
                // Throttle progress updates to UI
                if (receivedGamesCount % 10 === 0) {
                    onProgress(receivedGamesCount);
                }
            } catch (e) {
                // Ignore parse errors for single lines
            }
        }
    }
    
    onProgress(receivedGamesCount); // Final update
    return pgnAccumulator;
};

export const analyzeOpponentStats = async (
    username: string, 
    limit: number | 'all',
    perfType: TimeControlFilter,
    onProgress: (count: number) => void
): Promise<OpponentStats | null> => {
    try {
        const pgnData = await fetchGamesStreamed(username, limit, perfType, onProgress);
        
        if (!pgnData) return null;

        const games = pgnData.split('[Event "').filter(g => g.trim().length > 0);
        
        if (games.length === 0) return null;

        const openingCounts: Record<string, { count: number, wins: number }> = {};
        let totalWins = 0;

        games.forEach(gamePgn => {
            const fullPgn = '[Event "' + gamePgn;
            const openingMatch = fullPgn.match(/\[Opening "(.*?)"\]/);
            const resultMatch = fullPgn.match(/\[Result "(.*?)"\]/);
            const whiteMatch = fullPgn.match(/\[White "(.*?)"\]/);

            const isWhite = whiteMatch && whiteMatch[1].toLowerCase() === username.toLowerCase();
            const result = resultMatch ? resultMatch[1] : '*';
            let userWon = false;
            
            if (isWhite && result === '1-0') userWon = true;
            if (!isWhite && result === '0-1') userWon = true;

            if (userWon) totalWins++;

            let opening = openingMatch ? openingMatch[1].split(':')[0] : 'Unknown';
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
            .slice(0, 10); // Analyze top 10

        const playStyle = topOpenings.some(o => o.name.includes('Gambit') || o.name.includes('Sicilian') || o.name.includes('King\'s Indian')) 
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