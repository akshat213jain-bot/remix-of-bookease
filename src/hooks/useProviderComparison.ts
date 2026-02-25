import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ComparisonProvider {
  id: string;
  profession: string;
  specialty: string | null;
  bio: string | null;
  consultation_fee: number | null;
  video_consultation_fee: number | null;
  average_rating: number | null;
  total_reviews: number | null;
  years_of_experience: number | null;
  location: string | null;
  video_enabled: boolean | null;
  is_verified: boolean | null;
  profile: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export const useProviderComparison = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const providersQuery = useQuery({
    queryKey: ["providers-for-comparison"],
    queryFn: async (): Promise<ComparisonProvider[]> => {
      const { data: providers, error } = await supabase
        .from("provider_public_info")
        .select(`
          provider_id,
          user_id,
          profession,
          specialty,
          bio,
          consultation_fee,
          video_consultation_fee,
          average_rating,
          total_reviews,
          years_of_experience,
          location,
          video_enabled,
          is_verified,
          full_name,
          avatar_url
        `)
        .limit(100);

      if (error) throw error;

      return (providers || []).map(p => ({
        id: p.provider_id,
        profession: p.profession,
        specialty: p.specialty,
        bio: p.bio,
        consultation_fee: p.consultation_fee,
        video_consultation_fee: p.video_consultation_fee,
        average_rating: p.average_rating,
        total_reviews: p.total_reviews,
        years_of_experience: p.years_of_experience,
        location: p.location,
        video_enabled: p.video_enabled,
        is_verified: p.is_verified,
        profile: { full_name: p.full_name || "Unknown", avatar_url: p.avatar_url },
      })) as ComparisonProvider[];
    },
  });

  const selectedProviders = providersQuery.data?.filter((p) =>
    selectedIds.includes(p.id)
  ) || [];

  const toggleProvider = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((pId) => pId !== id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id]; // Max 3, remove oldest
      }
      return [...prev, id];
    });
  };

  const clearSelection = () => setSelectedIds([]);

  return {
    allProviders: providersQuery.data || [],
    selectedProviders,
    selectedIds,
    toggleProvider,
    clearSelection,
    isLoading: providersQuery.isLoading,
  };
};
