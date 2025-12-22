/**
 * Tournament pairing algorithms
 * Ensures no player faces the same opponent twice across rounds
 */

export interface Participant {
  id: string;
  name: string;
}

export interface Game {
  id: string;
  name: string;
  available_tables: number;
  players_per_table: number;
  min_players: number;
}

interface PairingHistory {
  [playerId: string]: Set<string>;
}

/**
 * Track which players have faced each other
 */
function buildPairingHistory(existingMatches: any[][], participants: Participant[]): PairingHistory {
  const history: PairingHistory = {};
  
  // Initialize history for all participants
  participants.forEach(p => {
    history[p.id] = new Set<string>();
  });
  
  // Add existing pairings to history
  existingMatches.forEach(matchPlayers => {
    // For each pair of players in the match, mark them as having played together
    for (let i = 0; i < matchPlayers.length; i++) {
      for (let j = i + 1; j < matchPlayers.length; j++) {
        history[matchPlayers[i].id].add(matchPlayers[j].id);
        history[matchPlayers[j].id].add(matchPlayers[i].id);
      }
    }
  });
  
  return history;
}

/**
 * Check if a group of players have all played together before
 */
function havePlayedTogether(players: Participant[], history: PairingHistory): boolean {
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      if (history[players[i].id].has(players[j].id)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Calculate optimal table distribution for given number of players
 * Returns the number of tables with targetSize players and minSize players
 */
export function calculateTableDistribution(
  totalPlayers: number, 
  targetSize: number = 4, 
  minSize: number = 3
): { tablesOfTarget: number; tablesOfMin: number; tableSizes: number[] } {
  if (totalPlayers < minSize) {
    return { tablesOfTarget: 0, tablesOfMin: 0, tableSizes: [] };
  }

  // Try to maximize tables of targetSize
  for (let tablesOfTarget = Math.floor(totalPlayers / targetSize); tablesOfTarget >= 0; tablesOfTarget--) {
    const remaining = totalPlayers - (tablesOfTarget * targetSize);
    if (remaining === 0) {
      const tableSizes = Array(tablesOfTarget).fill(targetSize);
      return { tablesOfTarget, tablesOfMin: 0, tableSizes };
    }
    if (remaining >= minSize && remaining % minSize === 0) {
      const tablesOfMin = remaining / minSize;
      const tableSizes = [
        ...Array(tablesOfTarget).fill(targetSize),
        ...Array(tablesOfMin).fill(minSize)
      ];
      return { tablesOfTarget, tablesOfMin, tableSizes };
    }
  }
  
  // Fallback: all tables of minSize
  const tablesOfMin = Math.floor(totalPlayers / minSize);
  const tableSizes = Array(tablesOfMin).fill(minSize);
  return { tablesOfTarget: 0, tablesOfMin, tableSizes };
}

/**
 * Generate Catan pairings (3-4 players per match) with no repeats
 */
export function generateCatanPairings(
  participants: Participant[],
  rounds: number
): Participant[][][] {
  const allRoundMatches: Participant[][][] = [];
  const history: PairingHistory = {};
  
  // Initialize history
  participants.forEach(p => {
    history[p.id] = new Set<string>();
  });
  
  // Calculate optimal table distribution
  const { tableSizes } = calculateTableDistribution(participants.length, 4, 3);
  
  for (let round = 1; round <= rounds; round++) {
    const roundMatches: Participant[][] = [];
    const availablePlayers = [...participants];
    let tableIndex = 0;
    let attempts = 0;
    const maxAttempts = 1000;
    
    while (availablePlayers.length >= 3 && tableIndex < tableSizes.length && attempts < maxAttempts) {
      attempts++;
      
      // Use pre-calculated table size for this table
      const matchSize = tableSizes[tableIndex];
      let bestMatch: Participant[] | null = null;
      let minConflicts = Infinity;
      
      // Try multiple random combinations to find one with fewest conflicts
      for (let trial = 0; trial < 50; trial++) {
        const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5);
        const candidate = shuffled.slice(0, matchSize);
        
        // Count how many pairs have already played
        let conflicts = 0;
        for (let i = 0; i < candidate.length; i++) {
          for (let j = i + 1; j < candidate.length; j++) {
            if (history[candidate[i].id].has(candidate[j].id)) {
              conflicts++;
            }
          }
        }
        
        if (conflicts < minConflicts) {
          minConflicts = conflicts;
          bestMatch = candidate;
          
          // If we found a perfect match (no conflicts), use it immediately
          if (conflicts === 0) break;
        }
      }
      
      // Only accept matches with conflicts if we've tried many times
      if (bestMatch && (minConflicts === 0 || attempts > 50)) {
        roundMatches.push(bestMatch);
        tableIndex++;
        
        // Update history
        for (let i = 0; i < bestMatch.length; i++) {
          for (let j = i + 1; j < bestMatch.length; j++) {
            history[bestMatch[i].id].add(bestMatch[j].id);
            history[bestMatch[j].id].add(bestMatch[i].id);
          }
        }
        
        // Remove matched players from available pool
        bestMatch.forEach(player => {
          const index = availablePlayers.findIndex(p => p.id === player.id);
          if (index !== -1) {
            availablePlayers.splice(index, 1);
          }
        });
        
        attempts = 0; // Reset attempts counter on success
      } else if (!bestMatch) {
        // If we couldn't find any match, break to prevent infinite loop
        break;
      }
    }
    
    allRoundMatches.push(roundMatches);
  }
  
  return allRoundMatches;
}

/**
 * Generate Swiss pairings with win-based pairing
 * Winners play winners, losers play losers, avoiding rematches
 */
export function generateSwissPairings(
  participants: Participant[],
  rounds: number,
  existingMatches: any[][] = [],
  playersPerMatch: number = 2
): Participant[][][] {
  const allRoundMatches: Participant[][][] = [];
  const history: PairingHistory = buildPairingHistory(existingMatches, participants);
  
  // Track wins for each participant
  const wins: { [id: string]: number } = {};
  participants.forEach(p => wins[p.id] = 0);
  
  // Calculate current wins from existing matches
  existingMatches.forEach(matchPlayers => {
    // Assuming the first player in a completed match is the winner for initial seeding
    // In practice, this should be determined by match results
  });
  
  for (let round = 1; round <= rounds; round++) {
    const roundMatches: Participant[][] = [];
    
    // Group participants by win count
    const winGroups: { [wins: number]: Participant[] } = {};
    participants.forEach(p => {
      const w = wins[p.id] || 0;
      if (!winGroups[w]) winGroups[w] = [];
      winGroups[w].push(p);
    });
    
    const availablePlayers = [...participants];
    let attempts = 0;
    const maxAttempts = 1000;
    
    while (availablePlayers.length >= playersPerMatch && attempts < maxAttempts) {
      attempts++;
      
      let bestMatch: Participant[] | null = null;
      let minConflicts = Infinity;
      let minWinDifference = Infinity;
      
      // Try multiple combinations to find best match
      for (let trial = 0; trial < 50; trial++) {
        const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5);
        const candidate = shuffled.slice(0, playersPerMatch);
        
        // Calculate win difference (prefer similar win records)
        const candidateWins = candidate.map(p => wins[p.id] || 0);
        const maxWins = Math.max(...candidateWins);
        const minWins = Math.min(...candidateWins);
        const winDiff = maxWins - minWins;
        
        // Count conflicts (previous matchups)
        let conflicts = 0;
        for (let i = 0; i < candidate.length; i++) {
          for (let j = i + 1; j < candidate.length; j++) {
            if (history[candidate[i].id].has(candidate[j].id)) {
              conflicts++;
            }
          }
        }
        
        // Prefer matches with similar records and no conflicts
        if (conflicts < minConflicts || (conflicts === minConflicts && winDiff < minWinDifference)) {
          minConflicts = conflicts;
          minWinDifference = winDiff;
          bestMatch = candidate;
          
          // Perfect match: no conflicts and similar records
          if (conflicts === 0 && winDiff <= 1) break;
        }
      }
      
      // Accept matches with low conflicts after enough attempts
      if (bestMatch && (minConflicts === 0 || attempts > 50)) {
        roundMatches.push(bestMatch);
        
        // Update history
        for (let i = 0; i < bestMatch.length; i++) {
          for (let j = i + 1; j < bestMatch.length; j++) {
            history[bestMatch[i].id].add(bestMatch[j].id);
            history[bestMatch[j].id].add(bestMatch[i].id);
          }
        }
        
        // Remove matched players
        bestMatch.forEach(player => {
          const index = availablePlayers.findIndex(p => p.id === player.id);
          if (index !== -1) {
            availablePlayers.splice(index, 1);
          }
        });
        
        attempts = 0;
      } else if (!bestMatch) {
        break;
      }
    }
    
    allRoundMatches.push(roundMatches);
  }
  
  return allRoundMatches;
}

/**
 * Generate Round Robin pairings (everyone plays everyone once)
 */
export function generateRoundRobinPairings(participants: Participant[]): Participant[][][] {
  const matches: Participant[][] = [];
  
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      matches.push([participants[i], participants[j]]);
    }
  }
  
  // Return as single round
  return [matches];
}

/**
 * Generate Eliminatory bracket (single elimination)
 */
export function generateEliminatoryPairings(participants: Participant[]): Participant[][][] {
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const matches: Participant[][] = [];
  
  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      matches.push([shuffled[i], shuffled[i + 1]]);
    }
  }
  
  // Return as single round (first round only, subsequent rounds depend on results)
  return [matches];
}

/**
 * Generate Multi-Game pairings
 * Ensures players don't repeat opponents and don't repeat games
 */
export interface ParticipantHistory {
  playedWith: Set<string>;
  playedGames: Set<string>;
}

export function generateMultiGamePairings(
  participants: Participant[],
  games: Game[],
  history: Map<string, ParticipantHistory>
): { gameId: string; tables: Participant[][] }[] {
  const result: { gameId: string; tables: Participant[][] }[] = [];
  const availablePlayers = [...participants];
  
  // Sort games by order_index to respect configured order
  const sortedGames = [...games].sort((a, b) => {
    // If games have order_index (from DB), use that
    const aOrder = (a as any).order_index ?? 0;
    const bOrder = (b as any).order_index ?? 0;
    return aOrder - bOrder;
  });
  
  // For each participant, calculate game priority (games they haven't played)
  const getGamePriority = (playerId: string, gameId: string): number => {
    const playerHistory = history.get(playerId);
    if (!playerHistory) return 1;
    return playerHistory.playedGames.has(gameId) ? 0 : 1;
  };
  
  // Score how good a player assignment to a game is
  const scoreAssignment = (players: Participant[], gameId: string): number => {
    let score = 0;
    
    // Prefer games players haven't played
    for (const player of players) {
      score += getGamePriority(player.id, gameId) * 10;
    }
    
    // Penalize repeat opponents
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const h1 = history.get(players[i].id);
        if (h1?.playedWith.has(players[j].id)) {
          score -= 5;
        }
      }
    }
    
    return score;
  };
  
  // Assign players to each game - strictly respect available_tables limit
  for (const game of sortedGames) {
    if (availablePlayers.length < game.min_players) continue;
    
    const gameTables: Participant[][] = [];
    
    // Strictly limit to available_tables
    for (let tableIdx = 0; tableIdx < game.available_tables && availablePlayers.length >= game.min_players; tableIdx++) {
      // Determine table size - use players_per_table but allow min_players if not enough
      const tableSize = Math.min(game.players_per_table, availablePlayers.length);
      
      if (tableSize < game.min_players) break;
      
      // Find best assignment for this table
      let bestTable: Participant[] = [];
      let bestScore = -Infinity;
      
      // Try multiple random combinations
      for (let trial = 0; trial < 100; trial++) {
        const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5);
        const candidate = shuffled.slice(0, tableSize);
        const score = scoreAssignment(candidate, game.id);
        
        if (score > bestScore) {
          bestScore = score;
          bestTable = candidate;
        }
        
        // Early exit if we found a great assignment
        if (score >= tableSize * 10) break;
      }
      
      if (bestTable.length >= game.min_players) {
        gameTables.push(bestTable);
        
        // Remove assigned players from available pool
        for (const player of bestTable) {
          const idx = availablePlayers.findIndex(p => p.id === player.id);
          if (idx !== -1) availablePlayers.splice(idx, 1);
        }
      }
    }
    
    if (gameTables.length > 0) {
      result.push({ gameId: game.id, tables: gameTables });
    }
  }
  
  return result;
}
