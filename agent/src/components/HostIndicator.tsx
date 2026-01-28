import { useEffect, useRef, useState } from "react";

type Props = {
  sessionId: string;
  viewerUserId: string;
  viewerEmail: string;
  onDisconnect: () => void;
};

const HostIndicator = ({ sessionId, viewerUserId, viewerEmail, onDisconnect }: Props) => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState<"waiting" | "connected" | "error">("waiting");

  useEffect(() => {
    let mounted = true;

    const setupHost = async () => {
      // Get ICE servers from main process (includes TURN if configured)
      const iceServers = await window.electronAPI.rtcGetIceServers();

      // Create peer connection
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          window.electronAPI.rtcSendIce(sessionId, viewerUserId, event.candidate.toJSON());
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          if (mounted) setStatus("connected");
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          if (mounted) setStatus("error");
        }
      };

      // Listen for offer from viewer
      window.electronAPI.onRtcOffer(async (data) => {
        if (data.sessionId !== sessionId) return;

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

          // Get screen stream
          const sources = await window.electronAPI.rtcGetScreenSources();
          if (!sources || sources.length === 0) {
            console.error("No screen sources - permission denied?");
            window.electronAPI.rtcDisconnect(sessionId);
            onDisconnect();
            return;
          }
          const primaryScreen = sources.find((s) => s.name === "Entire Screen" || s.name.includes("Screen")) || sources[0];

          if (!primaryScreen) {
            console.error("No screen source found");
            window.electronAPI.rtcDisconnect(sessionId);
            onDisconnect();
            return;
          }

          // Get screen stream using Electron's desktopCapturer sourceId
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              // @ts-expect-error Electron-specific constraint
              mandatory: {
                chromeMediaSource: "desktop",
              },
            },
            video: {
              // @ts-expect-error Electron-specific constraint
              mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: primaryScreen.id,
              },
            },
          });

          // Add tracks to peer connection
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });

          // Create and send answer
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          window.electronAPI.rtcSendAnswer(sessionId, viewerUserId, answer);
        } catch (err) {
          console.error("Failed to setup stream:", err);
          window.electronAPI.rtcDisconnect(sessionId);
          if (mounted) {
            setStatus("error");
            onDisconnect();
          }
        }
      });

      // Listen for ICE candidates from viewer
      window.electronAPI.onRtcIce((data) => {
        if (data.sessionId === sessionId) {
          pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      });
    };

    setupHost().catch((err) => {
      console.error("Failed to setup host:", err);
      if (mounted) setStatus("error");
    });

    return () => {
      mounted = false;
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, [sessionId, viewerUserId]);

  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span className="text-sm font-medium">
          {status === "waiting"
            ? "Setting up stream..."
            : status === "connected"
            ? `${viewerEmail} is controlling`
            : "Connection error"}
        </span>
      </div>
      <button
        onClick={onDisconnect}
        className="px-2 py-1 bg-white text-red-500 text-sm rounded font-medium hover:bg-gray-100"
      >
        Stop
      </button>
    </div>
  );
};

export default HostIndicator;
