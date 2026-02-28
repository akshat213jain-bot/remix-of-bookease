import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Flame, Award, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface UserBadge {
    badge_id: string;
    earned_at: string;
    badges: {
        name: string;
        description: string;
        icon: string;
        category: string;
        points_reward: number;
    };
}

interface BadgeStats {
    bookings_count: number;
    reviews_count: number;
    referrals_count: number;
    streak_days: number;
}

interface NewBadge {
    badge_id: string;
    badge_name: string;
    badge_icon: string;
    points: number;
}

export const BadgesDisplay = () => {
    const [badges, setBadges] = useState<UserBadge[]>([]);
    const [stats, setStats] = useState<BadgeStats | null>(null);
    const [newBadges, setNewBadges] = useState<NewBadge[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const { toast } = useToast();

    const loadBadges = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("check-badge-eligibility");

            if (error) throw error;

            setBadges(data.all_badges || []);
            setStats(data.stats);

            if (data.new_badges?.length > 0) {
                setNewBadges(data.new_badges);
                data.new_badges.forEach((badge: NewBadge) => {
                    toast({
                        title: `🎉 New Badge: ${badge.badge_name}`,
                        description: `You earned ${badge.points} points!`,
                    });
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to load badges",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadBadges();
    }, []);

    const checkForNewBadges = async () => {
        setIsChecking(true);
        await loadBadges();
        setIsChecking(false);
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "booking":
                return <Star className="h-4 w-4" />;
            case "review":
                return <Award className="h-4 w-4" />;
            case "referral":
                return <Trophy className="h-4 w-4" />;
            case "loyalty":
                return <Flame className="h-4 w-4" />;
            default:
                return <Star className="h-4 w-4" />;
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case "booking":
                return "bg-blue-100 text-blue-700";
            case "review":
                return "bg-purple-100 text-purple-700";
            case "referral":
                return "bg-green-100 text-green-700";
            case "loyalty":
                return "bg-orange-100 text-orange-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            {stats && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-yellow-500" />
                            Your Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-primary">{stats.bookings_count}</div>
                                <div className="text-sm text-muted-foreground">Bookings</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">{stats.reviews_count}</div>
                                <div className="text-sm text-muted-foreground">Reviews</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{stats.referrals_count}</div>
                                <div className="text-sm text-muted-foreground">Referrals</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">{stats.streak_days}</div>
                                <div className="text-sm text-muted-foreground">Day Streak</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Badges */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Award className="h-5 w-5 text-primary" />
                                Your Badges
                            </CardTitle>
                            <CardDescription>
                                {badges.length} badges earned
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={checkForNewBadges}
                            disabled={isChecking}
                        >
                            {isChecking ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Check for New
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {badges.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No badges earned yet</p>
                            <p className="text-sm">Complete bookings, write reviews, and refer friends to earn badges!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {badges.map((userBadge) => (
                                <div
                                    key={userBadge.badge_id}
                                    className={cn(
                                        "relative p-4 rounded-xl border-2 text-center transition-all hover:scale-105",
                                        newBadges.some((b) => b.badge_id === userBadge.badge_id)
                                            ? "border-yellow-400 bg-yellow-50 animate-pulse"
                                            : "border-border bg-muted/30"
                                    )}
                                >
                                    {newBadges.some((b) => b.badge_id === userBadge.badge_id) && (
                                        <Badge className="absolute -top-2 -right-2 bg-yellow-500">NEW</Badge>
                                    )}
                                    <div className="text-4xl mb-2">{userBadge.badges.icon}</div>
                                    <h4 className="font-semibold text-sm">{userBadge.badges.name}</h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {userBadge.badges.description}
                                    </p>
                                    <div className="flex items-center justify-center gap-1 mt-2">
                                        <Badge
                                            variant="secondary"
                                            className={cn("text-xs", getCategoryColor(userBadge.badges.category))}
                                        >
                                            {getCategoryIcon(userBadge.badges.category)}
                                            <span className="ml-1">{userBadge.badges.category}</span>
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2">
                                        +{userBadge.badges.points_reward} pts
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
