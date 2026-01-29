import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Sparkles, Clock, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ServicePackage {
    id: string;
    name: string;
    description: string;
    services: {
        service_id: string;
        service_name: string;
        quantity: number;
    }[];
    original_price: number;
    discounted_price: number;
    savings_amount: number;
    savings_percentage: number;
    valid_days: number;
    is_featured: boolean;
    provider: {
        full_name: string;
    };
}

interface ServicePackageCardProps {
    pkg: ServicePackage;
    onPurchase?: () => void;
}

export const ServicePackageCard = ({ pkg, onPurchase }: ServicePackageCardProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handlePurchase = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("purchase-package", {
                body: { package_id: pkg.id },
            });

            if (error) throw error;

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to purchase package",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className={cn(
            "relative overflow-hidden transition-all hover:shadow-lg",
            pkg.is_featured && "border-primary ring-2 ring-primary/20"
        )}>
            {pkg.is_featured && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-lg">
                    <Sparkles className="h-3 w-3 inline mr-1" />
                    Featured
                </div>
            )}

            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    {pkg.name}
                </CardTitle>
                <CardDescription>
                    by {pkg.provider?.full_name || "Provider"}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{pkg.description}</p>

                {/* Services included */}
                <div className="space-y-2">
                    <p className="text-sm font-medium">Includes:</p>
                    <ul className="space-y-1">
                        {pkg.services?.map((s, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>{s.quantity}x {s.service_name}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Validity */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Valid for {pkg.valid_days} days after purchase
                </div>

                {/* Pricing */}
                <div className="rounded-lg bg-muted p-4">
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">₹{pkg.discounted_price}</span>
                        <span className="text-sm text-muted-foreground line-through">
                            ₹{pkg.original_price}
                        </span>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                            Save {pkg.savings_percentage}%
                        </Badge>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                        You save ₹{pkg.savings_amount}
                    </p>
                </div>
            </CardContent>

            <CardFooter>
                <Button
                    className="w-full"
                    onClick={handlePurchase}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Processing...
                        </>
                    ) : (
                        "Buy Package"
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
};

// My Packages Component
export const MyPackages = () => {
    const [packages, setPackages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        loadPackages();
    }, []);

    const loadPackages = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Query user_packages with related service_packages data
            const { data, error } = await supabase
                .from("user_packages" as any)
                .select(`
                    *,
                    service_packages (
                        name, description, services
                    )
                `)
                .eq("user_id", user.id)
                .eq("status", "active")
                .order("purchased_at", { ascending: false });

            if (error) throw error;
            setPackages((data as any[]) || []);
        } catch (error) {
            console.error("Error loading packages:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (packages.length === 0) {
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">No Active Packages</h3>
                    <p className="text-sm text-muted-foreground">
                        Purchase a service package to save on your bookings!
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">My Packages</h3>
            {packages.map((pkg) => (
                <Card key={pkg.id}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                            {pkg.service_packages?.name}
                        </CardTitle>
                        <CardDescription>
                            Expires: {new Date(pkg.expires_at).toLocaleDateString()}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {pkg.remaining_services?.map((s: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <span>{s.service_name}</span>
                                    <Badge variant={s.remaining > 0 ? "secondary" : "outline"}>
                                        {s.remaining} remaining
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
