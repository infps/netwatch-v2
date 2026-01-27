import "dotenv/config";
import { app, BrowserWindow, ipcMain } from "electron";
import { uIOhook, UiohookMouseEvent, UiohookKeyboardEvent } from "uiohook-napi";
import WebSocket from "ws";
import { randomUUID } from "crypto";
import { getScreenSources, getPrimaryDisplayBounds, checkScreenCapturePermission } from "./lib/screen-capture";
import { injectInput, RemoteInputEvent } from "./lib/input-injector";
import { getSessionState, setHostingSession, setViewingSession, clearSession, isInSession, isHost } from "./lib/rtc-state";
import { getIceServers } from "./lib/ice-config";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require("electron-squirrel-startup")) {
  app.quit();
}

const API_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000/ws";

// Auth state
let authToken: string | null = null;
let currentUser: { id: string; email: string } | null = null;

// WebSocket state
let ws: WebSocket | null = null;
let wsReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// Event buffer
type ActivityEvent = {
  type: "mouse" | "key";
  eventId: string;
  timestamp: number;
  [key: string]: any;
};

let eventBuffer: ActivityEvent[] = [];
let pendingBatchId: string | null = null;
let flushInterval: NodeJS.Timeout | null = null;

let mainWindow: BrowserWindow | null = null;

function sendConnectionStatus(status: "connected" | "disconnected" | "error") {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("connection-status", status);
  }
}

function connectWebSocket() {
  if (!authToken) return;
  if (ws && ws.readyState === WebSocket.OPEN) return;

  ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    wsReconnectAttempts = 0;
    ws!.send(JSON.stringify({ type: "auth", token: authToken }));
  });

  ws.on("message", (data: WebSocket.Data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "auth_ok") {
        sendConnectionStatus("connected");
        startFlushInterval();
        // Request online users after auth
        ws?.send(JSON.stringify({ type: "get_online_users" }));
      } else if (msg.type === "auth_fail") {
        sendConnectionStatus("error");
        ws?.close();
      } else if (msg.type === "batch_ack" && msg.batchId === pendingBatchId) {
        eventBuffer = eventBuffer.filter(
          (e) => e.timestamp > Date.now() - 60000
        );
        pendingBatchId = null;
      }
      // RTC messages - forward to renderer
      else if (msg.type === "online_users") {
        mainWindow?.webContents.send("rtc-online-users", msg.users);
      } else if (msg.type === "rtc_incoming") {
        mainWindow?.webContents.send("rtc-incoming-request", {
          sessionId: msg.sessionId,
          viewerUserId: msg.viewerUserId,
          viewerEmail: msg.viewerEmail
        });
      } else if (msg.type === "rtc_accepted") {
        setViewingSession(msg.sessionId, msg.hostUserId);
        mainWindow?.webContents.send("rtc-accepted", {
          sessionId: msg.sessionId,
          hostUserId: msg.hostUserId
        });
      } else if (msg.type === "rtc_rejected") {
        clearSession();
        mainWindow?.webContents.send("rtc-rejected", {
          sessionId: msg.sessionId,
          reason: msg.reason
        });
      } else if (msg.type === "rtc_offer") {
        mainWindow?.webContents.send("rtc-offer", {
          sessionId: msg.sessionId,
          offer: msg.offer
        });
      } else if (msg.type === "rtc_answer") {
        mainWindow?.webContents.send("rtc-answer", {
          sessionId: msg.sessionId,
          answer: msg.answer
        });
      } else if (msg.type === "rtc_ice") {
        mainWindow?.webContents.send("rtc-ice", {
          sessionId: msg.sessionId,
          candidate: msg.candidate
        });
      } else if (msg.type === "rtc_disconnected") {
        clearSession();
        mainWindow?.webContents.send("rtc-disconnected", {
          sessionId: msg.sessionId,
          reason: msg.reason
        });
      } else if (msg.type === "rtc_input") {
        // Host receives input from viewer - inject it
        if (isHost()) {
          injectInput(msg.input as RemoteInputEvent);
        }
      }
    } catch {}
  });

  ws.on("close", () => {
    sendConnectionStatus("disconnected");
    stopFlushInterval();
    scheduleReconnect();
  });

  ws.on("error", () => {
    sendConnectionStatus("error");
  });
}

function scheduleReconnect() {
  if (!authToken) return;
  if (wsReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;

  const delay = Math.min(1000 * Math.pow(2, wsReconnectAttempts), 30000);
  wsReconnectAttempts++;

  setTimeout(() => {
    if (authToken) connectWebSocket();
  }, delay);
}

function startFlushInterval() {
  if (flushInterval) return;
  flushInterval = setInterval(flushEvents, 60000);
}

function stopFlushInterval() {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
}

function flushEvents() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  if (eventBuffer.length === 0) return;
  if (pendingBatchId) return; // Wait for previous ack

  pendingBatchId = randomUUID();
  ws.send(
    JSON.stringify({
      type: "activity_batch",
      events: eventBuffer,
      batchId: pendingBatchId,
    })
  );
}

function addEvent(event: Omit<ActivityEvent, "eventId" | "timestamp">) {
  eventBuffer.push({
    ...event,
    eventId: randomUUID(),
    timestamp: Date.now(),
  } as ActivityEvent);
}

async function apiCall<T>(
  path: string,
  options: RequestInit = {}
): Promise<T | { error: string }> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    return await res.json();
  } catch (e) {
    return { error: "Network error" };
  }
}

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.webContents.on("did-finish-load", () => {
    let mouseMovements = 0;
    let keystrokes = 0;
    const recentKeys: number[] = [];

    uIOhook.on("mousemove", (e: UiohookMouseEvent) => {
      mouseMovements++;
      mainWindow!.webContents.send("input-data", {
        type: "mouse",
        x: e.x,
        y: e.y,
        movements: mouseMovements,
      });

      // Buffer for server
      addEvent({
        type: "mouse",
        x: e.x,
        y: e.y,
        movements: mouseMovements,
      });
    });

    uIOhook.on("keydown", (e: UiohookKeyboardEvent) => {
      keystrokes++;
      recentKeys.push(e.keycode);
      if (recentKeys.length > 10) recentKeys.shift();

      mainWindow!.webContents.send("input-data", {
        type: "key",
        keystrokes,
        recentKeys: [...recentKeys],
      });

      // Buffer for server
      addEvent({
        type: "key",
        keystrokes,
        recentKeys: [...recentKeys],
      });
    });

    ipcMain.on("start-tracking", () => {
      uIOhook.start();
    });

    ipcMain.on("stop-tracking", () => {
      uIOhook.stop();
    });
  });

  // IPC handlers for auth
  ipcMain.handle("login", async (_, email: string, password: string) => {
    const res = await apiCall<{
      token: string;
      user: { id: string; email: string };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if ("error" in res) {
      return { success: false, error: res.error };
    }

    authToken = res.token;
    currentUser = res.user;
    connectWebSocket();
    return { success: true, user: res.user };
  });

  ipcMain.handle("logout", async () => {
    authToken = null;
    currentUser = null;
    if (ws) {
      ws.close();
      ws = null;
    }
    stopFlushInterval();
  });

  ipcMain.handle("get-auth-state", () => {
    return {
      isLoggedIn: !!authToken,
      user: currentUser,
    };
  });

  // IPC handlers for punch
  ipcMain.handle("punch-in", async () => {
    const res = await apiCall<{ id: string; type: string; timestamp: number }>(
      "/punch/in",
      { method: "POST" }
    );
    if ("error" in res) return { success: false, error: res.error };
    return { success: true, record: res };
  });

  ipcMain.handle("punch-out", async () => {
    const res = await apiCall<{ id: string; type: string; timestamp: number }>(
      "/punch/out",
      { method: "POST" }
    );
    if ("error" in res) return { success: false, error: res.error };
    return { success: true, record: res };
  });

  ipcMain.handle("break-start", async () => {
    const res = await apiCall<{ id: string; type: string; timestamp: number }>(
      "/punch/break/start",
      { method: "POST" }
    );
    if ("error" in res) return { success: false, error: res.error };
    return { success: true, record: res };
  });

  ipcMain.handle("break-end", async () => {
    const res = await apiCall<{ id: string; type: string; timestamp: number }>(
      "/punch/break/end",
      { method: "POST" }
    );
    if ("error" in res) return { success: false, error: res.error };
    return { success: true, record: res };
  });

  // IPC handlers for RTC
  ipcMain.handle("rtc-get-ice-servers", () => {
    return getIceServers();
  });

  ipcMain.handle("rtc-get-screen-sources", async () => {
    return await getScreenSources();
  });

  ipcMain.handle("rtc-get-display-bounds", () => {
    return getPrimaryDisplayBounds();
  });

  ipcMain.handle("rtc-check-permission", () => {
    return checkScreenCapturePermission();
  });

  ipcMain.handle("rtc-request-control", (_, targetUserId: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return { success: false, error: "Not connected" };
    if (isInSession()) return { success: false, error: "Already in session" };
    ws.send(JSON.stringify({ type: "rtc_request", targetUserId }));
    return { success: true };
  });

  ipcMain.handle("rtc-accept", (_, sessionId: string, viewerUserId: string, viewerEmail: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return { success: false, error: "Not connected" };
    setHostingSession(sessionId, viewerUserId, viewerEmail);
    ws.send(JSON.stringify({ type: "rtc_accept", sessionId, viewerUserId }));
    return { success: true };
  });

  ipcMain.handle("rtc-reject", (_, sessionId: string, viewerUserId: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return { success: false, error: "Not connected" };
    ws.send(JSON.stringify({ type: "rtc_reject", sessionId, viewerUserId }));
    return { success: true };
  });

  ipcMain.handle("rtc-send-offer", (_, sessionId: string, targetUserId: string, offer: RTCSessionDescriptionInit) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return { success: false, error: "Not connected" };
    ws.send(JSON.stringify({ type: "rtc_offer", sessionId, targetUserId, offer }));
    return { success: true };
  });

  ipcMain.handle("rtc-send-answer", (_, sessionId: string, targetUserId: string, answer: RTCSessionDescriptionInit) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return { success: false, error: "Not connected" };
    ws.send(JSON.stringify({ type: "rtc_answer", sessionId, targetUserId, answer }));
    return { success: true };
  });

  ipcMain.handle("rtc-send-ice", (_, sessionId: string, targetUserId: string, candidate: RTCIceCandidateInit) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return { success: false, error: "Not connected" };
    ws.send(JSON.stringify({ type: "rtc_ice", sessionId, targetUserId, candidate }));
    return { success: true };
  });

  ipcMain.handle("rtc-disconnect", (_, sessionId: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return { success: false, error: "Not connected" };
    clearSession();
    ws.send(JSON.stringify({ type: "rtc_disconnect", sessionId }));
    return { success: true };
  });

  ipcMain.handle("rtc-send-input", (_, sessionId: string, input: RemoteInputEvent) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return { success: false, error: "Not connected" };
    ws.send(JSON.stringify({ type: "rtc_input", sessionId, input }));
    return { success: true };
  });

  ipcMain.handle("rtc-get-session-state", () => {
    return getSessionState();
  });

  mainWindow.webContents.openDevTools();
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
