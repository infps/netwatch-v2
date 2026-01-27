import { useEffect, useState } from "react";

type OnlineUser = {
  userId: string;
  email: string;
  status: "available" | "hosting" | "viewing";
};

type Props = {
  onRequestControl: (userId: string) => void;
  pendingRequest: string | null;
};

const OnlineUsersPanel = ({ onRequestControl, pendingRequest }: Props) => {
  const [users, setUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    window.electronAPI.onOnlineUsers((onlineUsers) => {
      setUsers(onlineUsers);
    });
  }, []);

  const getStatusBadge = (status: OnlineUser["status"]) => {
    switch (status) {
      case "available":
        return <span className="w-2 h-2 bg-green-500 rounded-full" />;
      case "hosting":
        return <span className="w-2 h-2 bg-red-500 rounded-full" />;
      case "viewing":
        return <span className="w-2 h-2 bg-yellow-500 rounded-full" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold text-gray-800 mb-3">Online Users</h3>
      {users.length === 0 ? (
        <p className="text-gray-500 text-sm">No other users online</p>
      ) : (
        <ul className="space-y-2">
          {users.map((user) => (
            <li
              key={user.userId}
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <div className="flex items-center gap-2">
                {getStatusBadge(user.status)}
                <span className="text-sm text-gray-700">{user.email}</span>
              </div>
              {user.status === "available" && (
                <button
                  onClick={() => onRequestControl(user.userId)}
                  disabled={pendingRequest !== null}
                  className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {pendingRequest === user.userId ? "Requesting..." : "Control"}
                </button>
              )}
              {user.status !== "available" && (
                <span className="text-xs text-gray-500">
                  {user.status === "hosting" ? "Being controlled" : "Viewing"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OnlineUsersPanel;
