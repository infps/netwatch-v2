import { useEffect, useState } from "react";
import Card from "../components/Card";
import Header from "../components/Header";
import EventsTable from "../components/EventsTable";
import OnlineUsersPanel from "../components/OnlineUsersPanel";
import IncomingRequestModal from "../components/IncomingRequestModal";
import RemoteViewer from "../components/RemoteViewer";
import HostIndicator from "../components/HostIndicator";

type User = { id: string; email: string };

type Props = {
  user: User | null;
  onLogout: () => void;
};

type IncomingRequest = {
  sessionId: string;
  viewerUserId: string;
  viewerEmail: string;
};

type ViewerSession = {
  sessionId: string;
  hostUserId: string;
};

type HostSession = {
  sessionId: string;
  viewerUserId: string;
  viewerEmail: string;
};

const Main = ({ user, onLogout }: Props) => {
  const [events, setEvents] = useState<any[]>([]);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "error"
  >("disconnected");

  // RTC state
  const [pendingRequest, setPendingRequest] = useState<string | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<IncomingRequest | null>(null);
  const [viewerSession, setViewerSession] = useState<ViewerSession | null>(null);
  const [hostSession, setHostSession] = useState<HostSession | null>(null);

  useEffect(() => {
    window.electronAPI.onInputData((receivedData) => {
      setEvents((prev) => [...prev, { ...receivedData, timestamp: Date.now() }]);
    });

    window.electronAPI.onConnectionStatus((status) => {
      setConnectionStatus(status);
    });

    // RTC event listeners
    window.electronAPI.onIncomingRequest((data) => {
      setIncomingRequest(data);
    });

    window.electronAPI.onRtcAccepted((data) => {
      setPendingRequest(null);
      setViewerSession({
        sessionId: data.sessionId,
        hostUserId: data.hostUserId,
      });
    });

    window.electronAPI.onRtcRejected((data) => {
      setPendingRequest(null);
      // Could show a toast here
      console.log("Request rejected:", data.reason);
    });

    window.electronAPI.onRtcDisconnected(() => {
      setViewerSession(null);
      setHostSession(null);
      setPendingRequest(null);
    });
  }, []);

  const handlePunchIn = async () => {
    const result = await window.electronAPI.punchIn();
    if (result.success) {
      window.electronAPI.startTracking();
      setIsPunchedIn(true);
      setIsOnBreak(false);
    }
  };

  const handlePunchOut = async () => {
    const result = await window.electronAPI.punchOut();
    if (result.success) {
      window.electronAPI.stopTracking();
      setIsPunchedIn(false);
      setIsOnBreak(false);
    }
  };

  const handleTakeBreak = async () => {
    const result = await window.electronAPI.breakStart();
    if (result.success) {
      window.electronAPI.stopTracking();
      setIsOnBreak(true);
    }
  };

  const handleResume = async () => {
    const result = await window.electronAPI.breakEnd();
    if (result.success) {
      window.electronAPI.startTracking();
      setIsOnBreak(false);
    }
  };

  // RTC handlers
  const handleRequestControl = async (targetUserId: string) => {
    const result = await window.electronAPI.rtcRequestControl(targetUserId);
    if (result.success) {
      setPendingRequest(targetUserId);
    }
  };

  const handleAcceptRequest = async () => {
    if (!incomingRequest) return;
    const result = await window.electronAPI.rtcAccept(
      incomingRequest.sessionId,
      incomingRequest.viewerUserId,
      incomingRequest.viewerEmail
    );
    if (result.success) {
      setHostSession({
        sessionId: incomingRequest.sessionId,
        viewerUserId: incomingRequest.viewerUserId,
        viewerEmail: incomingRequest.viewerEmail,
      });
    }
    setIncomingRequest(null);
  };

  const handleRejectRequest = async () => {
    if (!incomingRequest) return;
    await window.electronAPI.rtcReject(
      incomingRequest.sessionId,
      incomingRequest.viewerUserId
    );
    setIncomingRequest(null);
  };

  const handleViewerDisconnect = async () => {
    if (!viewerSession) return;
    await window.electronAPI.rtcDisconnect(viewerSession.sessionId);
    setViewerSession(null);
  };

  const handleHostDisconnect = async () => {
    if (!hostSession) return;
    await window.electronAPI.rtcDisconnect(hostSession.sessionId);
    setHostSession(null);
  };

  return (
    <div className="max-w-screen min-h-screen bg-gray-100 p-4 flex flex-col">
      <Header
        isPunchedIn={isPunchedIn}
        isOnBreak={isOnBreak}
        onPunchIn={handlePunchIn}
        onPunchOut={handlePunchOut}
        onTakeBreak={handleTakeBreak}
        onResume={handleResume}
        user={user}
        onLogout={onLogout}
        connectionStatus={connectionStatus}
      />

      <div className="w-full grid grid-cols-3 gap-6 mt-6">
        <Card text="Events" data={events.length.toString()} />
        <Card text="Work Hour" data="4h 32m" />
        <Card text="Idle Time" data="12m" />
      </div>

      <OnlineUsersPanel
        onRequestControl={handleRequestControl}
        pendingRequest={pendingRequest}
        connectionStatus={connectionStatus}
      />

      <EventsTable events={events} />

      {/* Incoming request modal */}
      <IncomingRequestModal
        request={incomingRequest}
        onAccept={handleAcceptRequest}
        onReject={handleRejectRequest}
      />

      {/* Remote viewer (when viewing someone else's screen) */}
      {viewerSession && (
        <RemoteViewer
          sessionId={viewerSession.sessionId}
          hostUserId={viewerSession.hostUserId}
          onDisconnect={handleViewerDisconnect}
        />
      )}

      {/* Host indicator (when being controlled) */}
      {hostSession && (
        <HostIndicator
          sessionId={hostSession.sessionId}
          viewerUserId={hostSession.viewerUserId}
          viewerEmail={hostSession.viewerEmail}
          onDisconnect={handleHostDisconnect}
        />
      )}
    </div>
  );
};

export default Main;
