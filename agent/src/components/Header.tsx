type User = { id: string; email: string };

type HeaderProps = {
  isPunchedIn: boolean;
  isOnBreak: boolean;
  onPunchIn: () => void;
  onPunchOut: () => void;
  onTakeBreak: () => void;
  onResume: () => void;
  user: User | null;
  onLogout: () => void;
  connectionStatus: "connected" | "disconnected" | "error";
};

const Header = ({
  isPunchedIn,
  isOnBreak,
  onPunchIn,
  onPunchOut,
  onTakeBreak,
  onResume,
  user,
  onLogout,
  connectionStatus,
}: HeaderProps) => {
  const statusColors = {
    connected: "bg-green-500",
    disconnected: "bg-yellow-500",
    error: "bg-red-500",
  };

  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
      <div className="flex items-center space-x-3">
        <p className="text-2xl font-semibold text-black">Netwatch</p>
        <div
          className={`w-2 h-2 rounded-full ${statusColors[connectionStatus]}`}
          title={connectionStatus}
        />
      </div>

      <div className="flex items-center space-x-4">
        {user && (
          <span className="text-sm text-gray-600">{user.email}</span>
        )}

        <div className="flex items-center justify-center space-x-2">
          {!isPunchedIn ? (
            <button
              onClick={onPunchIn}
              className="bg-black rounded-md px-4 p-2 text-white"
            >
              Punch In
            </button>
          ) : (
            <>
              <button
                onClick={onPunchOut}
                className="bg-black rounded-md px-4 p-2 text-white"
              >
                Punch Out
              </button>
              <button
                onClick={isOnBreak ? onResume : onTakeBreak}
                className="border border-black text-black rounded-md px-4 p-2"
              >
                {isOnBreak ? "Resume" : "Take Break"}
              </button>
            </>
          )}
        </div>

        <button
          onClick={onLogout}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Header;
