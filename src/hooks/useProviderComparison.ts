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
        .from("provider_profiles")
        .select(`
          id,
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
          is_verified
        `)
        .eq("is_approved", true)
        .eq("is_active", true)
        .limit(100);

      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = (providers || []).map(p => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return (providers || []).map(p => ({
        ...p,
        profile: profileMap.get(p.user_id) || null
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
