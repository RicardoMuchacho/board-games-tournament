import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, User } from "lucide-react";

interface Participant {
  id: string;
  name: string;
  phone: string | null;
  checked_in: boolean;
}

const CheckIn = () => {
  const { token } = useParams<{ token: string }>();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tournamentName, setTournamentName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchParticipants();
  }, [token]);

  const fetchParticipants = async () => {
    if (!token) {
      setError("Invalid check-in link");
      setLoading(false);
      return;
    }

    try {
      const { data, error: funcError } = await supabase.functions.invoke("get-checkin-data", {
        body: null,
        headers: {},
      });

      // Use query params approach via fetch since supabase.functions.invoke doesn't support query params easily
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-checkin-data?token=${token}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Tournament not found");
        setLoading(false);
        return;
      }

      const responseData = await response.json();
      setTournamentName(responseData.tournament.name);
      setParticipants(responseData.participants || []);
    } catch (err) {
      console.error("Error fetching check-in data:", err);
      setError("Failed to load check-in data");
    } finally {
      setLoading(false);
    }
  };

  const maskName = (name: string): string => {
    const parts = name.trim().split(" ");
    if (parts.length === 1) {
      return parts[0];
    }
    // First name + first letter of surname(s)
    const firstName = parts[0];
    const surnameInitials = parts.slice(1).map(s => s.charAt(0).toUpperCase()).join("");
    return `${firstName} ${surnameInitials}.`;
  };

  const maskPhone = (phone: string | null): string => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 2) return "";
    return `***${digits.slice(-2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-destructive text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">{tournamentName}</CardTitle>
            <p className="text-center text-muted-foreground">
              Check-in Status - Find your name below
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    participant.checked_in
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-muted/30 border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{maskName(participant.name)}</span>
                      {participant.phone && (
                        <span className="text-muted-foreground ml-2 text-sm">
                          ({maskPhone(participant.phone)})
                        </span>
                      )}
                    </div>
                  </div>
                  {participant.checked_in ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
            {participants.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No participants registered yet
              </p>
            )}
            <div className="mt-6 pt-4 border-t text-center text-sm text-muted-foreground">
              <p>
                Checked in: {participants.filter(p => p.checked_in).length} / {participants.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckIn;
