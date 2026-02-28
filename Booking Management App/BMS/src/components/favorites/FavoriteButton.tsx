import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavoriteProviders } from "@/hooks/useFavoriteProviders";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  providerId: string;
  variant?: "icon" | "button";
  className?: string;
}

export const FavoriteButton = ({
  providerId,
  variant = "icon",
  className,
}: FavoriteButtonProps) => {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavoriteProviders();

  if (!user) return null;

  const isFav = isFavorite(providerId);

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFavorite(providerId);
        }}
        className={cn(
          "h-8 w-8 rounded-full",
          isFav && "text-red-500 hover:text-red-600",
          className
        )}
      >
        <Heart
          className={cn("h-5 w-5", isFav && "fill-current")}
        />
      </Button>
    );
  }

  return (
    <Button
      variant={isFav ? "default" : "outline"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(providerId);
      }}
      className={cn(isFav && "bg-red-500 hover:bg-red-600", className)}
    >
      <Heart className={cn("h-4 w-4 mr-2", isFav && "fill-current")} />
      {isFav ? "Favorited" : "Add to Favorites"}
    </Button>
  );
};
