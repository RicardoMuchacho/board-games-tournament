import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface RoundQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkInToken: string;
  tournamentName: string;
  round: number;
}

export const RoundQRDialog = ({
  open,
  onOpenChange,
  checkInToken,
  tournamentName,
  round,
}: RoundQRDialogProps) => {
  const baseUrl = window.location.origin;
  const resultUrl = `${baseUrl}/match-results/${checkInToken}?round=${round}`;

  const copyLink = () => {
    navigator.clipboard.writeText(resultUrl);
    toast.success("Link copied to clipboard");
  };

  const openLink = () => {
    window.open(resultUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Round {round} Results QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            Scan to enter match results for {tournamentName}
          </p>
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG value={resultUrl} size={200} />
          </div>
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={copyLink} className="flex-1 gap-2">
              <Copy className="h-4 w-4" />
              Copy Link
            </Button>
            <Button variant="outline" onClick={openLink} className="flex-1 gap-2">
              <ExternalLink className="h-4 w-4" />
              Open
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
