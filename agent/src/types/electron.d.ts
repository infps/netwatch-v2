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
    };
  }
}
