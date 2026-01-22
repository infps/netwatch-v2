import { useEffect, useState } from "react";
import Card from "../components/Card";
import Header from "../components/Header";
import EventsTable from "../components/EventsTable";

type User = { id: string; email: string };

type Props = {
  user: User | null;
  onLogout: () => void;
};

const Main = ({ user, onLogout }: Props) => {
  const [events, setEvents] = useState<any[]>([]);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "error"
  >("disconnected");

  useEffect(() => {
    window.electronAPI.onInputData((receivedData) => {
      setEvents((prev) => [...prev, { ...receivedData, timestamp: Date.now() }]);
    });

    window.electronAPI.onConnectionStatus((status) => {
      setConnectionStatus(status);
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

      <EventsTable events={events} />
    </div>
  );
};

export default Main;
