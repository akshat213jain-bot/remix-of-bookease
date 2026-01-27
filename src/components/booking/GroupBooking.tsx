import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Share2, Copy, CheckCircle, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface GroupBookingCardProps {
    appointmentId: string;
    serviceName: string;
    providerName: string;
    dateTime: string;
    price: number;
}

interface Participant {
    id: string;
    user_id: string;
    status: string;
    profiles: {
        full_name: string;
        avatar_url?: string;
    };
}

export const GroupBookingCard = ({
    appointmentId,
    serviceName,
    providerName,
    dateTime,
    price,
}: GroupBookingCardProps) => {
    const [isCreating, setIsCreating] = useState(false);
    const [groupData, setGroupData] = useState<any>(null);
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const createGroupBooking = async () => {
        setIsCreating(true);
        try {
            const { data, error } = await supabase.functions.invoke("group-booking", {
                body: {
                    action: "create",
                    appointment_id: appointmentId,
                    title: `Group ${serviceName}`,
                    max_participants: 5,
                    is_public: false,
                },
            });

            if (error) throw error;

            setGroupData(data.group);
            toast({
                title: "Group Created!",
                description: "Share the code with your friends",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to create group",
                variant: "destructive",
            });
        } finally {
            setIsCreating(false);
        }
    };

    const copyShareCode = () => {
        if (groupData?.share_code) {
            navigator.clipboard.writeText(groupData.share_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({
                title: "Copied!",
                description: "Share code copied to clipboard",
            });
        }
    };

    const shareLink = groupData?.share_code
        ? `${window.location.origin}/join-group?code=${groupData.share_code}`
        : "";

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    Group Booking
                </CardTitle>
                <CardDescription>
                    Invite friends to join this appointment
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!groupData ? (
                    <div className="text-center py-6">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground mb-4">
                            Make this a group booking and invite others to join!
                        </p>
                        <Button onClick={createGroupBooking} disabled={isCreating}>
                            {isCreating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Create Group Booking
                                </>
                            )}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Share Code */}
                        <div className="rounded-lg bg-muted p-4 text-center">
                            <p className="text-sm text-muted-foreground mb-2">Share Code</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-2xl font-mono font-bold tracking-widest">
                                    {groupData.share_code}
                                </span>
                                <Button variant="ghost" size="icon" onClick={copyShareCode}>
                                    {copied ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Share Link */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Or share link</p>
                            <div className="flex gap-2">
                                <Input value={shareLink} readOnly className="text-sm" />
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        navigator.clipboard.writeText(shareLink);
                                        toast({ title: "Link copied!" });
                                    }}
                                >
                                    <Share2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center justify-between text-sm">
                            <span>Status</span>
                            <Badge variant="secondary">{groupData.status}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span>Max Participants</span>
                            <span>{groupData.max_participants}</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// Join Group Component
export const JoinGroupDialog = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [groupInfo, setGroupInfo] = useState<any>(null);
    const { toast } = useToast();

    const checkGroup = async () => {
        if (!code.trim()) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("group-booking", {
                body: {
                    action: "get",
                    share_code: code.trim(),
                },
            });

            if (error) throw error;
            setGroupInfo(data);
        } catch (error) {
            toast({
                title: "Error",
                description: "Group not found",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const joinGroup = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("group-booking", {
                body: {
                    action: "join",
                    share_code: code.trim(),
                },
            });

            if (error) throw error;

            toast({
                title: "Joined! 🎉",
                description: "You've joined the group booking",
            });
            setIsOpen(false);
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to join",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Users className="h-4 w-4" />
                    Join Group
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Join a Group Booking</DialogTitle>
                    <DialogDescription>
                        Enter the share code to join a friend's group booking
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter share code"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            className="font-mono text-lg tracking-wider"
                        />
                        <Button onClick={checkGroup} disabled={isLoading || !code.trim()}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find"}
                        </Button>
                    </div>

                    {groupInfo && (
                        <Card>
                            <CardContent className="pt-4">
                                <h4 className="font-medium">{groupInfo.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                    {groupInfo.appointments?.service_id}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="secondary">
                                        {groupInfo.group_booking_participants?.filter(
                                            (p: Participant) => p.status !== "declined"
                                        ).length || 0}
                                        /{groupInfo.max_participants} spots filled
                                    </Badge>
                                </div>

                                {/* Participants */}
                                <div className="flex -space-x-2 mt-3">
                                    {groupInfo.group_booking_participants
                                        ?.filter((p: Participant) => p.status === "confirmed")
                                        .slice(0, 5)
                                        .map((p: Participant) => (
                                            <Avatar key={p.id} className="h-8 w-8 border-2 border-background">
                                                <AvatarImage src={p.profiles?.avatar_url} />
                                                <AvatarFallback>
                                                    {p.profiles?.full_name?.[0] || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                        ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={joinGroup}
                        disabled={!groupInfo || isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Joining...
                            </>
                        ) : (
                            "Join Group"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
