import { app, BrowserWindow, ipcMain } from "electron";
import { uIOhook, UiohookMouseEvent, UiohookKeyboardEvent } from "uiohook-napi";
import WebSocket from "ws";
import { randomUUID } from "crypto";

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
      } else if (msg.type === "auth_fail") {
        sendConnectionStatus("error");
        ws?.close();
      } else if (msg.type === "batch_ack" && msg.batchId === pendingBatchId) {
        // Clear acknowledged events
        eventBuffer = eventBuffer.filter(
          (e) => e.timestamp > Date.now() - 60000
        );
        pendingBatchId = null;
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
