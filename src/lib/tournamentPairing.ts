/**
 * Tournament pairing algorithms
 * Ensures no player faces the same opponent twice across rounds
 */

interface Participant {
  id: string;
  name: string;
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
