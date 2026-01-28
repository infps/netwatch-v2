import { useEffect, useState } from "react";

type OnlineUser = {
  userId: string;
  email: string;
  status: "available" | "hosting" | "viewing";
};

type Props = {
  onRequestControl: (userId: string) => void;
  pendingRequest: string | null;
  connectionStatus: "connected" | "disconnected" | "error";
};

const OnlineUsersPanel = ({ onRequestControl, pendingRequest, connectionStatus }: Props) => {
  const [users, setUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    window.electronAPI.onOnlineUsers((onlineUsers) => {
      setUsers(onlineUsers);
    });
  }, []);

  // Request users when connected and poll
  useEffect(() => {
    if (connectionStatus !== "connected") return;

    // Fetch when connected
    window.electronAPI.getOnlineUsers();

    // Poll every 5 seconds
    const interval = setInterval(() => {
      window.electronAPI.getOnlineUsers();
    }, 5000);

    return () => clearInterval(interval);
  }, [connectionStatus]);

  const getStatusBadge = (status: OnlineUser["status"]) => {
    switch (status) {
      case "available":
        return <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />;
      case "hosting":
        return <span className="inline-block w-2 h-2 bg-red-500 rounded-full" />;
      case "viewing":
        return <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full" />;
    }
  };

  const getStatusText = (status: OnlineUser["status"]) => {
    switch (status) {
      case "available": return "Available";
      case "hosting": return "Being Controlled";
      case "viewing": return "Viewing";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow mt-6">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Online Users</h3>
        <button
          onClick={() => window.electronAPI.getOnlineUsers()}
          className="text-xs text-blue-500 hover:text-blue-700"
        >
          Refresh
        </button>
      </div>

      {users.length === 0 ? (
        <div className="p-4 text-gray-500 text-sm text-center">
          No other users online
        </div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.userId} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(user.status)}
                    <span className="text-sm text-gray-600">{getStatusText(user.status)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{user.email}</td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs">{user.userId.slice(0, 8)}...</td>
                <td className="px-4 py-3 text-right">
                  {user.status === "available" ? (
                    <button
                      onClick={() => onRequestControl(user.userId)}
                      disabled={pendingRequest !== null}
                      className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {pendingRequest === user.userId ? "Requesting..." : "Control"}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">Unavailable</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OnlineUsersPanel;
