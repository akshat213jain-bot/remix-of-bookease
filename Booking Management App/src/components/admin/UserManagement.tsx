import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Users, Loader2, MoreHorizontal, UserCog, Shield, Mail, Ban, UserCheck, Activity } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface UserWithRole {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  role?: string;
  status?: string;
  status_reason?: string | null;
}

interface UserActivity {
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  pending_appointments: number;
  last_appointment_date: string | null;
}

const UserManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<string>("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusReason, setStatusReason] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users with their roles and status
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<UserWithRole[]> => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone, avatar_url, created_at, status, status_reason")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!profiles || profiles.length === 0) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: roles } = await (supabase as any)
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", profiles.map(p => p.user_id));

      const roleMap = new Map(roles?.map((r: { user_id: string; role: string }) => [r.user_id, r.role]) || []);

      return profiles.map(p => ({
        ...p,
        status: (p as UserWithRole).status || "active",
        status_reason: (p as UserWithRole).status_reason,
        role: roleMap.get(p.user_id) as string | undefined,
      }));
    },
  });

  // Change user role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // First, delete existing role for this user
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: deleteError } = await (supabase as any)
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // Then insert the new role
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (insertError) throw insertError;

      // If switching to provider, ensure provider_profile exists
      if (role === "provider") {
        const { data: existingProfile } = await supabase
          .from("provider_profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingProfile) {
          const { error: profileError } = await supabase
            .from("provider_profiles")
            .insert({ user_id: userId, profession: "General", is_approved: true });
          
          if (profileError) throw profileError;
        } else {
          // Ensure existing provider profile is approved
          await supabase
            .from("provider_profiles")
            .update({ is_approved: true })
            .eq("user_id", userId);
        }
      }

      // If switching away from provider, optionally deactivate provider profile
      if (role !== "provider") {
        await supabase
          .from("provider_profiles")
          .update({ is_active: false })
          .eq("user_id", userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      toast({
        title: "Role updated",
        description: `User role has been changed to ${newRole}.`,
      });
      setRoleDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive",
      });
      console.error("Role update error:", error);
    },
  });

  // Change user status mutation (suspend/ban)
  const changeStatusMutation = useMutation({
    mutationFn: async ({ userId, status, reason }: { userId: string; status: string; reason: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          status,
          status_reason: reason || null,
          status_updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Status updated",
        description: `User status has been changed to ${newStatus}.`,
      });
      setStatusDialogOpen(false);
      setSelectedUser(null);
      setStatusReason("");
    },
    onError: (error) => {
      console.error("Status update error:", error);
      toast({
        title: "Error",
        description: `Failed to update user status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  // Filter users
  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query) ||
      user.status?.toLowerCase().includes(query)
    );
  });

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-primary/20 text-primary">Admin</Badge>;
      case "provider":
        return <Badge className="bg-accent text-accent-foreground">Provider</Badge>;
      case "user":
        return <Badge variant="secondary">User</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "suspended":
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Suspended</Badge>;
      case "banned":
        return <Badge variant="destructive">Banned</Badge>;
      case "active":
      default:
        return <Badge className="bg-green-100 text-green-700">Active</Badge>;
    }
  };

  const handleChangeRole = (user: UserWithRole) => {
    setSelectedUser(user);
    setNewRole(user.role || "user");
    setRoleDialogOpen(true);
  };

  const handleChangeStatus = (user: UserWithRole, status: string) => {
    setSelectedUser(user);
    setNewStatus(status);
    setStatusReason(user.status_reason || "");
    setStatusDialogOpen(true);
  };

  const handleSendEmail = (user: UserWithRole) => {
    setSelectedUser(user);
    setEmailSubject("");
    setEmailMessage("");
    setEmailDialogOpen(true);
  };

  const handleViewActivity = async (user: UserWithRole) => {
    setSelectedUser(user);
    setLoadingActivity(true);
    setActivityDialogOpen(true);
    
    try {
      // Fetch user's appointment statistics
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select("status, appointment_date")
        .eq("user_id", user.user_id);

      if (error) throw error;

      const activity: UserActivity = {
        total_appointments: appointments?.length || 0,
        completed_appointments: appointments?.filter(a => a.status === "completed").length || 0,
        cancelled_appointments: appointments?.filter(a => a.status === "cancelled").length || 0,
        pending_appointments: appointments?.filter(a => a.status === "pending" || a.status === "approved").length || 0,
        last_appointment_date: appointments && appointments.length > 0
          ? appointments.sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())[0].appointment_date
          : null,
      };

      setUserActivity(activity);
    } catch (error) {
      console.error("Error fetching activity:", error);
      toast({
        title: "Error",
        description: "Failed to load user activity.",
        variant: "destructive",
      });
    } finally {
      setLoadingActivity(false);
    }
  };

  const confirmRoleChange = () => {
    if (selectedUser && newRole) {
      changeRoleMutation.mutate({ userId: selectedUser.user_id, role: newRole });
    }
  };

  const confirmStatusChange = () => {
    if (selectedUser && newStatus) {
      changeStatusMutation.mutate({ 
        userId: selectedUser.user_id, 
        status: newStatus, 
        reason: statusReason 
      });
    }
  };

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async ({ email, subject, message, userName }: { email: string; subject: string; message: string; userName: string }) => {
      const response = await supabase.functions.invoke("send-notification", {
        body: {
          user_id: selectedUser?.user_id,
          type: "info",
          title: subject,
          message: message,
          send_email: true,
          recipient_email: email,
          recipient_name: userName,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: (data: any) => {
      const messageId = data?.email?.messageId as string | undefined;
      const accepted = data?.email?.accepted as boolean | undefined;
      toast({
        title: "Email sent",
        description: accepted === false
          ? `Email provider did not accept the message. Please verify your sender in Brevo.`
          : `Email accepted for delivery to ${selectedUser?.email}${messageId ? ` (id: ${messageId})` : ""}.`,
      });
      setEmailDialogOpen(false);
      setSelectedUser(null);
      setEmailSubject("");
      setEmailMessage("");
    },
    onError: (error) => {
      console.error("Email error:", error);
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const confirmSendEmail = () => {
    if (selectedUser && emailSubject && emailMessage) {
      sendEmailMutation.mutate({
        email: selectedUser.email,
        subject: emailSubject,
        message: emailMessage,
        userName: selectedUser.full_name || "User",
      });
    }
  };

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
              <Users className="h-5 w-5" />
              All Users
              <Badge variant="secondary">{users.length}</Badge>
              {users.filter(u => u.status === "suspended" || u.status === "banned").length > 0 && (
                <Badge variant="destructive">
                  {users.filter(u => u.status === "suspended" || u.status === "banned").length} restricted
                </Badge>
              )}
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.slice(0, 50).map((user) => (
                  <TableRow key={user.user_id} className={user.status === "banned" ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {user.full_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.phone || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(parseISO(user.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleChangeRole(user)}>
                            <UserCog className="h-4 w-4 mr-2" />
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendEmail(user)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status === "active" && (
                            <>
                              <DropdownMenuItem onClick={() => handleChangeStatus(user, "suspended")}>
                                <Ban className="h-4 w-4 mr-2 text-amber-600" />
                                Suspend User
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleChangeStatus(user, "banned")}
                                className="text-destructive"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Ban User
                              </DropdownMenuItem>
                            </>
                          )}
                          {(user.status === "suspended" || user.status === "banned") && (
                            <DropdownMenuItem onClick={() => handleChangeStatus(user, "active")}>
                              <UserCheck className="h-4 w-4 mr-2 text-green-600" />
                              Reactivate User
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleViewActivity(user)}>
                            <Activity className="h-4 w-4 mr-2" />
                            View Activity
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="provider">Provider</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            {newRole === "admin" && (
              <p className="text-sm text-amber-600 mt-2">
                ⚠️ Admin users have full access to all system features.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmRoleChange} 
              disabled={changeRoleMutation.isPending}
            >
              {changeRoleMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog (Suspend/Ban) */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newStatus === "active" ? "Reactivate User" : newStatus === "suspended" ? "Suspend User" : "Ban User"}
            </DialogTitle>
            <DialogDescription>
              {newStatus === "active" 
                ? `Reactivate ${selectedUser?.full_name || selectedUser?.email}'s account`
                : `${newStatus === "suspended" ? "Suspend" : "Ban"} ${selectedUser?.full_name || selectedUser?.email}'s account`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {newStatus !== "active" && (
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder={`Enter reason for ${newStatus === "suspended" ? "suspension" : "banning"}...`}
                  rows={3}
                />
              </div>
            )}
            {newStatus === "banned" && (
              <p className="text-sm text-destructive">
                ⚠️ Banned users cannot access the platform. This action can be reversed.
              </p>
            )}
            {newStatus === "suspended" && (
              <p className="text-sm text-amber-600">
                ⚠️ Suspended users will have limited access. You can reactivate them later.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmStatusChange} 
              disabled={changeStatusMutation.isPending}
              variant={newStatus === "banned" ? "destructive" : newStatus === "active" ? "default" : "outline"}
            >
              {changeStatusMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {newStatus === "active" ? "Reactivate" : newStatus === "suspended" ? "Suspend" : "Ban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email to User</DialogTitle>
            <DialogDescription>
              Send an email to {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Enter email subject..."
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Enter your message..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmSendEmail} 
              disabled={sendEmailMutation.isPending || !emailSubject || !emailMessage}
            >
              {sendEmailMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Activity Dialog */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Activity</DialogTitle>
            <DialogDescription>
              Activity summary for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingActivity ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : userActivity ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Total Appointments</p>
                    <p className="text-2xl font-bold">{userActivity.total_appointments}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{userActivity.completed_appointments}</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Pending/Approved</p>
                    <p className="text-2xl font-bold text-amber-600">{userActivity.pending_appointments}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Cancelled</p>
                    <p className="text-2xl font-bold text-red-600">{userActivity.cancelled_appointments}</p>
                  </div>
                </div>
                {userActivity.last_appointment_date && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground">Last Appointment</p>
                    <p className="font-medium">{format(parseISO(userActivity.last_appointment_date), "MMMM d, yyyy")}</p>
                  </div>
                )}
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">Account Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(selectedUser?.status)}
                    {selectedUser?.status_reason && (
                      <span className="text-sm text-muted-foreground">- {selectedUser.status_reason}</span>
                    )}
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">{selectedUser?.created_at ? format(parseISO(selectedUser.created_at), "MMMM d, yyyy") : "Unknown"}</p>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No activity data available</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserManagement;
