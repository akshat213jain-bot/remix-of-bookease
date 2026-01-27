import { useState } from "react";
import {
  Scale,
  Star,
  MapPin,
  Clock,
  DollarSign,
  Video,
  BadgeCheck,
  X,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  useProviderComparison,
  ComparisonProvider,
} from "@/hooks/useProviderComparison";
import { formatCurrency } from "@/lib/currency";

export const ProviderComparisonTool = () => {
  const {
    allProviders,
    selectedProviders,
    selectedIds,
    toggleProvider,
    clearSelection,
    isLoading,
  } = useProviderComparison();

  const [showSelector, setShowSelector] = useState(false);
  const [search, setSearch] = useState("");

  const filteredProviders = allProviders.filter(
    (p) =>
      p.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.profession.toLowerCase().includes(search.toLowerCase()) ||
      p.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const ComparisonRow = ({
    label,
    icon: Icon,
    getValue,
  }: {
    label: string;
    icon: React.ElementType;
    getValue: (p: ComparisonProvider) => React.ReactNode;
  }) => (
    <div className="grid grid-cols-4 gap-4 py-3 border-b">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      {selectedProviders.map((p) => (
        <div key={p.id} className="text-center font-medium">
          {getValue(p)}
        </div>
      ))}
      {Array(3 - selectedProviders.length)
        .fill(null)
        .map((_, i) => (
          <div key={i} className="text-center text-muted-foreground">
            -
          </div>
        ))}
    </div>
  );

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Compare Providers
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSelector(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Provider
            </Button>
            {selectedProviders.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedProviders.length === 0 ? (
            <div className="text-center py-12">
              <Scale className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">
                Select up to 3 providers to compare
              </p>
              <Button
                className="mt-4"
                onClick={() => setShowSelector(true)}
              >
                Select Providers
              </Button>
            </div>
          ) : (
            <div>
              {/* Provider Headers */}
              <div className="grid grid-cols-4 gap-4 pb-4 border-b">
                <div />
                {selectedProviders.map((p) => (
                  <div key={p.id} className="text-center relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => toggleProvider(p.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <Avatar className="h-16 w-16 mx-auto mb-2">
                      <AvatarImage src={p.profile?.avatar_url || ""} />
                      <AvatarFallback>
                        {getInitials(p.profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-medium">{p.profile?.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.profession}
                    </p>
                    {p.is_verified && (
                      <Badge variant="secondary" className="mt-1">
                        <BadgeCheck className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                ))}
                {Array(3 - selectedProviders.length)
                  .fill(null)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-center border-2 border-dashed rounded-lg h-32 cursor-pointer hover:border-primary"
                      onClick={() => setShowSelector(true)}
                    >
                      <Plus className="h-8 w-8 text-muted-foreground" />
                    </div>
                  ))}
              </div>

              {/* Comparison Rows */}
              <ComparisonRow
                label="Rating"
                icon={Star}
                getValue={(p) => (
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span>{p.average_rating?.toFixed(1) || "N/A"}</span>
                    <span className="text-muted-foreground text-xs">
                      ({p.total_reviews || 0})
                    </span>
                  </div>
                )}
              />

              <ComparisonRow
                label="Experience"
                icon={Clock}
                getValue={(p) => `${p.years_of_experience || 0} years`}
              />

              <ComparisonRow
                label="Location"
                icon={MapPin}
                getValue={(p) => p.location || "Not specified"}
              />

              <ComparisonRow
                label="In-Person Fee"
                icon={DollarSign}
                getValue={(p) =>
                  p.consultation_fee
                    ? formatCurrency(p.consultation_fee)
                    : "N/A"
                }
              />

              <ComparisonRow
                label="Video Fee"
                icon={Video}
                getValue={(p) =>
                  p.video_enabled && p.video_consultation_fee
                    ? formatCurrency(p.video_consultation_fee)
                    : "N/A"
                }
              />

              <ComparisonRow
                label="Specialty"
                icon={BadgeCheck}
                getValue={(p) => p.specialty || "General"}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Selector Dialog */}
      <Dialog open={showSelector} onOpenChange={setShowSelector}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Providers to Compare</DialogTitle>
          </DialogHeader>

          <Input
            placeholder="Search providers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />

          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredProviders.map((provider) => (
                <div
                  key={provider.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedIds.includes(provider.id)
                      ? "bg-primary/10 border border-primary"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => toggleProvider(provider.id)}
                >
                  <Avatar>
                    <AvatarImage src={provider.profile?.avatar_url || ""} />
                    <AvatarFallback>
                      {getInitials(provider.profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      {provider.profile?.full_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {provider.profession}
                      {provider.specialty && ` · ${provider.specialty}`}
                    </p>
                  </div>
                  {provider.is_verified && (
                    <BadgeCheck className="h-5 w-5 text-primary" />
                  )}
                  {selectedIds.includes(provider.id) && (
                    <Badge>Selected</Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowSelector(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
