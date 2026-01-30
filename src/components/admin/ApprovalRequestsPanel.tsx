import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  Calendar,
  ArrowUpCircle,
  CreditCard,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

type RequesterProfile = {
  full_name: string;
  email: string;
};

type BaseApprovalItem = {
  id: string;
  request_type: string;
  requester_id: string;
  status: string;
  created_at: string;
  requester_profile?: RequesterProfile;
};

type ApprovalRequestItem = BaseApprovalItem & {
  kind: "approval_request";
  related_id: string | null;
  details: Record<string, unknown>;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

type ProviderApplicationItem = BaseApprovalItem & {
  kind: "provider_application";
  provider_profile_id: string;
  related_id: string | null;
  details: {
    profession: string;
    specialty: string | null;
  };
  admin_notes: null;
  reviewed_by: null;
  reviewed_at: null;
};

type ApprovalItem = ApprovalRequestItem | ProviderApplicationItem;

const requestTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  provider_registration: { label: "Provider Registration", icon: UserPlus, color: "text-blue-600" },
  admin_registration: { label: "Admin Registration", icon: UserPlus, color: "text-purple-600" },
  reschedule: { label: "Reschedule", icon: Calendar, color: "text-amber-600" },
  account_upgrade: { label: "Account Upgrade", icon: ArrowUpCircle, color: "text-purple-600" },
  refund: { label: "Refund Request", icon: CreditCard, color: "text-red-600" },
};

const ApprovalRequestsPanel = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<ApprovalItem | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all approval requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["approval-requests"],
    queryFn: async (): Promise<ApprovalItem[]> => {
      // 1) Load explicit approval requests
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: approvalRequestsRaw, error } = await (supabase as any)
        .from("approval_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 2) Load pending provider applications directly from provider_profiles
      // (Some flows might create a provider profile without creating an approval_requests row)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: pendingProviders, error: pendingProvidersError } = await (supabase as any)
        .from("provider_profiles")
        .select("id, user_id, profession, specialty, created_at")
        .eq("is_approved", false)
        .or("is_active.is.null,is_active.eq.true")
        .order("created_at", { ascending: false });

      if (pendingProvidersError) throw pendingProvidersError;

      const approvalRequests = (approvalRequestsRaw || []) as Array<
        Omit<ApprovalRequestItem, "kind" | "requester_profile">
      >;

      // Avoid duplicates: if a pending provider_registration request exists for the same user,
      // don't also show the provider_profiles row.
      const requesterIdsWithProviderRequest = new Set(
        approvalRequests
          .filter((r) => r.request_type === "provider_registration" && r.status === "pending")
          .map((r) => r.requester_id),
      );

      const providerApplicationItems: ProviderApplicationItem[] = (pendingProviders || [])
        .filter((p: { user_id: string }) => !requesterIdsWithProviderRequest.has(p.user_id))
        .map((p: { id: string; user_id: string; profession: string; specialty: string | null; created_at: string }) => ({
          kind: "provider_application",
          id: p.id,
          provider_profile_id: p.id,
          request_type: "provider_registration",
          requester_id: p.user_id,
          related_id: p.id,
          status: "pending",
          created_at: p.created_at,
          details: {
            profession: p.profession,
            specialty: p.specialty ?? null,
          },
          admin_notes: null,
          reviewed_by: null,
          reviewed_at: null,
        }));

      // 3) Hydrate requester profiles for both sources
      const requesterIds = [
        ...new Set([
          ...approvalRequests.map((r) => r.requester_id),
          ...providerApplicationItems.map((r) => r.requester_id),
        ]),
      ];

      const { data: profiles } = requesterIds.length
        ? await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", requesterIds)
        : { data: [] as Array<{ user_id: string; full_name: string; email: string }> };

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      const approvalRequestItems: ApprovalRequestItem[] = approvalRequests.map((r) => ({
        ...(r as unknown as ApprovalRequestItem),
        kind: "approval_request",
        requester_profile: profileMap.get(r.requester_id),
      }));

      const hydratedProviderItems = providerApplicationItems.map((r) => ({
        ...r,
        requester_profile: profileMap.get(r.requester_id),
      }));

      // 4) Merge and sort by submitted date desc
      return [...approvalRequestItems, ...hydratedProviderItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    },
  });

  // Handle approval/rejection mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ item, status, notes }: { item: ApprovalItem; status: string; notes: string }) => {
      if (item.kind === "approval_request") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("approval_requests")
          .update({
            status,
            admin_notes: notes,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        if (error) throw error;

        // If this is an admin registration approval, upgrade the user's role
        if (item.request_type === "admin_registration" && status === "approved") {
          // First check if user already has admin role
          const { data: existingRole } = await supabase
            .from("user_roles")
            .select("id")
            .eq("user_id", item.requester_id)
            .eq("role", "admin")
            .maybeSingle();

          if (!existingRole) {
            // Insert admin role for the user
            const { error: roleError } = await supabase
              .from("user_roles")
              .insert({
                user_id: item.requester_id,
                role: "admin",
              });

            if (roleError) throw roleError;
          }

          // Send notification to user
          try {
            const userProfile = item.requester_profile;
            await supabase.functions.invoke("send-notification", {
              body: {
                user_id: item.requester_id,
                title: "Admin Access Approved",
                message: "Your admin registration request has been approved. You now have access to the admin dashboard.",
                type: "success",
                send_email: true,
                recipient_email: userProfile?.email,
                recipient_name: userProfile?.full_name,
              },
            });
          } catch (notifyError) {
            console.error("Failed to send admin approval notification:", notifyError);
          }
        }

        // If admin registration is rejected, send notification
        if (item.request_type === "admin_registration" && status === "rejected") {
          try {
            const userProfile = item.requester_profile;
            await supabase.functions.invoke("send-notification", {
              body: {
                user_id: item.requester_id,
                title: "Admin Access Denied",
                message: notes || "Your admin registration request has been reviewed and was not approved at this time.",
                type: "error",
                send_email: true,
                recipient_email: userProfile?.email,
                recipient_name: userProfile?.full_name,
              },
            });
          } catch (notifyError) {
            console.error("Failed to send admin rejection notification:", notifyError);
          }
        }

        return;
      }

      // provider_application: approve/reject by updating provider_profiles
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("provider_profiles")
        .update(status === "approved"
          ? { is_approved: true }
          : { is_active: false, is_approved: null } // Mark as rejected, not pending
        )
        .eq("id", item.provider_profile_id);

      if (error) throw error;

      // If provider is approved, grant the provider role
      if (status === "approved") {
        // Check if user already has provider role
        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", item.requester_id)
          .eq("role", "provider")
          .maybeSingle();

        if (!existingRole) {
          // Insert provider role for the user
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({
              user_id: item.requester_id,
              role: "provider",
            });

          if (roleError) throw roleError;
        }

        // Send notification to provider
        try {
          const userProfile = item.requester_profile;
          await supabase.functions.invoke("send-notification", {
            body: {
              user_id: item.requester_id,
              title: "Provider Access Approved",
              message: "Your provider registration has been approved. You now have access to the provider dashboard.",
              type: "success",
              send_email: true,
              recipient_email: userProfile?.email,
              recipient_name: userProfile?.full_name,
            },
          });
        } catch (notifyError) {
          console.error("Failed to send provider approval notification:", notifyError);
        }
      }

      // If provider is rejected, send notification
      if (status === "rejected") {
        try {
          const userProfile = item.requester_profile;
          await supabase.functions.invoke("send-notification", {
            body: {
              user_id: item.requester_id,
              title: "Provider Access Denied",
              message: "Your provider registration request has been reviewed and was not approved at this time.",
              type: "error",
              send_email: true,
              recipient_email: userProfile?.email,
              recipient_name: userProfile?.full_name,
            },
          });
        } catch (notifyError) {
          console.error("Failed to send provider rejection notification:", notifyError);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-providers"] });
      toast({
        title: variables.status === "approved" ? "Request approved" : "Request rejected",
        description: "The request has been processed.",
      });
      setReviewDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to process request.", variant: "destructive" });
    },
  });

  const filterRequests = (type?: string) => {
    return requests.filter((r) => {
      const matchesType = !type || type === "all" || r.request_type === type;
      const matchesSearch =
        !searchQuery ||
        r.requester_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.requester_profile?.email?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-700">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const handleReview = (request: ApprovalItem) => {
    setSelectedRequest(request);
    setAdminNotes(request.kind === "approval_request" ? request.admin_notes || "" : "");
    setReviewDialogOpen(true);
  };

  const handleApprove = () => {
    if (selectedRequest) {
      reviewMutation.mutate({ item: selectedRequest, status: "approved", notes: adminNotes });
    }
  };

  const handleReject = () => {
    if (selectedRequest) {
      reviewMutation.mutate({ item: selectedRequest, status: "rejected", notes: adminNotes });
    }
  };

  const renderRequestsTable = (filteredRequests: ApprovalItem[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Requester</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredRequests.map((request) => {
          const config = requestTypeConfig[request.request_type] || {
            label: request.request_type,
            icon: Clock,
            color: "text-gray-600",
          };
          const Icon = config.icon;

          return (
            <TableRow key={request.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <span className="text-sm font-medium">{config.label}</span>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">
                    {request.requester_profile?.full_name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {request.requester_profile?.email}
                  </p>
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(request.status)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(parseISO(request.created_at), "MMM d, yyyy h:mm a")}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => handleReview(request)}>
                  <Eye className="h-4 w-4 mr-1" />
                  Review
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Approval Requests
              {pendingCount > 0 && (
                <Badge variant="destructive">{pendingCount} pending</Badge>
              )}
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="all">
                All ({requests.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({requests.filter((r) => r.status === "pending").length})
              </TabsTrigger>
              <TabsTrigger value="provider_registration">
                Providers ({requests.filter((r) => r.request_type === "provider_registration").length})
              </TabsTrigger>
              <TabsTrigger value="admin_registration">
                Admins ({requests.filter((r) => r.request_type === "admin_registration").length})
              </TabsTrigger>
              <TabsTrigger value="reschedule">
                Reschedules ({requests.filter((r) => r.request_type === "reschedule").length})
              </TabsTrigger>
              <TabsTrigger value="refund">
                Refunds ({requests.filter((r) => r.request_type === "refund").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              {filterRequests().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No requests found
                </div>
              ) : (
                renderRequestsTable(filterRequests())
              )}
            </TabsContent>

            <TabsContent value="pending">
              {filterRequests().filter((r) => r.status === "pending").length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending requests
                </div>
              ) : (
                renderRequestsTable(filterRequests().filter((r) => r.status === "pending"))
              )}
            </TabsContent>

            <TabsContent value="provider_registration">
              {filterRequests("provider_registration").length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No provider registration requests
                </div>
              ) : (
                renderRequestsTable(filterRequests("provider_registration"))
              )}
            </TabsContent>

            <TabsContent value="admin_registration">
              {filterRequests("admin_registration").length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No admin registration requests
                </div>
              ) : (
                renderRequestsTable(filterRequests("admin_registration"))
              )}
            </TabsContent>

            <TabsContent value="reschedule">
              {filterRequests("reschedule").length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No reschedule requests
                </div>
              ) : (
                renderRequestsTable(filterRequests("reschedule"))
              )}
            </TabsContent>

            <TabsContent value="refund">
              {filterRequests("refund").length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No refund requests
                </div>
              ) : (
                renderRequestsTable(filterRequests("refund"))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Request</DialogTitle>
            <DialogDescription>
              {selectedRequest && requestTypeConfig[selectedRequest.request_type]?.label}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Requester</p>
              <p className="text-sm">{selectedRequest?.requester_profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedRequest?.requester_profile?.email}
              </p>
            </div>

            {selectedRequest?.details && Object.keys(selectedRequest.details).length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Details</p>
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(selectedRequest.details, null, 2)}
                </pre>
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-2">Admin Notes</p>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about your decision..."
                rows={3}
              />
            </div>

            {selectedRequest?.reviewed_at && (
              <div className="text-sm text-muted-foreground">
                Reviewed on {format(parseISO(selectedRequest.reviewed_at), "MMM d, yyyy h:mm a")}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            {selectedRequest?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={reviewMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button onClick={handleApprove} disabled={reviewMutation.isPending}>
                  {reviewMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApprovalRequestsPanel;
