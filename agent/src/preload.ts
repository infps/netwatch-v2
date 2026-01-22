// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // Input tracking
  onInputData: (callback: (data: any) => void) => {
    ipcRenderer.on("input-data", (_, data) => callback(data));
  },
  startTracking: () => ipcRenderer.send("start-tracking"),
  stopTracking: () => ipcRenderer.send("stop-tracking"),

  // Auth
  login: (email: string, password: string) =>
    ipcRenderer.invoke("login", email, password),
  logout: () => ipcRenderer.invoke("logout"),
  getAuthState: () => ipcRenderer.invoke("get-auth-state"),

  // Punch
  punchIn: () => ipcRenderer.invoke("punch-in"),
  punchOut: () => ipcRenderer.invoke("punch-out"),
  breakStart: () => ipcRenderer.invoke("break-start"),
  breakEnd: () => ipcRenderer.invoke("break-end"),

  // Connection status
  onConnectionStatus: (callback: (status: 'connected' | 'disconnected' | 'error') => void) => {
    ipcRenderer.on("connection-status", (_, status) => callback(status));
  },
});
