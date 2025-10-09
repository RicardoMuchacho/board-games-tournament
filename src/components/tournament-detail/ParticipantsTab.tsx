import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Shuffle } from "lucide-react";
import { toast } from "sonner";

interface ParticipantsTabProps {
  tournamentId: string;
  tournamentType: string;
  maxParticipants?: number;
  numberOfRounds?: number;
}

export const ParticipantsTab = ({ tournamentId, tournamentType, maxParticipants, numberOfRounds }: ParticipantsTabProps) => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchParticipants();

    const channel = supabase
      .channel(`participants-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `tournament_id=eq.${tournamentId}` },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("name");

    if (error) {
      toast.error("Failed to load participants");
      return;
    }
    setParticipants(data || []);
  };

  const addParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    if (newName.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }

    if (newName.trim().length > 100) {
      toast.error("Name must be less than 100 characters");
      return;
    }

    if (maxParticipants && participants.length >= maxParticipants) {
      toast.error(`Maximum number of participants (${maxParticipants}) reached`);
      return;
    }

    const { error } = await supabase.from("participants").insert([
      {
        tournament_id: tournamentId,
        name: newName.trim(),
      },
    ]);

    if (error) {
      toast.error(error.message || "Failed to add participant");
      return;
    }

    setNewName("");
    toast.success("Participant added");
  };

  const deleteParticipant = async (id: string) => {
    const { error } = await supabase.from("participants").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove participant");
      return;
    }
    toast.success("Participant removed");
  };

  const generateMatches = async () => {
    if (tournamentType === "catan") {
      if (participants.length < 3) {
        toast.error("Catan needs at least 3 participants");
        return;
      }
    } else if (participants.length < 2) {
      toast.error("Need at least 2 participants");
      return;
    }

    setLoading(true);
    try {
      // Delete existing matches and match_participants
      await supabase.from("matches").delete().eq("tournament_id", tournamentId);

      const matches: any[] = [];
      const matchParticipants: any[] = [];
      const rounds = numberOfRounds || 1;

      if (tournamentType === "catan") {
        // Catan: create matches with 3-4 players each for all rounds
        const roundPlayerAssignments: { [round: number]: any[][] } = {};
        
        for (let round = 1; round <= rounds; round++) {
          const shuffled = [...participants].sort(() => Math.random() - 0.5);
          const roundMatches: any[][] = [];
          
          for (let i = 0; i < shuffled.length; i += 4) {
            const matchPlayers = shuffled.slice(i, Math.min(i + 4, shuffled.length));
            
            // Only create match if we have at least 3 players
            if (matchPlayers.length >= 3) {
              roundMatches.push(matchPlayers);
              matches.push({
                tournament_id: tournamentId,
                round: round,
                player1_id: matchPlayers[0]?.id,
                player2_id: matchPlayers[1]?.id,
                player3_id: matchPlayers[2]?.id,
                player4_id: matchPlayers[3]?.id || null,
                status: "pending",
              });
            }
          }
          
          roundPlayerAssignments[round] = roundMatches;
        }

        // Insert matches first
        const { data: insertedMatches, error: matchError } = await supabase
          .from("matches")
          .insert(matches)
          .select();
        
        if (matchError) throw matchError;

        // Now create match_participants using the same player assignments
        if (insertedMatches) {
          for (let round = 1; round <= rounds; round++) {
            const roundMatches = insertedMatches.filter(m => m.round === round);
            const roundPlayersList = roundPlayerAssignments[round];
            
            for (let i = 0; i < roundMatches.length; i++) {
              const match = roundMatches[i];
              const matchPlayers = roundPlayersList[i];

              for (const player of matchPlayers) {
                matchParticipants.push({
                  match_id: match.id,
                  participant_id: player.id,
                  victory_points: 0,
                  tournament_points: 0,
                });
              }
            }
          }

          // Insert match_participants
          if (matchParticipants.length > 0) {
            // @ts-ignore - match_participants table type not yet in generated types
            const { error: mpError } = await (supabase as any)
              .from("match_participants")
              .insert(matchParticipants);
            if (mpError) throw mpError;
          }
        }

        toast.success(`Generated ${matches.length} matches across ${rounds} round${rounds > 1 ? 's' : ''}`);
      } else if (tournamentType === "round_robin") {
        // Round robin: everyone plays everyone
        for (let i = 0; i < participants.length; i++) {
          for (let j = i + 1; j < participants.length; j++) {
            matches.push({
              tournament_id: tournamentId,
              round: 1,
              player1_id: participants[i].id,
              player2_id: participants[j].id,
              status: "pending",
            });
          }
        }

        const { error } = await supabase.from("matches").insert(matches);
        if (error) throw error;

        toast.success(`Generated ${matches.length} matches`);
      } else if (tournamentType === "eliminatory") {
        // Single elimination bracket
        const shuffled = [...participants].sort(() => Math.random() - 0.5);
        for (let i = 0; i < shuffled.length; i += 2) {
          if (i + 1 < shuffled.length) {
            matches.push({
              tournament_id: tournamentId,
              round: 1,
              player1_id: shuffled[i].id,
              player2_id: shuffled[i + 1].id,
              status: "pending",
            });
          }
        }

        const { error } = await supabase.from("matches").insert(matches);
        if (error) throw error;

        toast.success(`Generated ${matches.length} matches`);
      } else {
        // Swiss: pair players for each round
        for (let round = 1; round <= rounds; round++) {
          const shuffled = [...participants].sort(() => Math.random() - 0.5);
          for (let i = 0; i < shuffled.length; i += 2) {
            if (i + 1 < shuffled.length) {
              matches.push({
                tournament_id: tournamentId,
                round: round,
                player1_id: shuffled[i].id,
                player2_id: shuffled[i + 1].id,
                status: "pending",
              });
            }
          }
        }

        const { error } = await supabase.from("matches").insert(matches);
        if (error) throw error;

        toast.success(`Generated ${matches.length} matches across ${rounds} round${rounds > 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error("Match generation error:", error);
      toast.error("Failed to generate matches");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={addParticipant} className="flex gap-2">
            <Input
              placeholder="Participant name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button type="submit" className="gap-2">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {participants.length} {maxParticipants ? `/ ${maxParticipants}` : ""} Participants
        </h3>
        <Button onClick={generateMatches} disabled={loading || participants.length < 2} className="gap-2">
          <Shuffle className="h-4 w-4" />
          Generate Matches
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {participants.map((participant) => (
          <Card key={participant.id}>
            <CardContent className="flex items-center justify-between p-4">
              <span className="font-medium">{participant.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => deleteParticipant(participant.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
