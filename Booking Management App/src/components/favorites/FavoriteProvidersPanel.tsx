import { Heart, MapPin, Star, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFavoriteProviders } from "@/hooks/useFavoriteProviders";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export const FavoriteProvidersPanel = () => {
  const { favorites, isLoading, removeFavorite } = useFavoriteProviders();
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Favorite Providers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          Favorite Providers ({favorites.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {favorites.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No favorite providers yet</p>
            <p className="text-sm mt-1">
              Save your preferred providers for quick access
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/providers")}
            >
              Browse Providers
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={fav.provider?.profile?.avatar_url || ""} />
                  <AvatarFallback>
                    {getInitials(fav.provider?.profile?.full_name || "P")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {fav.provider?.profile?.full_name}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {fav.provider?.profession}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    {fav.provider?.average_rating && (
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{fav.provider.average_rating}</span>
                      </div>
                    )}
                    {fav.provider?.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{fav.provider.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => removeFavorite(fav.provider_id)}
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/providers/${fav.provider_id}`)}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
