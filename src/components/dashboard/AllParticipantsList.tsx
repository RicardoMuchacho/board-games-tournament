import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

interface Participant {
  id: string;
  name: string;
  tournament_count: number;
}

export function AllParticipantsList() {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllParticipants();
  }, []);

  const fetchAllParticipants = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all participants from tournaments created by this user
      const { data, error } = await supabase
        .from('participants')
        .select(`
          id,
          name,
          tournament:tournaments!inner(created_by)
        `)
        .eq('tournament.created_by', user.id);

      if (error) throw error;

      // Group by participant name and count tournaments
      const participantMap = new Map<string, { id: string; count: number }>();
      
      data?.forEach((p: any) => {
        if (participantMap.has(p.name)) {
          const existing = participantMap.get(p.name)!;
          participantMap.set(p.name, { 
            id: existing.id, 
            count: existing.count + 1 
          });
        } else {
          participantMap.set(p.name, { id: p.id, count: 1 });
        }
      });

      const uniqueParticipants = Array.from(participantMap.entries()).map(
        ([name, { id, count }]) => ({
          id,
          name,
          tournament_count: count,
        })
      );

      uniqueParticipants.sort((a, b) => a.name.localeCompare(b.name));
      setParticipants(uniqueParticipants);
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Participants</CardTitle>
          <CardDescription>Loading participants...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (participants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Participants</CardTitle>
          <CardDescription>No participants yet. Create a tournament and add participants to get started.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Participants</CardTitle>
        <CardDescription>
          {participants.length} unique participant{participants.length !== 1 ? 's' : ''} across all your tournaments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {participants.map((participant) => (
            <Button
              key={participant.id}
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => navigate(`/participant/${participant.id}`)}
            >
              <User className="h-4 w-4 mr-2 flex-shrink-0" />
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="font-medium truncate w-full">{participant.name}</span>
                <span className="text-xs text-muted-foreground">
                  {participant.tournament_count} tournament{participant.tournament_count !== 1 ? 's' : ''}
                </span>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
