import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface CheckInQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkInToken: string;
}

export const CheckInQRDialog = ({ open, onOpenChange, checkInToken }: CheckInQRDialogProps) => {
  const checkInUrl = `${window.location.origin}/check-in/${checkInToken}`;

  const copyLink = () => {
    navigator.clipboard.writeText(checkInUrl);
    toast.success("Link copied to clipboard");
  };

  const openInNewTab = () => {
    window.open(checkInUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check-In QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG value={checkInUrl} size={200} />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Scan this QR code to view check-in status. Participants can find their name to confirm registration.
          </p>
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1 gap-2" onClick={copyLink}>
              <Copy className="h-4 w-4" />
              Copy Link
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={openInNewTab}>
              <ExternalLink className="h-4 w-4" />
              Open
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
