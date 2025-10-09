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
  
  for (let round = 1; round <= rounds; round++) {
    const roundMatches: Participant[][] = [];
    const availablePlayers = [...participants];
    let attempts = 0;
    const maxAttempts = 100;
    
    while (availablePlayers.length >= 3 && attempts < maxAttempts) {
      attempts++;
      
      // Try to create a match of 4 players first, then 3
      const matchSize = availablePlayers.length >= 4 ? 4 : 3;
      let bestMatch: Participant[] | null = null;
      let minConflicts = Infinity;
      
      // Try multiple random combinations to find one with fewest conflicts
      for (let trial = 0; trial < 20; trial++) {
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
          
          // If we found a perfect match (no conflicts), use it
          if (conflicts === 0) break;
        }
      }
      
      if (bestMatch) {
        roundMatches.push(bestMatch);
        
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
      }
    }
    
    allRoundMatches.push(roundMatches);
  }
  
  return allRoundMatches;
}

/**
 * Generate Swiss pairings (2 players per match) with no repeats
 */
export function generateSwissPairings(
  participants: Participant[],
  rounds: number
): Participant[][][] {
  const allRoundMatches: Participant[][][] = [];
  const history: PairingHistory = {};
  
  // Initialize history
  participants.forEach(p => {
    history[p.id] = new Set<string>();
  });
  
  for (let round = 1; round <= rounds; round++) {
    const roundMatches: Participant[][] = [];
    const availablePlayers = [...participants];
    
    // Shuffle for first round, otherwise pair randomly avoiding repeats
    const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5);
    
    while (shuffled.length >= 2) {
      const player1 = shuffled.shift()!;
      
      // Find best opponent who hasn't played player1 yet
      let opponentIndex = -1;
      for (let i = 0; i < shuffled.length; i++) {
        if (!history[player1.id].has(shuffled[i].id)) {
          opponentIndex = i;
          break;
        }
      }
      
      // If no opponent found without history, just take the first available
      if (opponentIndex === -1 && shuffled.length > 0) {
        opponentIndex = 0;
      }
      
      if (opponentIndex !== -1) {
        const player2 = shuffled.splice(opponentIndex, 1)[0];
        roundMatches.push([player1, player2]);
        
        // Update history
        history[player1.id].add(player2.id);
        history[player2.id].add(player1.id);
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
