import { useState, useCallback, useRef, useEffect } from "react";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ParticipantInfo {
  session_id: string;
  user_id?: string;
  user_name?: string;
}

interface CallState {
  isInCall: boolean;
  isJoining: boolean;
  isCreating: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  participants: ParticipantInfo[];
  roomUrl: string | null;
  error: string | null;
}

interface UseDailyCallOptions {
  appointmentId?: string;
  calleeId?: string;
  onCallEnded?: () => void;
  onParticipantJoined?: (participant: ParticipantInfo) => void;
  onParticipantLeft?: (participant: ParticipantInfo) => void;
}

export function useDailyCall(options: UseDailyCallOptions = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const callRef = useRef<DailyCall | null>(null);
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    isJoining: false,
    isCreating: false,
    isMuted: false,
    isVideoOff: false,
    participants: [],
    roomUrl: null,
    error: null,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callRef.current) {
        callRef.current.destroy();
        callRef.current = null;
      }
    };
  }, []);

  const setupCallEvents = useCallback((callObject: DailyCall, roomUrl: string) => {
    callObject.on("joined-meeting", () => {
      setCallState(prev => ({
        ...prev,
        isInCall: true,
        isJoining: false,
        isCreating: false,
      }));

      // Update call status to active
      if (options.calleeId && user) {
        supabase
          .from("calls")
          .update({ status: "active", started_at: new Date().toISOString() })
          .eq("room_url", roomUrl)
          .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
          .then();
      }
    });

    callObject.on("participant-joined", (event) => {
      if (event?.participant) {
        const participantInfo: ParticipantInfo = {
          session_id: event.participant.session_id,
          user_id: event.participant.user_id,
          user_name: event.participant.user_name,
        };
        setCallState(prev => ({
          ...prev,
          participants: [...prev.participants, participantInfo],
        }));
        options.onParticipantJoined?.(participantInfo);
      }
    });

    callObject.on("participant-left", (event) => {
      if (event?.participant) {
        const participantInfo: ParticipantInfo = {
          session_id: event.participant.session_id,
          user_id: event.participant.user_id,
          user_name: event.participant.user_name,
        };
        setCallState(prev => ({
          ...prev,
          participants: prev.participants.filter(
            p => p.session_id !== event.participant?.session_id
          ),
        }));
        options.onParticipantLeft?.(participantInfo);
      }
    });

    callObject.on("left-meeting", () => {
      setCallState(prev => ({
        ...prev,
        isInCall: false,
        participants: [],
        roomUrl: null,
      }));
      options.onCallEnded?.();
    });

    callObject.on("error", (event) => {
      console.error("Daily error:", event);
      setCallState(prev => ({
        ...prev,
        error: event?.errorMsg || "An error occurred",
        isJoining: false,
        isCreating: false,
      }));
      toast({
        title: "Call Error",
        description: event?.errorMsg || "An error occurred during the call",
        variant: "destructive",
      });
    });
  }, [options, toast]);

  const createAndJoinRoom = useCallback(async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to start a call",
        variant: "destructive",
      });
      return null;
    }

    setCallState(prev => ({ ...prev, isCreating: true, error: null }));

    try {
      // Call edge function to create room
      const { data, error } = await supabase.functions.invoke("daily-room", {
        body: {
          action: "create",
          appointmentId: options.appointmentId,
        },
      });

      if (error) throw error;

      const { room_url, room_name, token } = data;

      // Store call in database if we have a callee
      if (options.calleeId) {
        const { error: dbError } = await supabase.from("calls").insert({
          caller_id: user.id,
          callee_id: options.calleeId,
          room_url,
          room_name,
          status: "pending",
          call_type: "video",
          appointment_id: options.appointmentId || null,
        });

        if (dbError) {
          console.error("Failed to store call:", dbError);
        }
      }

      // Create Daily call frame
      const callObject = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: true,
      });

      // Set up event listeners
      setupCallEvents(callObject, room_url);

      callRef.current = callObject;

      // Join the room
      setCallState(prev => ({ ...prev, isJoining: true, isCreating: false }));
      await callObject.join({ url: room_url, token });

      setCallState(prev => ({ ...prev, roomUrl: room_url }));

      return { room_url, room_name, token };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create room";
      console.error("Failed to create room:", error);
      setCallState(prev => ({
        ...prev,
        isCreating: false,
        isJoining: false,
        error: errorMessage,
      }));
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  }, [user, options.appointmentId, options.calleeId, toast, setupCallEvents]);

  const joinRoom = useCallback(async (roomUrl: string, token?: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to join a call",
        variant: "destructive",
      });
      return false;
    }

    setCallState(prev => ({ ...prev, isJoining: true, error: null }));

    try {
      // Get token if not provided
      let joinToken = token;
      if (!joinToken) {
        const { data, error } = await supabase.functions.invoke("daily-room", {
          body: {
            action: "get-token",
            roomUrl,
          },
        });

        if (error) throw error;
        joinToken = data.token;
      }

      // Create Daily call frame
      const callObject = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: true,
      });

      // Set up event listeners
      setupCallEvents(callObject, roomUrl);

      callRef.current = callObject;

      // Join the room
      await callObject.join({ url: roomUrl, token: joinToken });

      setCallState(prev => ({ ...prev, roomUrl }));

      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to join room";
      console.error("Failed to join room:", error);
      setCallState(prev => ({
        ...prev,
        isJoining: false,
        error: errorMessage,
      }));
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }, [user, toast, setupCallEvents]);

  const leaveCall = useCallback(async () => {
    if (callRef.current) {
      try {
        await callRef.current.leave();
        callRef.current.destroy();
        callRef.current = null;

        // Update call status in database
        if (callState.roomUrl && user) {
          await supabase
            .from("calls")
            .update({
              status: "ended",
              ended_at: new Date().toISOString(),
            })
            .eq("room_url", callState.roomUrl)
            .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`);
        }

        setCallState(prev => ({
          ...prev,
          isInCall: false,
          participants: [],
          roomUrl: null,
          isMuted: false,
          isVideoOff: false,
        }));
      } catch (error) {
        console.error("Error leaving call:", error);
      }
    }
  }, [callState.roomUrl, user]);

  const toggleMute = useCallback(() => {
    if (callRef.current) {
      const newMuteState = !callState.isMuted;
      callRef.current.setLocalAudio(!newMuteState);
      setCallState(prev => ({ ...prev, isMuted: newMuteState }));
    }
  }, [callState.isMuted]);

  const toggleVideo = useCallback(() => {
    if (callRef.current) {
      const newVideoState = !callState.isVideoOff;
      callRef.current.setLocalVideo(!newVideoState);
      setCallState(prev => ({ ...prev, isVideoOff: newVideoState }));
    }
  }, [callState.isVideoOff]);

  const getCallFrame = useCallback(() => callRef.current, []);

  return {
    ...callState,
    createAndJoinRoom,
    joinRoom,
    leaveCall,
    toggleMute,
    toggleVideo,
    getCallFrame,
  };
}
