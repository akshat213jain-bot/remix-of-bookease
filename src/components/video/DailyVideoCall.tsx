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
   Settings,
   Maximize2,
   Minimize2,
   Loader2,
 } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { useToast } from "@/hooks/use-toast";
 
 interface DailyVideoCallProps {
   roomUrl: string;
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
   const containerRef = useRef<HTMLDivElement>(null);
   const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
   const { toast } = useToast();
 
   // Update participant tiles from Daily participants
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
 
     // Sort: local participant first
     tiles.sort((a, b) => (a.isLocal ? -1 : b.isLocal ? 1 : 0));
     setParticipants(tiles);
   }, []);
 
   // Initialize Daily call
   useEffect(() => {
     const initCall = async () => {
       try {
         setIsJoining(true);
         setError(null);
 
         const daily = DailyIframe.createCallObject({
           audioSource: true,
           videoSource: true,
         });
 
         // Set up event listeners
         daily.on("joined-meeting", () => {
           setIsJoining(false);
           updateParticipants(daily);
         });
 
         daily.on("participant-joined", () => updateParticipants(daily));
         daily.on("participant-updated", () => updateParticipants(daily));
         daily.on("participant-left", () => updateParticipants(daily));
 
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
 
         // Join the room
         await daily.join({
           url: roomUrl,
           userName: userName,
         });
       } catch (err) {
         console.error("Failed to join call:", err);
         setError(err instanceof Error ? err.message : "Failed to join call");
         setIsJoining(false);
       }
     };
 
     initCall();
 
     return () => {
       if (callObject) {
         callObject.destroy();
       }
     };
   }, [roomUrl, userName]);
 
   // Attach video tracks to video elements
   useEffect(() => {
     participants.forEach((p) => {
       const videoEl = videoRefs.current.get(p.sessionId);
       if (videoEl && p.videoTrack) {
         const stream = new MediaStream([p.videoTrack]);
         if (videoEl.srcObject !== stream) {
           videoEl.srcObject = stream;
         }
       }
     });
   }, [participants]);
 
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
     }
     onLeave();
   };
 
   // Handle fullscreen change events
   useEffect(() => {
     const handleFullscreenChange = () => {
       setIsFullscreen(!!document.fullscreenElement);
     };
 
     document.addEventListener("fullscreenchange", handleFullscreenChange);
     return () => {
       document.removeEventListener("fullscreenchange", handleFullscreenChange);
     };
   }, []);
 
   if (error) {
     return (
       <Card className="p-8 text-center">
         <div className="text-destructive mb-4">
           <VideoOff className="h-12 w-12 mx-auto mb-2" />
           <h3 className="font-semibold">Connection Error</h3>
           <p className="text-sm text-muted-foreground mt-2">{error}</p>
         </div>
         <Button onClick={onLeave}>Go Back</Button>
       </Card>
     );
   }
 
   if (isJoining) {
     return (
       <Card className="p-8 text-center">
         <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
         <h3 className="font-semibold">Joining call...</h3>
         <p className="text-sm text-muted-foreground mt-2">
           Setting up your camera and microphone
         </p>
       </Card>
     );
   }
 
   return (
     <div
       ref={containerRef}
       className={cn(
         "bg-background rounded-lg overflow-hidden",
         isFullscreen ? "fixed inset-0 z-50" : "relative"
       )}
     >
       {/* Header */}
       <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/60 to-transparent">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Badge variant="secondary" className="bg-green-500/20 text-green-400">
               <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
               Live
             </Badge>
             <Badge variant="outline" className="text-white border-white/30">
               <Users className="h-3 w-3 mr-1" />
               {participants.length}
             </Badge>
           </div>
           <div className="flex items-center gap-2">
             <Button
               variant="ghost"
               size="icon"
               onClick={toggleFullscreen}
               className="text-white hover:bg-white/20"
             >
               {isFullscreen ? (
                 <Minimize2 className="h-4 w-4" />
               ) : (
                 <Maximize2 className="h-4 w-4" />
               )}
             </Button>
           </div>
         </div>
       </div>
 
       {/* Video Grid */}
       <div
         className={cn(
           "grid gap-2 p-2 bg-muted/50",
           isFullscreen ? "h-[calc(100vh-100px)]" : "h-[500px]",
           participants.length === 1 && "grid-cols-1",
           participants.length === 2 && "grid-cols-2",
           participants.length >= 3 && participants.length <= 4 && "grid-cols-2 grid-rows-2",
           participants.length > 4 && "grid-cols-3"
         )}
       >
         {participants.map((participant) => (
           <div
             key={participant.sessionId}
             className={cn(
               "relative bg-muted rounded-lg overflow-hidden",
               participants.length === 1 && "aspect-video max-h-full mx-auto",
               participant.isLocal && participants.length > 1 && "order-last"
             )}
           >
             {participant.isCameraOff ? (
               <div className="absolute inset-0 flex items-center justify-center bg-muted">
                 <div className="text-center">
                   <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                     <span className="text-2xl font-semibold text-primary">
                       {participant.userName.charAt(0).toUpperCase()}
                     </span>
                   </div>
                   <p className="text-sm text-muted-foreground">{participant.userName}</p>
                 </div>
               </div>
             ) : (
               <video
                 ref={(el) => {
                   if (el) videoRefs.current.set(participant.sessionId, el);
                 }}
                 autoPlay
                 playsInline
                 muted={participant.isLocal}
                 className="w-full h-full object-cover"
               />
             )}
 
             {/* Participant overlay */}
             <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
               <div className="flex items-center justify-between">
                 <span className="text-white text-sm font-medium truncate">
                   {participant.isLocal ? "You" : participant.userName}
                 </span>
                 <div className="flex items-center gap-1">
                   {participant.isMicOff && (
                     <MicOff className="h-4 w-4 text-red-400" />
                   )}
                   {participant.isCameraOff && (
                     <VideoOff className="h-4 w-4 text-red-400" />
                   )}
                 </div>
               </div>
             </div>
           </div>
         ))}
       </div>
 
       {/* Controls */}
       <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
         <div className="flex items-center justify-center gap-3">
           <Button
             variant={isMuted ? "destructive" : "secondary"}
             size="lg"
             onClick={toggleMute}
             className={cn(
               "rounded-full w-14 h-14",
               !isMuted && "bg-white/20 hover:bg-white/30 text-white"
             )}
           >
             {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
           </Button>
 
           <Button
             variant={isVideoOff ? "destructive" : "secondary"}
             size="lg"
             onClick={toggleVideo}
             className={cn(
               "rounded-full w-14 h-14",
               !isVideoOff && "bg-white/20 hover:bg-white/30 text-white"
             )}
           >
             {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
           </Button>
 
           <Button
             variant={isScreenSharing ? "default" : "secondary"}
             size="lg"
             onClick={toggleScreenShare}
             className={cn(
               "rounded-full w-14 h-14",
               !isScreenSharing && "bg-white/20 hover:bg-white/30 text-white"
             )}
           >
             <MonitorUp className="h-5 w-5" />
           </Button>
 
           <Button
             variant="destructive"
             size="lg"
             onClick={handleLeave}
             className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
           >
             <Phone className="h-5 w-5 rotate-[135deg]" />
           </Button>
         </div>
       </div>
     </div>
   );
 };