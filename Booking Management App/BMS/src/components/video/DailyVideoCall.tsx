import { useState, useEffect, useRef, useCallback } from "react";
import DailyIframe, { DailyCall, DailyParticipant } from "@daily-co/daily-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  MonitorUp,
  Users,
  Maximize2,
  Minimize2,
  Loader2,
  PhoneOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface DailyVideoCallProps {
  roomUrl: string;
  token?: string;
  userName: string;
  onLeave: () => void;
  isProvider?: boolean;
}

interface ParticipantTile {
  sessionId: string;
  userName: string;
  isLocal: boolean;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  isCameraOff: boolean;
  isMicOff: boolean;
}

export const DailyVideoCall = ({
  roomUrl,
  token,
  userName,
  onLeave,
  isProvider = false,
}: DailyVideoCallProps) => {
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [participants, setParticipants] = useState<ParticipantTile[]>([]);
  const [isJoining, setIsJoining] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const initRef = useRef(false);
  const callObjRef = useRef<DailyCall | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  const updateParticipants = useCallback((daily: DailyCall) => {
    const dailyParticipants = daily.participants();
    const tiles: ParticipantTile[] = [];

    Object.values(dailyParticipants).forEach((p: DailyParticipant) => {
      const videoTrack = p.tracks?.video?.persistentTrack || null;
      const audioTrack = p.tracks?.audio?.persistentTrack || null;

      tiles.push({
        sessionId: p.session_id,
        userName: p.user_name || (p.local ? "You" : "Participant"),
        isLocal: p.local || false,
        videoTrack,
        audioTrack,
        isCameraOff: p.tracks?.video?.state !== "playable",
        isMicOff: p.tracks?.audio?.state !== "playable",
      });
    });

    tiles.sort((a, b) => (a.isLocal ? -1 : b.isLocal ? 1 : 0));
    setParticipants(tiles);
  }, []);

  // Initialize Daily call — guard against StrictMode double-mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initCall = async () => {
      try {
        setIsJoining(true);
        setError(null);

        // Request media permissions explicitly first (direct gesture context)
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: true,
          });
          // Stop tracks immediately — Daily will request its own
          stream.getTracks().forEach((t) => t.stop());
        } catch (permErr) {
          console.warn("Pre-permission request failed:", permErr);
          // Continue anyway — Daily will handle its own permission prompts
        }

        const daily = DailyIframe.createCallObject({
          audioSource: true,
          videoSource: true,
        });

        callObjRef.current = daily;

        daily.on("joined-meeting", () => {
          setIsJoining(false);
          updateParticipants(daily);
          // Start duration timer
          durationIntervalRef.current = setInterval(() => {
            setCallDuration((d) => d + 1);
          }, 1000);
        });

        daily.on("participant-joined", () => updateParticipants(daily));
        daily.on("participant-updated", () => updateParticipants(daily));
        daily.on("participant-left", () => updateParticipants(daily));
        daily.on("track-started", () => updateParticipants(daily));
        daily.on("track-stopped", () => updateParticipants(daily));

        daily.on("error", (event) => {
          console.error("Daily error:", event);
          setError(event?.errorMsg || "An error occurred");
          toast({
            title: "Call Error",
            description: event?.errorMsg || "Failed to connect to call",
            variant: "destructive",
          });
        });

        daily.on("left-meeting", () => {
          onLeave();
        });

        setCallObject(daily);

        const joinOptions: { url: string; userName: string; token?: string } = {
          url: roomUrl,
          userName,
        };
        if (token) joinOptions.token = token;

        await daily.join(joinOptions);
      } catch (err) {
        console.error("Failed to join call:", err);
        setError(err instanceof Error ? err.message : "Failed to join call");
        setIsJoining(false);
      }
    };

    initCall();

    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      if (callObjRef.current) {
        callObjRef.current.destroy();
        callObjRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach video tracks
  useEffect(() => {
    participants.forEach((p) => {
      const videoEl = videoRefs.current.get(p.sessionId);
      if (videoEl && p.videoTrack) {
        const stream = new MediaStream([p.videoTrack]);
        if (videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
        }
      }

      // Attach audio for remote participants
      if (!p.isLocal && p.audioTrack) {
        let audioEl = audioRefs.current.get(p.sessionId);
        if (!audioEl) {
          audioEl = document.createElement("audio");
          audioEl.autoplay = true;
          audioEl.setAttribute("playsinline", "true");
          document.body.appendChild(audioEl);
          audioRefs.current.set(p.sessionId, audioEl);
        }
        const audioStream = new MediaStream([p.audioTrack]);
        if (audioEl.srcObject !== audioStream) {
          audioEl.srcObject = audioStream;
        }
      }
    });

    // Cleanup removed participants' audio elements
    const currentIds = new Set(participants.map((p) => p.sessionId));
    audioRefs.current.forEach((el, id) => {
      if (!currentIds.has(id)) {
        el.remove();
        audioRefs.current.delete(id);
      }
    });
  }, [participants]);

  // Cleanup audio elements on unmount
  useEffect(() => {
    return () => {
      audioRefs.current.forEach((el) => el.remove());
      audioRefs.current.clear();
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const toggleMute = () => {
    if (callObject) {
      const newMuteState = !isMuted;
      callObject.setLocalAudio(!newMuteState);
      setIsMuted(newMuteState);
    }
  };

  const toggleVideo = () => {
    if (callObject) {
      const newVideoState = !isVideoOff;
      callObject.setLocalVideo(!newVideoState);
      setIsVideoOff(newVideoState);
    }
  };

  const toggleScreenShare = async () => {
    if (!callObject) return;
    try {
      if (isScreenSharing) {
        await callObject.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await callObject.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error("Screen share error:", err);
      toast({
        title: "Screen Share",
        description: "Failed to toggle screen share",
        variant: "destructive",
      });
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleLeave = async () => {
    if (callObject) {
      await callObject.leave();
      callObject.destroy();
      callObjRef.current = null;
    }
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    onLeave();
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (error) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto mt-20">
        <div className="text-destructive mb-4">
          <VideoOff className="h-12 w-12 mx-auto mb-2" />
          <h3 className="font-semibold text-lg">Connection Error</h3>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
        <Button onClick={onLeave} variant="outline">
          Go Back
        </Button>
      </Card>
    );
  }

  if (isJoining) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-background">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Video className="h-10 w-10 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">Joining call...</h3>
          <p className="text-sm text-muted-foreground">
            Setting up your camera and microphone
          </p>
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
        </div>
      </div>
    );
  }

  const remoteParticipants = participants.filter((p) => !p.isLocal);
  const localParticipant = participants.find((p) => p.isLocal);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col bg-[#111] text-white h-full",
        isFullscreen ? "fixed inset-0 z-50" : "relative rounded-xl overflow-hidden"
      )}
      style={{ minHeight: isFullscreen ? "100vh" : "500px" }}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          <Badge className="bg-red-500/90 text-white border-0 gap-1.5 text-xs font-medium px-2.5 py-1">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </Badge>
          <span className="text-sm text-white/70 font-mono">{formatDuration(callDuration)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-white/80 border-white/20 gap-1">
            <Users className="h-3.5 w-3.5" />
            {participants.length}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative">
        {/* Remote / primary video */}
        {remoteParticipants.length > 0 ? (
          <div
            className={cn(
              "w-full h-full grid gap-1 p-1",
              remoteParticipants.length === 1 && "grid-cols-1",
              remoteParticipants.length === 2 && "grid-cols-2",
              remoteParticipants.length >= 3 && "grid-cols-2 grid-rows-2"
            )}
          >
            {remoteParticipants.map((p) => (
              <ParticipantView key={p.sessionId} participant={p} videoRefs={videoRefs} large />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="w-24 h-24 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <Users className="h-10 w-10 text-white/30" />
              </div>
              <p className="text-white/50 text-sm">Waiting for others to join...</p>
            </div>
          </div>
        )}

        {/* Local participant PIP */}
        {localParticipant && (
          <div className="absolute bottom-4 right-4 w-44 h-32 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl z-10 bg-[#222]">
            <ParticipantView participant={localParticipant} videoRefs={videoRefs} />
            <div className="absolute bottom-1 left-2 text-[11px] text-white/80 font-medium">
              You
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-center gap-3 py-4 px-6 bg-black/50 backdrop-blur-sm">
        <ControlButton
          active={!isMuted}
          icon={isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          onClick={toggleMute}
          label={isMuted ? "Unmute" : "Mute"}
          destructive={isMuted}
        />
        <ControlButton
          active={!isVideoOff}
          icon={isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          onClick={toggleVideo}
          label={isVideoOff ? "Start Video" : "Stop Video"}
          destructive={isVideoOff}
        />
        <ControlButton
          active={isScreenSharing}
          icon={<MonitorUp className="h-5 w-5" />}
          onClick={toggleScreenShare}
          label={isScreenSharing ? "Stop Sharing" : "Share Screen"}
          highlight={isScreenSharing}
        />

        {/* Leave button */}
        <Button
          onClick={handleLeave}
          className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 ml-4"
          size="icon"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

/* ── Sub-components ─────────────────────────────── */

function ParticipantView({
  participant,
  videoRefs,
  large = false,
}: {
  participant: ParticipantTile;
  videoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  large?: boolean;
}) {
  if (participant.isCameraOff) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1a1a2e]">
        <div className="text-center">
          <div
            className={cn(
              "rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2",
              large ? "w-24 h-24" : "w-12 h-12"
            )}
          >
            <span className={cn("font-semibold text-primary", large ? "text-3xl" : "text-lg")}>
              {participant.userName.charAt(0).toUpperCase()}
            </span>
          </div>
          {large && <p className="text-sm text-white/60 mt-1">{participant.userName}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <video
        ref={(el) => {
          if (el) videoRefs.current.set(participant.sessionId, el);
        }}
        autoPlay
        playsInline
        muted={participant.isLocal}
        className="w-full h-full object-cover"
      />
      {large && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-white text-xs font-medium truncate">
              {participant.userName}
            </span>
            <div className="flex items-center gap-1">
              {participant.isMicOff && <MicOff className="h-3.5 w-3.5 text-red-400" />}
              {participant.isCameraOff && <VideoOff className="h-3.5 w-3.5 text-red-400" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ControlButton({
  active,
  icon,
  onClick,
  label,
  destructive = false,
  highlight = false,
}: {
  active: boolean;
  icon: React.ReactNode;
  onClick: () => void;
  label: string;
  destructive?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        className={cn(
          "rounded-full w-12 h-12 transition-all",
          destructive && "bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300",
          highlight && "bg-primary/20 text-primary hover:bg-primary/30",
          !destructive && !highlight && "bg-white/10 text-white hover:bg-white/20"
        )}
        title={label}
      >
        {icon}
      </Button>
      <span className="text-[10px] text-white/50">{label}</span>
    </div>
  );
}
