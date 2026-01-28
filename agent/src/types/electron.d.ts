export {};

type AuthState = {
  isLoggedIn: boolean;
  user?: { id: string; email: string };
};

type LoginResult =
  | { success: true; user: { id: string; email: string } }
  | { success: false; error: string };

type PunchResult =
  | { success: true; record: { id: string; type: string; timestamp: number } }
  | { success: false; error: string };

type RtcResult =
  | { success: true }
  | { success: false; error: string };

type ScreenSource = {
  id: string;
  name: string;
  thumbnailDataUrl: string;
};

type DisplayBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type OnlineUser = {
  userId: string;
  email: string;
  status: "available" | "hosting" | "viewing";
};

type RtcSessionState = {
  sessionId: string | null;
  role: "host" | "viewer" | null;
  remoteUserId: string | null;
  remoteEmail: string | null;
};

type RemoteInputEvent =
  | { inputType: "mouse_move"; x: number; y: number }
  | { inputType: "mouse_click"; x: number; y: number; button: "left" | "right" | "middle" }
  | { inputType: "mouse_down"; x: number; y: number; button: "left" | "right" | "middle" }
  | { inputType: "mouse_up"; x: number; y: number; button: "left" | "right" | "middle" }
  | { inputType: "mouse_scroll"; x: number; y: number; deltaX: number; deltaY: number }
  | { inputType: "key_down"; key: string; code: string; modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean } }
  | { inputType: "key_up"; key: string; code: string; modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean } };

declare global {
  interface Window {
    electronAPI: {
      // Input tracking
      onInputData: (callback: (data: any) => void) => void;
      startTracking: () => void;
      stopTracking: () => void;

      // Auth
      login: (email: string, password: string) => Promise<LoginResult>;
      logout: () => Promise<void>;
      getAuthState: () => Promise<AuthState>;

      // Punch
      punchIn: () => Promise<PunchResult>;
      punchOut: () => Promise<PunchResult>;
      breakStart: () => Promise<PunchResult>;
      breakEnd: () => Promise<PunchResult>;

      // Connection status
      onConnectionStatus: (
        callback: (status: "connected" | "disconnected" | "error") => void
      ) => void;

      // RTC - Config
      rtcGetIceServers: () => Promise<RTCIceServer[]>;

      // RTC - Screen capture
      rtcGetScreenSources: () => Promise<ScreenSource[]>;
      rtcGetDisplayBounds: () => Promise<DisplayBounds>;
      rtcCheckPermission: () => Promise<boolean>;

      // RTC - Signaling
      rtcRequestControl: (targetUserId: string) => Promise<RtcResult>;
      rtcAccept: (sessionId: string, viewerUserId: string, viewerEmail: string) => Promise<RtcResult>;
      rtcReject: (sessionId: string, viewerUserId: string) => Promise<RtcResult>;
      rtcSendOffer: (sessionId: string, targetUserId: string, offer: RTCSessionDescriptionInit) => Promise<RtcResult>;
      rtcSendAnswer: (sessionId: string, targetUserId: string, answer: RTCSessionDescriptionInit) => Promise<RtcResult>;
      rtcSendIce: (sessionId: string, targetUserId: string, candidate: RTCIceCandidateInit) => Promise<RtcResult>;
      rtcDisconnect: (sessionId: string) => Promise<RtcResult>;
      rtcSendInput: (sessionId: string, input: RemoteInputEvent) => Promise<RtcResult>;
      rtcGetSessionState: () => Promise<RtcSessionState>;

      // RTC - Online users
      getOnlineUsers: () => Promise<void>;
      onOnlineUsers: (callback: (users: OnlineUser[]) => void) => void;
      onIncomingRequest: (callback: (data: { sessionId: string; viewerUserId: string; viewerEmail: string }) => void) => void;
      onRtcAccepted: (callback: (data: { sessionId: string; hostUserId: string }) => void) => void;
      onRtcRejected: (callback: (data: { sessionId: string; reason?: string }) => void) => void;
      onRtcOffer: (callback: (data: { sessionId: string; offer: RTCSessionDescriptionInit }) => void) => void;
      onRtcAnswer: (callback: (data: { sessionId: string; answer: RTCSessionDescriptionInit }) => void) => void;
      onRtcIce: (callback: (data: { sessionId: string; candidate: RTCIceCandidateInit }) => void) => void;
      onRtcDisconnected: (callback: (data: { sessionId: string; reason?: string }) => void) => void;
    };
  }
}
