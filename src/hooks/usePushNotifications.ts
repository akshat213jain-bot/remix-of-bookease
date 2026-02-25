import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | null;
}

/**
 * Hook for managing push notifications
 */
export const usePushNotifications = () => {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permission: null,
  });
  const { toast } = useToast();

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = "serviceWorker" in navigator && "PushManager" in window;
      const permission = isSupported ? Notification.permission : null;

      let isSubscribed = false;
      if (isSupported && permission === "granted") {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await (registration as any).pushManager.getSubscription();
          isSubscribed = !!subscription;
        } catch (error) {
          console.error("Error checking subscription:", error);
        }
      }

      setState({
        isSupported,
        isSubscribed,
        isLoading: false,
        permission,
      });
    };

    checkSupport();
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!state.isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in this browser.",
        variant: "destructive",
      });
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Request permission
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
        setState((prev) => ({ ...prev, isLoading: false, permission }));
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from environment
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        console.warn("VAPID public key not configured");
        setState((prev) => ({ ...prev, isLoading: false }));
        return false;
      }

      // Subscribe to push
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      // Store subscription directly in the database
      const sub = subscription.toJSON();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error("Session expired. Please log in again.");
      }
      await supabase.from("push_subscriptions").upsert({
        user_id: session.user.id,
        endpoint: sub.endpoint!,
        p256dh: sub.keys!.p256dh!,
        auth: sub.keys!.auth!,
      }, { onConflict: "user_id,endpoint" });

      setState({
        isSupported: true,
        isSubscribed: true,
        isLoading: false,
        permission: "granted",
      });

      toast({
        title: "Notifications Enabled",
        description: "You'll receive appointment reminders and updates.",
      });

      return true;
    } catch (error) {
      console.error("Error subscribing to push:", error);
      toast({
        title: "Subscription Failed",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      });
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported, toast]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove subscription from database
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          console.warn("No active session, skipping database cleanup");
        } else {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", session.user.id)
            .eq("endpoint", subscription.endpoint);
        }
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      toast({
        title: "Notifications Disabled",
        description: "You won't receive push notifications anymore.",
      });

      return true;
    } catch (error) {
      console.error("Error unsubscribing:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [toast]);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
};

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default usePushNotifications;
