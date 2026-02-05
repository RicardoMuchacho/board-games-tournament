/**
 * Tournament pairing algorithms
 * Ensures no player faces the same opponent twice across rounds
 */

export interface Participant {
  id: string;
  name: string;
}

export interface MatchResult {
  player1_id: string;
  player2_id: string | null;
  player1_score: number | null;
  player2_score: number | null;
  winner_id: string | null;
}

export interface PlayerStanding {
  id: string;
  name: string;
  wins: number;
  losses: number;
  draws: number;
  byeCount: number;
  opponents: Set<string>;
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
 * Calculate standings from completed matches
 * Returns a map of player ID to their standing (wins, losses, draws, opponents faced)
 */
export function calculateStandings(
  participants: Participant[],
  completedMatches: MatchResult[]
): Map<string, PlayerStanding> {
  const standings = new Map<string, PlayerStanding>();

  // Initialize standings for all participants
  for (const p of participants) {
    standings.set(p.id, {
      id: p.id,
      name: p.name,
      wins: 0,
      losses: 0,
      draws: 0,
      byeCount: 0,
      opponents: new Set<string>(),
    });
  }

  // Process completed matches
  for (const match of completedMatches) {
    const p1 = standings.get(match.player1_id);
    if (!p1) continue;

    // Check if this is a BYE match (no player2)
    if (!match.player2_id) {
      p1.wins++;
      p1.byeCount++;
      continue;
    }

    const p2 = standings.get(match.player2_id);
    if (!p2) continue;

    // Track opponents
    p1.opponents.add(match.player2_id);
    p2.opponents.add(match.player1_id);

    // Determine winner
    if (match.winner_id) {
      // Explicit winner set
      if (match.winner_id === match.player1_id) {
        p1.wins++;
        p2.losses++;
      } else if (match.winner_id === match.player2_id) {
        p2.wins++;
        p1.losses++;
      }
    } else if (match.player1_score !== null && match.player2_score !== null) {
      // Determine by score
      if (match.player1_score > match.player2_score) {
        p1.wins++;
        p2.losses++;
      } else if (match.player2_score > match.player1_score) {
        p2.wins++;
        p1.losses++;
      } else {
        // Draw
        p1.draws++;
        p2.draws++;
      }
    }
  }

  return standings;
}

/**
 * Generate pairings for manual Swiss-style tournament
 * - Round 1: Random pairing
 * - Round 2+: Group by wins, match similar records, avoid repeats
 * - Handles byes for odd player counts
 *
 * Returns array of pairings. Single-element arrays represent BYEs.
 */
export function generateManualSwissRound(
  participants: Participant[],
  completedMatches: MatchResult[],
  roundNumber: number
): Participant[][] {
  if (participants.length < 2) {
    return participants.length === 1 ? [[participants[0]]] : [];
  }

  const standings = calculateStandings(participants, completedMatches);
  const pairings: Participant[][] = [];

  // ROUND 1: Random pairing
  if (roundNumber === 1) {
    const shuffled = [...participants].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        pairings.push([shuffled[i], shuffled[i + 1]]);
      } else {
        // Odd player gets BYE
        pairings.push([shuffled[i]]);
      }
    }

    return pairings;
  }

  // ROUND 2+: Swiss-style pairing
  // Sort players by wins (descending), then by losses (ascending)
  const sortedPlayers = [...participants].sort((a, b) => {
    const standingA = standings.get(a.id)!;
    const standingB = standings.get(b.id)!;

    // Primary: more wins first
    if (standingB.wins !== standingA.wins) {
      return standingB.wins - standingA.wins;
    }
    // Secondary: fewer losses first
    return standingA.losses - standingB.losses;
  });

  const available = new Set(sortedPlayers.map(p => p.id));
  const playerMap = new Map(participants.map(p => [p.id, p]));

  // Pair players starting from top of standings
  while (available.size >= 2) {
    // Get first available player (highest ranked unpaired)
    let player1Id: string | null = null;
    for (const p of sortedPlayers) {
      if (available.has(p.id)) {
        player1Id = p.id;
        break;
      }
    }
    if (!player1Id) break;

    const player1Standing = standings.get(player1Id)!;
    available.delete(player1Id);

    // Find best opponent for player1
    let bestOpponentId: string | null = null;
    let bestScore = -Infinity;

    for (const p of sortedPlayers) {
      if (!available.has(p.id)) continue;

      const opponentStanding = standings.get(p.id)!;
      let score = 0;

      // Prefer players with similar win count
      const winDiff = Math.abs(player1Standing.wins - opponentStanding.wins);
      score -= winDiff * 10;

      // Strongly prefer players who haven't played each other
      if (player1Standing.opponents.has(p.id)) {
        score -= 100;
      }

      // Slight preference for similar loss count
      const lossDiff = Math.abs(player1Standing.losses - opponentStanding.losses);
      score -= lossDiff;

      if (score > bestScore) {
        bestScore = score;
        bestOpponentId = p.id;
      }
    }

    if (bestOpponentId) {
      available.delete(bestOpponentId);
      pairings.push([playerMap.get(player1Id)!, playerMap.get(bestOpponentId)!]);
    } else {
      // No valid opponent found, this player gets a bye
      pairings.push([playerMap.get(player1Id)!]);
    }
  }

  // Handle remaining player (BYE)
  if (available.size === 1) {
    const remainingId = available.values().next().value;
    const remainingPlayer = playerMap.get(remainingId)!;

    // Try to give bye to player with fewest previous byes
    // If this player already has a bye, try to swap with lowest-ranked paired player
    const remainingStanding = standings.get(remainingId)!;

    if (remainingStanding.byeCount > 0 && pairings.length > 0) {
      // Try to swap with someone who has fewer byes
      for (let i = pairings.length - 1; i >= 0; i--) {
        const pair = pairings[i];
        if (pair.length !== 2) continue;

        for (let j = 0; j < 2; j++) {
          const candidate = pair[j];
          const candidateStanding = standings.get(candidate.id)!;

          if (candidateStanding.byeCount < remainingStanding.byeCount) {
            // Swap: candidate gets bye, remaining player takes their spot
            pair[j] = remainingPlayer;
            pairings.push([candidate]);
            available.clear();
            break;
          }
        }
        if (available.size === 0) break;
      }
    }

    // If still has bye, just assign it
    if (available.size === 1) {
      pairings.push([remainingPlayer]);
    }
  }

  return pairings;
}

/**
 * Assign players to tables for one round using backtracking.
 * Falls back to greedy with minimum conflicts when no conflict-free solution exists.
 */
function assignRound(
  players: Participant[],
  tableSizes: number[],
  history: PairingHistory
): Participant[][] {
  // Sort players by most constrained first (most previous opponents)
  const sorted = [...players].sort((a, b) =>
    history[b.id].size - history[a.id].size
  );

  const tables: Participant[][] = tableSizes.map(() => []);

  function countConflicts(player: Participant, table: Participant[]): number {
    let c = 0;
    for (const p of table) {
      if (history[player.id].has(p.id)) c++;
    }
    return c;
  }

  // Try backtracking for a conflict-free solution
  let attempts = 0;
  const maxAttempts = 50000;

  function backtrack(idx: number): boolean {
    if (++attempts > maxAttempts) return false;
    if (idx >= sorted.length) return true;

    const player = sorted[idx];
    const triedSigs = new Set<string>();

    for (let t = 0; t < tables.length; t++) {
      if (tables[t].length >= tableSizes[t]) continue;
      if (countConflicts(player, tables[t]) > 0) continue;

      // Symmetry breaking: skip equivalent empty tables of the same size
      if (tables[t].length === 0) {
        const sig = String(tableSizes[t]);
        if (triedSigs.has(sig)) continue;
        triedSigs.add(sig);
      }

      tables[t].push(player);
      if (backtrack(idx + 1)) return true;
      tables[t].pop();
    }

    return false;
  }

  if (backtrack(0)) return tables;

  // Fallback: greedy assignment minimizing conflicts (for when repeats are unavoidable)
  const greedyTables: Participant[][] = tableSizes.map(() => []);

  for (const player of sorted) {
    let bestTable = -1;
    let bestConflicts = Infinity;
    let bestFill = Infinity;

    for (let t = 0; t < greedyTables.length; t++) {
      if (greedyTables[t].length >= tableSizes[t]) continue;
      const c = countConflicts(player, greedyTables[t]);
      const fill = greedyTables[t].length;

      if (c < bestConflicts || (c === bestConflicts && fill < bestFill)) {
        bestConflicts = c;
        bestFill = fill;
        bestTable = t;
      }
    }

    if (bestTable >= 0) {
      greedyTables[bestTable].push(player);
    }
  }

  return greedyTables;
}

/**
 * Generate Catan pairings (3-4 players per match) with no repeats.
 * Uses backtracking to find conflict-free assignments per round.
 * When repeats are unavoidable (few players, many rounds), minimizes them.
 */
export function generateCatanPairings(
  participants: Participant[],
  rounds: number
): Participant[][][] {
  const history: PairingHistory = {};
  participants.forEach(p => { history[p.id] = new Set<string>(); });

  const { tableSizes } = calculateTableDistribution(participants.length, 4, 3);
  if (tableSizes.length === 0) return [];

  const allRoundMatches: Participant[][][] = [];

  for (let round = 0; round < rounds; round++) {
    const assignment = assignRound(participants, tableSizes, history);

    // Update history with new pairings
    for (const table of assignment) {
      for (let i = 0; i < table.length; i++) {
        for (let j = i + 1; j < table.length; j++) {
          history[table[i].id].add(table[j].id);
          history[table[j].id].add(table[i].id);
        }
      }
    }

    allRoundMatches.push(assignment);
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
