import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

interface ProviderProfile {
  id: string;
  user_id: string;
  profession: string;
  specialty: string | null;
  bio: string | null;
  consultation_fee: number | null;
  location: string | null;
  years_of_experience: number | null;
  is_approved: boolean | null;
  is_active: boolean | null;
  video_enabled: boolean | null;
  video_consultation_fee: number | null;
  require_video_payment: boolean | null;
}

interface UpdateProfileData {
  full_name?: string;
  phone?: string | null;
  avatar_url?: string | null;
}

interface UpdateProviderProfileData {
  profession?: string;
  specialty?: string | null;
  bio?: string | null;
  consultation_fee?: number | null;
  location?: string | null;
  years_of_experience?: number | null;
  is_active?: boolean | null;
  video_enabled?: boolean | null;
  video_consultation_fee?: number | null;
  require_video_payment?: boolean | null;
}

// Fix #3: Explicit columns — no phone_verification_code or other sensitive fields
export const useProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, phone, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: UpdateProfileData) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id)
        .select("id, user_id, full_name, email, phone, avatar_url")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Profile not found");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
  };
};

// Fix #11: Explicit columns — no stripe_account_id, verification_documents
export const useProviderProfile = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const providerProfileQuery = useQuery({
    queryKey: ["provider-profile", user?.id],
    queryFn: async (): Promise<ProviderProfile | null> => {
      if (!user?.id) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("provider_profiles")
        .select("id, user_id, profession, specialty, bio, consultation_fee, location, years_of_experience, is_approved, is_active, video_enabled, video_consultation_fee, require_video_payment")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as ProviderProfile | null;
    },
    enabled: !!user?.id && (role === "provider" || role === "admin"),
  });

  const updateProviderProfileMutation = useMutation({
    mutationFn: async (updates: UpdateProviderProfileData) => {
      if (!user?.id) throw new Error("Not authenticated");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("provider_profiles")
        .update(updates)
        .eq("user_id", user.id)
        .select("id, user_id, profession, specialty, bio, consultation_fee, location, years_of_experience, is_approved, is_active, video_enabled, video_consultation_fee, require_video_payment")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Provider profile not found");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-profile", user?.id] });
      toast({
        title: "Provider profile updated",
        description: "Your provider profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update provider profile",
        variant: "destructive",
      });
    },
  });

  return {
    providerProfile: providerProfileQuery.data,
    isLoading: providerProfileQuery.isLoading,
    error: providerProfileQuery.error,
    updateProviderProfile: updateProviderProfileMutation.mutate,
    isUpdating: updateProviderProfileMutation.isPending,
    refetch: providerProfileQuery.refetch,
  };
};
