import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDisputes } from "@/hooks/useDisputes";

interface DisputeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  providerId: string;
}

const DISPUTE_TYPES = [
  { value: "billing", label: "Billing Issue" },
  { value: "service", label: "Service Quality" },
  { value: "no_show", label: "Provider No-Show" },
  { value: "misconduct", label: "Professional Misconduct" },
  { value: "scheduling", label: "Scheduling Problem" },
  { value: "other", label: "Other" },
];

export const DisputeDialog = ({
  open,
  onOpenChange,
  appointmentId,
  providerId,
}: DisputeDialogProps) => {
  const [disputeType, setDisputeType] = useState("");
  const [description, setDescription] = useState("");
  const { createDispute, isCreating } = useDisputes();

  const handleSubmit = () => {
    if (!disputeType || !description.trim()) return;

    createDispute(
      {
        appointment_id: appointmentId,
        provider_id: providerId,
        dispute_type: disputeType,
        description: description.trim(),
      },
      {
        onSuccess: () => {
          setDisputeType("");
          setDescription("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            File a Dispute
          </DialogTitle>
          <DialogDescription>
            Please provide details about your concern. Our team will review and
            respond within 24-48 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dispute-type">Type of Issue</Label>
            <Select value={disputeType} onValueChange={setDisputeType}>
              <SelectTrigger id="dispute-type">
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                {DISPUTE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Please describe the issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Include relevant details like dates, times, and any communication
              you've had.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!disputeType || !description.trim() || isCreating}
          >
            {isCreating ? "Submitting..." : "Submit Dispute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
