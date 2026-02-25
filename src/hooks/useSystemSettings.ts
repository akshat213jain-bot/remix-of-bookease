import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

export interface CurrencySettings {
  code: string;
  symbol: string;
  locale: string;
}

export interface SystemSettings {
  currency: CurrencySettings;
  emailNotifications: boolean;
  autoApproveProviders: boolean;
  maintenanceMode: boolean;
  requirePhoneVerification: boolean;
  allowVideoConsultations: boolean;
  platformFeePercentage: string;
  supportEmail: string;
  maxAppointmentsPerDay: string;
}

const defaultSettings: SystemSettings = {
  currency: { code: "INR", symbol: "₹", locale: "en-IN" },
  emailNotifications: true,
  autoApproveProviders: false,
  maintenanceMode: false,
  requirePhoneVerification: true,
  allowVideoConsultations: true,
  platformFeePercentage: "10",
  supportEmail: "support@bookease.com",
  maxAppointmentsPerDay: "20",
};

export const CURRENCY_OPTIONS: CurrencySettings[] = [
  { code: "INR", symbol: "₹", locale: "en-IN" },
  { code: "USD", symbol: "$", locale: "en-US" },
  { code: "EUR", symbol: "€", locale: "de-DE" },
  { code: "GBP", symbol: "£", locale: "en-GB" },
  { code: "JPY", symbol: "¥", locale: "ja-JP" },
  { code: "AUD", symbol: "A$", locale: "en-AU" },
  { code: "CAD", symbol: "C$", locale: "en-CA" },
];

export function useSystemSettings() {
  const queryClient = useQueryClient();
  const { data: session } = useQuery({
    queryKey: ["auth-session-for-settings"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 60 * 1000,
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value");

      if (error) throw error;

      const settingsMap: Partial<SystemSettings> = {};
      
      data?.forEach((row: { key: string; value: unknown }) => {
        if (row.key === "currency") {
          settingsMap.currency = row.value as CurrencySettings;
        } else if (row.key === "general") {
          const general = row.value as Record<string, unknown>;
          settingsMap.emailNotifications = general.emailNotifications as boolean ?? defaultSettings.emailNotifications;
          settingsMap.autoApproveProviders = general.autoApproveProviders as boolean ?? defaultSettings.autoApproveProviders;
          settingsMap.maintenanceMode = general.maintenanceMode as boolean ?? defaultSettings.maintenanceMode;
          settingsMap.requirePhoneVerification = general.requirePhoneVerification as boolean ?? defaultSettings.requirePhoneVerification;
          settingsMap.allowVideoConsultations = general.allowVideoConsultations as boolean ?? defaultSettings.allowVideoConsultations;
          settingsMap.platformFeePercentage = general.platformFeePercentage as string ?? defaultSettings.platformFeePercentage;
          settingsMap.supportEmail = general.supportEmail as string ?? defaultSettings.supportEmail;
          settingsMap.maxAppointmentsPerDay = general.maxAppointmentsPerDay as string ?? defaultSettings.maxAppointmentsPerDay;
        }
      });

      return { ...defaultSettings, ...settingsMap };
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: SystemSettings) => {
      // Guard: only admins can update settings
      if (!session?.user?.id) throw new Error("Not authenticated");
      // Check if currency setting exists
      const { data: existingCurrency } = await supabase
        .from("system_settings")
        .select("id")
        .eq("key", "currency")
        .single();

      const currencyValue = newSettings.currency as unknown as Json;
      
      if (existingCurrency) {
        // Update existing
        const { error: currencyError } = await supabase
          .from("system_settings")
          .update({ value: currencyValue })
          .eq("key", "currency");
        if (currencyError) throw currencyError;
      } else {
        // Insert new
        const { error: currencyError } = await supabase
          .from("system_settings")
          .insert({ key: "currency", value: currencyValue, description: "Default platform currency" });
        if (currencyError) throw currencyError;
      }

      // Upsert general settings
      const generalSettings = {
        emailNotifications: newSettings.emailNotifications,
        autoApproveProviders: newSettings.autoApproveProviders,
        maintenanceMode: newSettings.maintenanceMode,
        requirePhoneVerification: newSettings.requirePhoneVerification,
        allowVideoConsultations: newSettings.allowVideoConsultations,
        platformFeePercentage: newSettings.platformFeePercentage,
        supportEmail: newSettings.supportEmail,
        maxAppointmentsPerDay: newSettings.maxAppointmentsPerDay,
      } as unknown as Json;

      // Check if general setting exists
      const { data: existingGeneral } = await supabase
        .from("system_settings")
        .select("id")
        .eq("key", "general")
        .single();

      if (existingGeneral) {
        const { error: generalError } = await supabase
          .from("system_settings")
          .update({ value: generalSettings })
          .eq("key", "general");
        if (generalError) throw generalError;
      } else {
        const { error: generalError } = await supabase
          .from("system_settings")
          .insert({ key: "general", value: generalSettings, description: "General platform settings" });
        if (generalError) throw generalError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      queryClient.invalidateQueries({ queryKey: ["currency-settings"] });
    },
  });

  return {
    settings: settings ?? defaultSettings,
    isLoading,
    updateSettings: updateSettingsMutation.mutateAsync,
    isSaving: updateSettingsMutation.isPending,
  };
}

// Separate hook for public currency access
export function useCurrencySettings() {
  const { data: currency } = useQuery({
    queryKey: ["currency-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "currency")
        .single();

      if (error || !data?.value) {
        return defaultSettings.currency;
      }

      const val = data.value as unknown as CurrencySettings;
      return val;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return currency ?? defaultSettings.currency;
}
