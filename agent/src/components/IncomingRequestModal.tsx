import { useEffect, useState } from "react";

type IncomingRequest = {
  sessionId: string;
  viewerUserId: string;
  viewerEmail: string;
};

type Props = {
  request: IncomingRequest | null;
  onAccept: () => void;
  onReject: () => void;
};

const IncomingRequestModal = ({ request, onAccept, onReject }: Props) => {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!request) {
      setCountdown(30);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onReject();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [request, onReject]);

  if (!request) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          Incoming Remote Control Request
        </h2>
        <p className="text-gray-600 mb-4">
          <span className="font-medium">{request.viewerEmail}</span> wants to
          control your screen.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Auto-rejecting in {countdown}s
        </p>
        <div className="flex gap-3">
          <button
            onClick={onAccept}
            className="flex-1 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
          >
            Accept
          </button>
          <button
            onClick={onReject}
            className="flex-1 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-medium"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingRequestModal;
