import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface FavoriteProvider {
  id: string;
  user_id: string;
  provider_id: string;
  created_at: string;
  provider?: {
    id: string;
    profession: string;
    specialty: string | null;
    consultation_fee: number | null;
    average_rating: number | null;
    total_reviews: number | null;
    location: string | null;
    bio: string | null;
    profile?: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export const useFavoriteProviders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorite-providers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("favorite_providers")
        .select(`
          *,
          provider:provider_profiles(
            id,
            profession,
            specialty,
            consultation_fee,
            average_rating,
            total_reviews,
            location,
            bio,
            user_id
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      // Fetch profile info for each provider
      const providersWithProfiles = await Promise.all(
        (data || []).map(async (fav) => {
          if (fav.provider) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("user_id", fav.provider.user_id)
              .maybeSingle();
            
            return {
              ...fav,
              provider: {
                ...fav.provider,
                profile,
              },
            };
          }
          return fav;
        })
      );

      return providersWithProfiles as FavoriteProvider[];
    },
    enabled: !!user?.id,
  });

  const addFavoriteMutation = useMutation({
    mutationFn: async (providerId: string) => {
      if (!user?.id) throw new Error("Must be logged in");

      const { error } = await supabase
        .from("favorite_providers")
        .insert({ user_id: user.id, provider_id: providerId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-providers"] });
      toast({
        title: "Added to Favorites",
        description: "Provider has been added to your favorites.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (providerId: string) => {
      if (!user?.id) throw new Error("Must be logged in");

      const { error } = await supabase
        .from("favorite_providers")
        .delete()
        .eq("user_id", user.id)
        .eq("provider_id", providerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-providers"] });
      toast({
        title: "Removed from Favorites",
        description: "Provider has been removed from your favorites.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isFavorite = (providerId: string) => {
    return favorites.some((fav) => fav.provider_id === providerId);
  };

  const toggleFavorite = (providerId: string) => {
    if (isFavorite(providerId)) {
      removeFavoriteMutation.mutate(providerId);
    } else {
      addFavoriteMutation.mutate(providerId);
    }
  };

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite,
    addFavorite: addFavoriteMutation.mutate,
    removeFavorite: removeFavoriteMutation.mutate,
  };
};
