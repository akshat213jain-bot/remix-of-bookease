import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Provider {
  id: string;
  user_id: string;
  profession: string;
  specialty: string | null;
  bio: string | null;
  consultation_fee: number | null;
  location: string | null;
  years_of_experience: number | null;
  is_approved: boolean;
  is_active: boolean;
  average_rating: number | null;
  total_reviews: number | null;
  profile?: {
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
}

const PAGE_SIZE = 12;

// Map category buttons to profession search patterns
const categoryToProfessionPatterns: Record<string, string[]> = {
  doctor: ["doctor", "physician", "cardiologist", "dermatologist", "pediatrician", "general", "surgeon", "dentist", "psychiatrist", "neurologist", "oncologist", "orthopedic", "gynecologist", "urologist", "ent", "radiologist", "pathologist", "anesthesiologist"],
  lawyer: ["lawyer", "attorney", "advocate", "legal", "counsel", "barrister", "solicitor"],
  barber: ["barber", "hairdresser", "hair stylist"],
  therapist: ["therapist", "psychologist", "counselor", "counsellor", "mental health"],
  consultant: ["consultant", "advisor", "adviser", "business consultant", "financial advisor", "management"],
  stylist: ["stylist", "fashion", "makeup", "beauty", "cosmetologist", "aesthetician"],
};

export const useProviders = (category?: string, searchQuery?: string) => {
  return useQuery({
    queryKey: ["providers", category, searchQuery],
    queryFn: async (): Promise<Provider[]> => {
      // If category is "__none__", return empty array (no category selected yet)
      if (category === "__none__") {
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("provider_profiles")
        .select("*")
        .eq("is_approved", true)
        .eq("is_active", true);

      // Don't apply category filter in the query - we'll filter client-side for flexibility
      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Fetch profile info for all providers
      const userIds = data.map((p: Provider) => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, email")
        .in("user_id", userIds);

      if (profiles) {
        const profileMap = new Map(profiles.map(p => [p.user_id, p]));
        data.forEach((provider: Provider) => {
          provider.profile = profileMap.get(provider.user_id);
        });
      }

      let filteredData = data;

      // Filter by category if provided
      if (category && category !== "all") {
        const patterns = categoryToProfessionPatterns[category.toLowerCase()];
        if (patterns) {
          filteredData = filteredData.filter((provider: Provider) => {
            const profession = provider.profession?.toLowerCase() || "";
            const specialty = provider.specialty?.toLowerCase() || "";
            return patterns.some(pattern =>
              profession.includes(pattern) || specialty.includes(pattern)
            );
          });
        } else {
          // Fallback to exact or partial match
          const lowerCategory = category.toLowerCase();
          filteredData = filteredData.filter((provider: Provider) =>
            provider.profession?.toLowerCase().includes(lowerCategory) ||
            provider.specialty?.toLowerCase().includes(lowerCategory)
          );
        }
      }

      // Filter by search query if provided
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        filteredData = filteredData.filter((provider: Provider) =>
          provider.profile?.full_name?.toLowerCase().includes(lowerQuery) ||
          provider.profession?.toLowerCase().includes(lowerQuery) ||
          provider.specialty?.toLowerCase().includes(lowerQuery)
        );
      }

      return filteredData;
    },
    staleTime: 60 * 1000, // Cache for 1 minute
  });
};

// Paginated version for large datasets
export const useProvidersPaginated = (category?: string, searchQuery?: string) => {
  return useInfiniteQuery({
    queryKey: ["providers-paginated", category, searchQuery],
    queryFn: async ({ pageParam = 0 }): Promise<{ providers: Provider[]; nextPage: number | null }> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("provider_profiles")
        .select("*", { count: "exact" })
        .eq("is_approved", true)
        .eq("is_active", true)
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1)
        .order("created_at", { ascending: false });

      if (category && category !== "all") {
        query = query.eq("profession", category);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        return { providers: [], nextPage: null };
      }

      // Fetch profile info for all providers
      const userIds = data.map((p: Provider) => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, email")
        .in("user_id", userIds);

      if (profiles) {
        const profileMap = new Map(profiles.map(p => [p.user_id, p]));
        data.forEach((provider: Provider) => {
          provider.profile = profileMap.get(provider.user_id);
        });
      }

      // Filter by search query if provided (client-side for paginated)
      let filteredData = data;
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        filteredData = data.filter((provider: Provider) =>
          provider.profile?.full_name?.toLowerCase().includes(lowerQuery) ||
          provider.profession?.toLowerCase().includes(lowerQuery) ||
          provider.specialty?.toLowerCase().includes(lowerQuery)
        );
      }

      const hasMore = count ? (pageParam + 1) * PAGE_SIZE < count : false;

      return {
        providers: filteredData,
        nextPage: hasMore ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: 60 * 1000,
  });
};

export const useProvider = (providerId: string | undefined) => {
  return useQuery({
    queryKey: ["provider", providerId],
    queryFn: async (): Promise<Provider | null> => {
      if (!providerId) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("provider_profiles")
        .select("*")
        .eq("id", providerId)
        .eq("is_approved", true) // Only show approved providers
        .eq("is_active", true)   // Only show active providers
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch profile info
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, email")
        .eq("user_id", data.user_id)
        .maybeSingle();

      if (profile) {
        data.profile = profile;
      }

      return data;
    },
    enabled: !!providerId,
    staleTime: 60 * 1000,
  });
};
