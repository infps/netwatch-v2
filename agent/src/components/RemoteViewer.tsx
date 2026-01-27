import { useEffect, useRef, useState } from "react";

type Props = {
  sessionId: string;
  hostUserId: string;
  onDisconnect: () => void;
};

const RemoteViewer = ({ sessionId, hostUserId, onDisconnect }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [displayBounds, setDisplayBounds] = useState({ width: 1920, height: 1080 });

  useEffect(() => {
    let mounted = true;

    const initConnection = async () => {
      // Get ICE servers from main process (includes TURN if configured)
      const iceServers = await window.electronAPI.rtcGetIceServers();

      // Get host display bounds for coordinate mapping
      const bounds = await window.electronAPI.rtcGetDisplayBounds();
      setDisplayBounds(bounds);

      // Create peer connection
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      // Handle incoming stream
      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          if (mounted) setStatus("connected");
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          window.electronAPI.rtcSendIce(sessionId, hostUserId, event.candidate.toJSON());
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          if (mounted) setStatus("error");
        }
      };

      // Listen for answer from host
      window.electronAPI.onRtcAnswer((data) => {
        if (data.sessionId === sessionId && pc.signalingState !== "stable") {
          pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      });

      // Listen for ICE candidates from host
      window.electronAPI.onRtcIce((data) => {
        if (data.sessionId === sessionId) {
          pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      });

      // Create offer (viewer initiates)
      // Add a transceiver to receive video
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      window.electronAPI.rtcSendOffer(sessionId, hostUserId, offer);
    };

    initConnection().catch((err) => {
      console.error("Failed to init connection:", err);
      if (mounted) setStatus("error");
    });

    return () => {
      mounted = false;
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, [sessionId, hostUserId]);

  // Input handlers
  const getScaledCoords = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = videoRef.current;
    if (!video) return { x: 0, y: 0 };

    const rect = video.getBoundingClientRect();
    const scaleX = displayBounds.width / rect.width;
    const scaleY = displayBounds.height / rect.height;

    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLVideoElement>) => {
    const coords = getScaledCoords(e);
    window.electronAPI.rtcSendInput(sessionId, {
      inputType: "mouse_move",
      ...coords,
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLVideoElement>) => {
    const coords = getScaledCoords(e);
    const button = e.button === 0 ? "left" : e.button === 2 ? "right" : "middle";
    window.electronAPI.rtcSendInput(sessionId, {
      inputType: "mouse_down",
      ...coords,
      button,
    });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLVideoElement>) => {
    const coords = getScaledCoords(e);
    const button = e.button === 0 ? "left" : e.button === 2 ? "right" : "middle";
    window.electronAPI.rtcSendInput(sessionId, {
      inputType: "mouse_up",
      ...coords,
      button,
    });
  };

  const handleWheel = (e: React.WheelEvent<HTMLVideoElement>) => {
    const coords = getScaledCoords(e as unknown as React.MouseEvent<HTMLVideoElement>);
    window.electronAPI.rtcSendInput(sessionId, {
      inputType: "mouse_scroll",
      ...coords,
      deltaX: e.deltaX,
      deltaY: e.deltaY,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLVideoElement>) => {
    e.preventDefault();
    window.electronAPI.rtcSendInput(sessionId, {
      inputType: "key_down",
      key: e.key,
      code: e.code,
      modifiers: {
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey,
      },
    });
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLVideoElement>) => {
    e.preventDefault();
    window.electronAPI.rtcSendInput(sessionId, {
      inputType: "key_up",
      key: e.key,
      code: e.code,
      modifiers: {
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey,
      },
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              status === "connected"
                ? "bg-green-500"
                : status === "connecting"
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
          />
          <span className="text-sm">
            {status === "connecting"
              ? "Connecting..."
              : status === "connected"
              ? "Connected"
              : "Connection error"}
          </span>
        </div>
        <button
          onClick={onDisconnect}
          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
        >
          Disconnect
        </button>
      </div>

      {/* Video */}
      <div className="flex-1 flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          tabIndex={0}
          className="max-w-full max-h-full cursor-none focus:outline-none"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onContextMenu={handleContextMenu}
        />
      </div>
    </div>
  );
};

export default RemoteViewer;
