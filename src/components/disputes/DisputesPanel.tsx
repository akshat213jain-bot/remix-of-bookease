import { useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisputes, Dispute } from "@/hooks/useDisputes";
import { useAuth } from "@/contexts/AuthContext";

export const DisputesPanel = () => {
  const { role } = useAuth();
  const { disputes, isLoading, resolveDispute, isResolving } = useDisputes();
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState("");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive">Open</Badge>;
      case "in_progress":
        return <Badge variant="secondary">In Progress</Badge>;
      case "resolved":
        return <Badge className="bg-green-600">Resolved</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const handleResolve = () => {
    if (!selectedDispute || !resolution.trim()) return;

    resolveDispute(
      { disputeId: selectedDispute.id, resolution: resolution.trim() },
      {
        onSuccess: () => {
          setSelectedDispute(null);
          setResolution("");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Disputes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Disputes ({disputes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {disputes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No disputes found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map((dispute) => (
                <div
                  key={dispute.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(dispute.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">
                            {dispute.dispute_type.replace("_", " ")} Issue
                          </span>
                          {getStatusBadge(dispute.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {dispute.description.slice(0, 100)}
                          {dispute.description.length > 100 && "..."}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Filed on{" "}
                          {format(new Date(dispute.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>

                    {role === "admin" && dispute.status === "open" && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedDispute(dispute)}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>

                  {dispute.resolution && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Resolution:
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        {dispute.resolution}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedDispute}
        onOpenChange={() => setSelectedDispute(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>
              Provide a resolution for this dispute. The user will be notified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Original Complaint:</p>
              <p className="text-sm mt-1">{selectedDispute?.description}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution</Label>
              <Textarea
                id="resolution"
                placeholder="Describe the resolution..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDispute(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={!resolution.trim() || isResolving}
            >
              {isResolving ? "Resolving..." : "Mark as Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
