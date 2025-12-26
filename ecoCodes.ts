import { OpeningCharacteristics, OpeningStyle, OpeningTheoryLevel, OpeningStructure } from './types';

export interface EcoCode {
    code: string;
    name: string;
    moves: string;
    // Derived properties
    tags?: OpeningCharacteristics; 
  }
  
  // Heuristic Engine to classify openings based on raw data
  const deriveCharacteristics = (code: string, name: string, moves: string): OpeningCharacteristics => {
      let style: OpeningStyle = 'Universal';
      let theory: OpeningTheoryLevel = 'Medium Theory';
      let structure: OpeningStructure = 'Semi-Open';
      let isGambit = false;
  
      const lowerName = name.toLowerCase();
      const lowerMoves = moves.toLowerCase();
  
      // 1. Structure Analysis
      if (moves.startsWith('1.e4 e5')) {
          structure = 'Open';
      } else if (moves.startsWith('1.d4 d5')) {
          structure = 'Closed';
      } else if (moves.startsWith('1.e4 c5') || moves.startsWith('1.d4 Nf6')) {
          structure = 'Semi-Open';
      } else if (moves.startsWith('1.c4') || moves.startsWith('1.Nf3')) {
          structure = 'Closed';
      }
  
      // 2. Style Analysis
      if (lowerName.includes('gambit') || lowerName.includes('attack')) {
          style = 'Aggressive';
          isGambit = lowerName.includes('gambit');
      } else if (lowerName.includes('system') || lowerName.includes('london') || lowerName.includes('colle')) {
          style = 'Solid';
      } else if (code.startsWith('E') || lowerName.includes('indian')) {
          style = 'Positional';
      } else if (code.startsWith('B') && (lowerName.includes('sicilian') || lowerName.includes('dragon'))) {
          style = 'Tactical';
      }
  
      // 3. Theory Analysis
      if (
          (code.startsWith('B9') && lowerName.includes('najdorf')) || // Sicilian Najdorf
          (code.startsWith('C9') && lowerName.includes('ruy lopez')) || // Closed Ruy
          (code.startsWith('E9') && lowerName.includes('king\'s indian')) || // KID
          (code.startsWith('D4')) // Semi-Slav Botvinnik etc
      ) {
          theory = 'High Theory';
      } else if (
          lowerName.includes('london') || 
          lowerName.includes('system') || 
          code.startsWith('A0') // Irregular
      ) {
          theory = 'Low Theory';
      }
  
      return { style, theory, structure, isGambit };
  };
  
  const RAW_ECO_CODES = [
    { code: "A00", name: "Irregular Openings", moves: "1.g4, 1.a3, etc." },
    { code: "A01", name: "Nimzowitsch–Larsen Attack", moves: "1.b3" },
    { code: "A02", name: "Bird Opening", moves: "1.f4" },
    { code: "A03", name: "Bird Opening", moves: "1.f4 d5" },
    { code: "A04", name: "Zukertort Opening", moves: "1.Nf3" },
    { code: "A05", name: "Zukertort Opening", moves: "1.Nf3 Nf6" },
    { code: "A07", name: "King's Indian Attack", moves: "1.Nf3 d5 2.g3" },
    { code: "A09", name: "Réti Opening", moves: "1.Nf3 d5 2.c4" },
    { code: "A10", name: "English Opening", moves: "1.c4" },
    { code: "A13", name: "English Opening", moves: "1.c4 e6" },
    { code: "A15", name: "English Opening", moves: "1.c4 Nf6" },
    { code: "A20", name: "English Opening (Reversed Sicilian)", moves: "1.c4 e5" },
    { code: "A30", name: "Symmetrical English", moves: "1.c4 c5" },
    { code: "A40", name: "Queen's Pawn Game", moves: "1.d4" },
    { code: "A41", name: "Queen's Pawn Game", moves: "1.d4 d6" },
    { code: "A43", name: "Benoni Defence", moves: "1.d4 c5" },
    { code: "A45", name: "Indian Defence", moves: "1.d4 Nf6" },
    { code: "A46", name: "Queen's Pawn Game", moves: "1.d4 Nf6 2.Nf3" },
    { code: "A48", name: "East Indian Defence", moves: "1.d4 Nf6 2.Nf3 g6" },
    { code: "A50", name: "Queen's Pawn Game", moves: "1.d4 Nf6 2.c4" },
    { code: "A51", name: "Budapest Gambit", moves: "1.d4 Nf6 2.c4 e5" },
    { code: "A53", name: "Old Indian Defence", moves: "1.d4 Nf6 2.c4 d6" },
    { code: "A56", name: "Benoni Defence", moves: "1.d4 Nf6 2.c4 c5" },
    { code: "A57", name: "Benko Gambit", moves: "1.d4 Nf6 2.c4 c5 3.d5 b5" },
    { code: "A60", name: "Modern Benoni", moves: "1.d4 Nf6 2.c4 c5 3.d5 e6" },
    { code: "A80", name: "Dutch Defence", moves: "1.d4 f5" },
    { code: "A81", name: "Dutch Defence", moves: "1.d4 f5 2.g3" },
    { code: "A82", name: "Staunton Gambit", moves: "1.d4 f5 2.e4" },
    { code: "A85", name: "Dutch Defence", moves: "1.d4 f5 2.c4 Nf6 3.Nc3" },
    { code: "A87", name: "Dutch, Leningrad Variation", moves: "1.d4 f5 2.c4 Nf6 3.g3 g6" },
    { code: "A90", name: "Dutch Defence", moves: "1.d4 f5 2.c4 Nf6 3.g3 e6" },
    { code: "B00", name: "King's Pawn Game", moves: "1.e4" },
    { code: "B01", name: "Scandinavian Defence", moves: "1.e4 d5" },
    { code: "B02", name: "Alekhine Defence", moves: "1.e4 Nf6" },
    { code: "B03", name: "Alekhine Defence", moves: "1.e4 Nf6 2.e5 Nd5 3.d4" },
    { code: "B06", name: "Modern Defence", moves: "1.e4 g6" },
    { code: "B07", name: "Pirc Defence", moves: "1.e4 d6 2.d4 Nf6" },
    { code: "B10", name: "Caro–Kann Defence", moves: "1.e4 c6" },
    { code: "B12", name: "Caro–Kann, Advance Variation", moves: "1.e4 c6 2.d4 d5 3.e5" },
    { code: "B13", name: "Caro–Kann, Exchange Variation", moves: "1.e4 c6 2.d4 d5 3.exd5 cxd5" },
    { code: "B14", name: "Caro–Kann, Panov Attack", moves: "1.e4 c6 2.d4 d5 3.exd5 cxd5 4.c4" },
    { code: "B15", name: "Caro–Kann Defence", moves: "1.e4 c6 2.d4 d5 3.Nc3" },
    { code: "B18", name: "Caro–Kann, Classical", moves: "1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5" },
    { code: "B20", name: "Sicilian Defence", moves: "1.e4 c5" },
    { code: "B21", name: "Sicilian, Grand Prix Attack", moves: "1.e4 c5 2.f4" },
    { code: "B22", name: "Alapin Sicilian", moves: "1.e4 c5 2.c3" },
    { code: "B23", name: "Closed Sicilian", moves: "1.e4 c5 2.Nc3" },
    { code: "B27", name: "Sicilian Defence", moves: "1.e4 c5 2.Nf3" },
    { code: "B30", name: "Sicilian Defence", moves: "1.e4 c5 2.Nf3 Nc6" },
    { code: "B33", name: "Sicilian, Sveshnikov", moves: "1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5" },
    { code: "B34", name: "Sicilian, Accelerated Dragon", moves: "1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 g6" },
    { code: "B40", name: "Sicilian Defence", moves: "1.e4 c5 2.Nf3 e6" },
    { code: "B45", name: "Sicilian, Taimanov", moves: "1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6 5.Nc3" },
    { code: "B50", name: "Sicilian Defence", moves: "1.e4 c5 2.Nf3 d6" },
    { code: "B51", name: "Sicilian, Moscow Variation", moves: "1.e4 c5 2.Nf3 d6 3.Bb5+" },
    { code: "B52", name: "Sicilian, Canal-Sokolsky Attack", moves: "1.e4 c5 2.Nf3 d6 3.Bb5+ Bd7" },
    { code: "B53", name: "Chekhover Sicilian", moves: "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Qxd4" },
    { code: "B70", name: "Dragon Sicilian", moves: "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6" },
    { code: "B75", name: "Dragon, Yugoslav Attack", moves: "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.f3" },
    { code: "B80", name: "Scheveningen Sicilian", moves: "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e6" },
    { code: "B90", name: "Najdorf Sicilian", moves: "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6" },
    { code: "B97", name: "Najdorf, Poisoned Pawn", moves: "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bg5 e6 7.f4 Qb6" },
    { code: "C00", name: "French Defence", moves: "1.e4 e6" },
    { code: "C01", name: "French, Exchange", moves: "1.e4 e6 2.d4 d5 3.exd5" },
    { code: "C02", name: "French, Advance", moves: "1.e4 e6 2.d4 d5 3.e5" },
    { code: "C03", name: "French, Tarrasch", moves: "1.e4 e6 2.d4 d5 3.Nd2" },
    { code: "C10", name: "French Defence", moves: "1.e4 e6 2.d4 d5 3.Nc3" },
    { code: "C11", name: "French, Classical", moves: "1.e4 e6 2.d4 d5 3.Nc3 Nf6" },
    { code: "C15", name: "French, Winawer", moves: "1.e4 e6 2.d4 d5 3.Nc3 Bb4" },
    { code: "C20", name: "Open Game", moves: "1.e4 e5" },
    { code: "C23", name: "Bishop's Opening", moves: "1.e4 e5 2.Bc4" },
    { code: "C25", name: "Vienna Game", moves: "1.e4 e5 2.Nc3" },
    { code: "C30", name: "King's Gambit", moves: "1.e4 e5 2.f4" },
    { code: "C33", name: "King's Gambit Accepted", moves: "1.e4 e5 2.f4 exf4" },
    { code: "C40", name: "King's Knight Opening", moves: "1.e4 e5 2.Nf3" },
    { code: "C41", name: "Philidor Defence", moves: "1.e4 e5 2.Nf3 d6" },
    { code: "C42", name: "Petrov Defence", moves: "1.e4 e5 2.Nf3 Nf6" },
    { code: "C44", name: "Open Game", moves: "1.e4 e5 2.Nf3 Nc6" },
    { code: "C45", name: "Scotch Game", moves: "1.e4 e5 2.Nf3 Nc6 3.d4" },
    { code: "C46", name: "Three Knights Game", moves: "1.e4 e5 2.Nf3 Nc6 3.Nc3" },
    { code: "C47", name: "Four Knights Game", moves: "1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6" },
    { code: "C50", name: "Italian Game", moves: "1.e4 e5 2.Nf3 Nc6 3.Bc4" },
    { code: "C51", name: "Evans Gambit", moves: "1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4" },
    { code: "C55", name: "Two Knights Defence", moves: "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6" },
    { code: "C60", name: "Ruy Lopez", moves: "1.e4 e5 2.Nf3 Nc6 3.Bb5" },
    { code: "C65", name: "Ruy Lopez, Berlin Defence", moves: "1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6" },
    { code: "C68", name: "Ruy Lopez, Exchange", moves: "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6" },
    { code: "C70", name: "Ruy Lopez", moves: "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4" },
    { code: "C78", name: "Ruy Lopez", moves: "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.0-0" },
    { code: "C84", name: "Ruy Lopez, Closed", moves: "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.0-0 Be7" },
    { code: "C88", name: "Ruy Lopez, Closed", moves: "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.0-0 Be7 6.Re1 b5 7.Bb3" },
    { code: "C89", name: "Ruy Lopez, Marshall Attack", moves: "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.0-0 Be7 6.Re1 b5 7.Bb3 0-0 8.c3 d5" },
    { code: "C92", name: "Ruy Lopez, Closed", moves: "1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.0-0 Be7 6.Re1 b5 7.Bb3 0-0 8.c3 d6 9.h3" },
    { code: "D00", name: "Queen's Pawn Game", moves: "1.d4 d5" },
    { code: "D02", name: "Queen's Pawn Game (London)", moves: "1.d4 d5 2.Nf3" },
    { code: "D06", name: "Queen's Gambit", moves: "1.d4 d5 2.c4" },
    { code: "D07", name: "Chigorin Defence", moves: "1.d4 d5 2.c4 Nc6" },
    { code: "D08", name: "Albin Countergambit", moves: "1.d4 d5 2.c4 e5" },
    { code: "D10", name: "Slav Defence", moves: "1.d4 d5 2.c4 c6" },
    { code: "D20", name: "Queen's Gambit Accepted", moves: "1.d4 d5 2.c4 dxc4" },
    { code: "D30", name: "Queen's Gambit Declined", moves: "1.d4 d5 2.c4 e6" },
    { code: "D32", name: "Tarrasch Defence", moves: "1.d4 d5 2.c4 e6 3.Nc3 c5" },
    { code: "D35", name: "Queen's Gambit Declined", moves: "1.d4 d5 2.c4 e6 3.Nc3 Nf6" },
    { code: "D43", name: "Semi-Slav Defence", moves: "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 c6" },
    { code: "D50", name: "Queen's Gambit Declined", moves: "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5" },
    { code: "D70", name: "Grünfeld Defence", moves: "1.d4 Nf6 2.c4 g6 3.Nc3 d5" },
    { code: "D80", name: "Grünfeld Defence", moves: "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Bg5" },
    { code: "D85", name: "Grünfeld, Exchange", moves: "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.cxd5 Nxd5" },
    { code: "D90", name: "Grünfeld Defence", moves: "1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Nf3" },
    { code: "E00", name: "Catalan Opening", moves: "1.d4 Nf6 2.c4 e6 3.g3" },
    { code: "E10", name: "Queen's Pawn Game", moves: "1.d4 Nf6 2.c4 e6 3.Nf3" },
    { code: "E11", name: "Bogo-Indian Defence", moves: "1.d4 Nf6 2.c4 e6 3.Nf3 Bb4+" },
    { code: "E12", name: "Queen's Indian Defence", moves: "1.d4 Nf6 2.c4 e6 3.Nf3 b6" },
    { code: "E20", name: "Nimzo-Indian Defence", moves: "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4" },
    { code: "E32", name: "Nimzo-Indian, Classical", moves: "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2" },
    { code: "E40", name: "Nimzo-Indian, Rubinstein", moves: "1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3" },
    { code: "E60", name: "King's Indian Defence", moves: "1.d4 Nf6 2.c4 g6" },
    { code: "E61", name: "King's Indian Defence", moves: "1.d4 Nf6 2.c4 g6 3.Nc3" },
    { code: "E70", name: "King's Indian Defence", moves: "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4" },
    { code: "E80", name: "KID, Sämisch Variation", moves: "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f3" },
    { code: "E90", name: "King's Indian Defence", moves: "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3" },
    { code: "E97", name: "KID, Classical Variation", moves: "1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 0-0 6.Be2 e5 7.0-0 Nc6" },
  ];

  // Enrich the raw data with derived tags
  export const ECO_CODES: EcoCode[] = RAW_ECO_CODES.map(eco => ({
      ...eco,
      tags: deriveCharacteristics(eco.code, eco.name, eco.moves)
  }));