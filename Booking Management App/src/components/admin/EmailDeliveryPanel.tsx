import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mail,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface OutgoingEmail {
  id: string;
  message_id: string;
  provider: string;
  to_emails: string[];
  subject: string;
  email_type: string | null;
  status: string;
  sender_email: string | null;
  last_event: string | null;
  last_event_at: string | null;
  created_at: string;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "delivered":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Delivered
        </Badge>
      );
    case "opened":
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Eye className="h-3 w-3 mr-1" />
          Opened
        </Badge>
      );
    case "accepted":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Accepted
        </Badge>
      );
    case "bounced":
    case "hard_bounce":
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Bounced
        </Badge>
      );
    case "soft_bounced":
    case "soft_bounce":
      return (
        <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Soft Bounce
        </Badge>
      );
    case "complaint":
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Complaint
        </Badge>
      );
    case "blocked":
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Blocked
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const EmailDeliveryPanel = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: emails, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["outgoing-emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outgoing_emails")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as OutgoingEmail[];
    },
  });

  const filteredEmails = emails?.filter((email) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      email.to_emails.some((e) => e.toLowerCase().includes(query)) ||
      email.subject.toLowerCase().includes(query) ||
      email.status.toLowerCase().includes(query) ||
      email.email_type?.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: emails?.length || 0,
    delivered: emails?.filter((e) => e.status === "delivered" || e.status === "opened").length || 0,
    pending: emails?.filter((e) => e.status === "accepted").length || 0,
    failed: emails?.filter((e) => ["bounced", "hard_bounce", "blocked", "error", "complaint"].includes(e.status)).length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{stats.delivered}</p>
                <p className="text-xs text-muted-foreground">Delivered/Opened</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">Failed/Bounced</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Delivery Log
              </CardTitle>
              <CardDescription>
                Track email delivery status from Brevo
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search emails..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredEmails?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No emails sent yet</p>
              <p className="text-sm mt-1">
                Emails will appear here once they are sent via the notification system
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Event</TableHead>
                    <TableHead>Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={email.to_emails.join(", ")}>
                          {email.to_emails.join(", ")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[250px] truncate" title={email.subject}>
                          {email.subject}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {email.email_type?.replace(/_/g, " ") || "notification"}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(email.status)}</TableCell>
                      <TableCell>
                        {email.last_event_at ? (
                          <div className="text-sm">
                            <p className="capitalize">{email.last_event}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(email.last_event_at), "MMM d, HH:mm")}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {format(parseISO(email.created_at), "MMM d, HH:mm")}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Webhook Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            To receive real-time delivery updates, configure a webhook in your Brevo dashboard:
          </p>
          <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
            <li>Go to Brevo Dashboard → Settings → Webhooks</li>
            <li>Add a new transactional webhook</li>
            <li>
              URL: <code className="bg-muted px-1 rounded">https://eqbtrurgizszxdwnhhlk.supabase.co/functions/v1/brevo-webhook</code>
            </li>
            <li>Select events: delivered, opened, hard_bounce, soft_bounce, blocked, error</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailDeliveryPanel;
