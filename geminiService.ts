import { GoogleGenAI } from "@google/genai";
import { OpponentStats, Repertoire, PersonalityProfile } from './types';

// Initialize Gemini Client
// NOTE: Ensure process.env.API_KEY is available in your environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateOpponentReport = async (
    opponentStats: OpponentStats,
    userRepertoires: Repertoire[]
): Promise<string> => {
    
    // Construct context about the user's current weapons
    const myRepertoireSummary = userRepertoires.map(r => 
        `- ${r.name} (${r.color})`
    ).join('\n');

    // Construct context about the opponent
    const opponentSummary = `
    Username: ${opponentStats.username}
    Total Games Analyzed: ${opponentStats.totalGames}
    Win Rate: ${opponentStats.winRate}%
    Estimated Style: ${opponentStats.playStyle}
    Top Openings Played:
    ${opponentStats.topOpenings.map(o => `  - ${o.name} (Played ${o.count} times, Win Rate: ${o.winRate}%)`).join('\n')}
    `;

    const prompt = `
    You are an expert Chess Coach assisting a tournament player. 
    Analyze the following opponent data and cross-reference it with my current repertoire.

    OPPONENT DATA:
    ${opponentSummary}

    MY REPERTOIRE:
    ${myRepertoireSummary}

    TASK:
    Generate a strategic "Preparation Dossier" in Markdown format.
    
    The report MUST include:
    1. **Psychological Profile**: Based on their style (${opponentStats.playStyle}) and win rate, how do they handle pressure? Are they aggressive or solid?
    2. **Opening Analysis**: Identify their favorite structures. Do they prefer open tactical games or closed maneuvering?
    3. **Repertoire Cross-Check**: 
       - Which of MY repertoires is the best fit against them?
       - Where do my openings clash favorably with their habits?
    4. **Suggested Lines (Critical)**:
       - Recommend specific variations to test against them. 
       - If my repertoire doesn't cover their pet lines, suggest a specific "Surprise Weapon" opening (name the ECO or Variation) that exploits their style (e.g., if they are passive, suggest a Gambit).
    
    Keep the tone professional, concise, and actionable. Use bullet points.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: prompt,
        });

        if (!response || !response.text) {
            throw new Error("Empty response from AI service.");
        }

        return response.text;
    } catch (error: any) {
        console.error("Gemini Generation Error:", error);
        
        let msg = "Error generating AI report.";
        if (error.message) msg += ` Details: ${error.message}`;
        if (error.status) msg += ` (Status: ${error.status})`;
        
        return `${msg} Please check your API Key configuration in the settings.`;
    }
};

export const generatePersonalityProfile = async (
    stats: OpponentStats, 
    timeControl: string
): Promise<PersonalityProfile> => {

    const statsSummary = `
    Username: ${stats.username}
    Time Control Category: ${timeControl}
    Total Games in this Category: ${stats.totalGames}
    Win Rate: ${stats.winRate}%
    Base Style Estimate: ${stats.playStyle}
    Top Openings:
    ${stats.topOpenings.map(o => `  - ${o.name} (Count: ${o.count}, Win%: ${o.winRate})`).join('\n')}
    `;

    const prompt = `
    You are a legendary Chess Psychologist and Trainer. 
    Analyze the following player statistics specifically for **${timeControl}** games.
    
    Context: 
    - If Bullet: Focus on intuition, speed, dirty flags, and tactical tricks.
    - If Blitz: Focus on the balance between calculation and intuition.
    - If Rapid/Classical: Focus on depth of planning, positional understanding, and patience.

    PLAYER STATS:
    ${statsSummary}

    Your output MUST be a valid JSON object with the following structure:
    {
      "archetype": "A creative title for their ${timeControl} style (e.g., The Bullet Berserker, The Rapid Architect)",
      "description": "A 2-3 sentence psychological description of their playstyle in this specific time control.",
      "similarGM": {
        "name": "Name of a famous Grandmaster they play like in this time control",
        "description": "Why they are similar"
      },
      "traits": {
        "aggression": number (0-100),
        "calculation": number (0-100),
        "creativity": number (0-100),
        "endgame": number (0-100)
      },
      "recommendedBooks": [
        { "title": "Book Title", "author": "Author", "reason": "Why this book fits their style" }
      ],
      "suggestedOpenings": [
        { "name": "Opening Name", "reason": "Why they should try this" }
      ]
    }

    Return ONLY the JSON. No markdown formatting.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        if (!response || !response.text) {
            throw new Error("Empty response from AI service.");
        }

        return JSON.parse(response.text) as PersonalityProfile;

    } catch (error: any) {
        console.error("Gemini Profile Generation Error:", error);
        throw new Error("Failed to generate personality profile.");
    }
};