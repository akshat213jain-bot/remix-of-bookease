import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProviderProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";

export interface Review {
  id: string;
  user_id: string;
  provider_id: string;
  appointment_id: string;
  rating: number;
  review_text: string | null;
  is_visible: boolean;
  provider_response: string | null;
  provider_response_at: string | null;
  created_at: string;
  updated_at: string;
  user_profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface PublicReview {
  id: string;
  provider_id: string;
  rating: number;
  review_text: string | null;
  is_visible: boolean;
  provider_response: string | null;
  provider_response_at: string | null;
  created_at: string;
}

export interface CreateReviewInput {
  appointment_id: string;
  provider_id: string;
  rating: number;
  review_text?: string;
}

// Hook for users to manage their reviews — explicit columns (#17)
export const useUserReviews = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reviewsQuery = useQuery({
    queryKey: ["user-reviews", user?.id],
    queryFn: async (): Promise<Review[]> => {
      if (!user?.id) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("reviews")
        .select("id, user_id, provider_id, appointment_id, rating, review_text, is_visible, provider_response, provider_response_at, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const createReviewMutation = useMutation({
    mutationFn: async (input: CreateReviewInput) => {
      if (!user?.id) throw new Error("User not authenticated");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("reviews")
        .insert({
          user_id: user.id,
          provider_id: input.provider_id,
          appointment_id: input.appointment_id,
          rating: input.rating,
          review_text: input.review_text || null,
        })
        .select("id, user_id, provider_id, appointment_id, rating, review_text, created_at")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-reviews", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-appointments"] });
      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review",
        variant: "destructive",
      });
    },
  });

  const hasReview = (appointmentId: string): boolean => {
    return (reviewsQuery.data || []).some(r => r.appointment_id === appointmentId);
  };

  return {
    reviews: reviewsQuery.data || [],
    isLoading: reviewsQuery.isLoading,
    createReview: createReviewMutation.mutate,
    isCreating: createReviewMutation.isPending,
    hasReview,
  };
};

// Hook for providers to view and respond to reviews — explicit columns (#17)
export const useProviderReviews = () => {
  const { providerProfile } = useProviderProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const providerId = providerProfile?.id;

  const reviewsQuery = useQuery({
    queryKey: ["provider-reviews", providerId],
    queryFn: async (): Promise<Review[]> => {
      if (!providerId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("reviews")
        .select("id, user_id, provider_id, appointment_id, rating, review_text, is_visible, provider_response, provider_response_at, created_at, updated_at")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Batch fetch user profiles
      const userIds: string[] = [];
      data.forEach((review: Review) => {
        if (review.user_id && !userIds.includes(review.user_id)) {
          userIds.push(review.user_id);
        }
      });

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);

        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.user_id, p]));
          data.forEach((review: Review) => {
            review.user_profile = profileMap.get(review.user_id);
          });
        }
      }

      return data;
    },
    enabled: !!providerId,
  });

  const respondToReviewMutation = useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: string; response: string }) => {
      if (!providerId) throw new Error("Provider profile not found");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("reviews")
        .update({
          provider_response: response,
          provider_response_at: new Date().toISOString(),
        })
        .eq("id", reviewId)
        .eq("provider_id", providerId); // Defense-in-depth ownership filter

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-reviews", providerId] });
      toast({
        title: "Response Added",
        description: "Your response has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add response",
        variant: "destructive",
      });
    },
  });

  const averageRating = reviewsQuery.data?.length
    ? reviewsQuery.data.reduce((sum, r) => sum + r.rating, 0) / reviewsQuery.data.length
    : 0;

  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
    rating,
    count: (reviewsQuery.data || []).filter(r => r.rating === rating).length,
  }));

  return {
    reviews: reviewsQuery.data || [],
    isLoading: reviewsQuery.isLoading,
    respondToReview: respondToReviewMutation.mutate,
    isResponding: respondToReviewMutation.isPending,
    averageRating,
    totalReviews: reviewsQuery.data?.length || 0,
    ratingDistribution,
  };
};

// Fix #4: Public reviews now use reviews_public view — no user_id or appointment_id exposed
export const usePublicProviderReviews = (providerId?: string) => {
  const reviewsQuery = useQuery({
    queryKey: ["public-reviews", providerId],
    queryFn: async (): Promise<PublicReview[]> => {
      if (!providerId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("reviews_public")
        .select("id, provider_id, rating, review_text, is_visible, provider_response, provider_response_at, created_at")
        .eq("provider_id", providerId)
        .eq("is_visible", true)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data || [];
    },
    enabled: !!providerId,
  });

  return {
    reviews: reviewsQuery.data || [],
    isLoading: reviewsQuery.isLoading,
  };
};
