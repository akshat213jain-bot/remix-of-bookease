import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SatisfactionSurvey {
  id: string;
  appointment_id: string;
  user_id: string;
  provider_id: string;
  overall_rating: number | null;
  communication_rating: number | null;
  punctuality_rating: number | null;
  value_rating: number | null;
  would_recommend: boolean | null;
  feedback: string | null;
  sent_at: string;
  completed_at: string | null;
  created_at: string;
}

export const useSatisfactionSurveys = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const pendingSurveysQuery = useQuery({
    queryKey: ["pending-surveys", user?.id],
    queryFn: async (): Promise<SatisfactionSurvey[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("satisfaction_surveys")
        .select("id, appointment_id, user_id, provider_id, overall_rating, communication_rating, punctuality_rating, value_rating, would_recommend, feedback, sent_at, completed_at, created_at")
        .eq("user_id", user.id)
        .is("completed_at", null)
        .order("sent_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const submitSurveyMutation = useMutation({
    mutationFn: async ({
      surveyId,
      ratings,
    }: {

      surveyId: string;
      ratings: {
        overall_rating: number;
        communication_rating: number;
        punctuality_rating: number;
        value_rating: number;
        would_recommend: boolean;
        feedback?: string;
      };
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("satisfaction_surveys")
        .update({
          ...ratings,
          completed_at: new Date().toISOString(),
        })
        .eq("id", surveyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-surveys"] });
      toast.success("Thank you for your feedback!");
    },
    onError: (error) => {
      toast.error("Failed to submit survey: " + error.message);
    },
  });

  return {
    pendingSurveys: pendingSurveysQuery.data || [],
    isLoading: pendingSurveysQuery.isLoading,
    submitSurvey: submitSurveyMutation.mutate,
    isSubmitting: submitSurveyMutation.isPending,
  };
};
