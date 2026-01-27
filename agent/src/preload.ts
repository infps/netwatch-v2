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

  // RTC - Config
  rtcGetIceServers: () => ipcRenderer.invoke("rtc-get-ice-servers"),

  // RTC - Screen capture
  rtcGetScreenSources: () => ipcRenderer.invoke("rtc-get-screen-sources"),
  rtcGetDisplayBounds: () => ipcRenderer.invoke("rtc-get-display-bounds"),
  rtcCheckPermission: () => ipcRenderer.invoke("rtc-check-permission"),

  // RTC - Signaling
  rtcRequestControl: (targetUserId: string) =>
    ipcRenderer.invoke("rtc-request-control", targetUserId),
  rtcAccept: (sessionId: string, viewerUserId: string, viewerEmail: string) =>
    ipcRenderer.invoke("rtc-accept", sessionId, viewerUserId, viewerEmail),
  rtcReject: (sessionId: string, viewerUserId: string) =>
    ipcRenderer.invoke("rtc-reject", sessionId, viewerUserId),
  rtcSendOffer: (sessionId: string, targetUserId: string, offer: RTCSessionDescriptionInit) =>
    ipcRenderer.invoke("rtc-send-offer", sessionId, targetUserId, offer),
  rtcSendAnswer: (sessionId: string, targetUserId: string, answer: RTCSessionDescriptionInit) =>
    ipcRenderer.invoke("rtc-send-answer", sessionId, targetUserId, answer),
  rtcSendIce: (sessionId: string, targetUserId: string, candidate: RTCIceCandidateInit) =>
    ipcRenderer.invoke("rtc-send-ice", sessionId, targetUserId, candidate),
  rtcDisconnect: (sessionId: string) =>
    ipcRenderer.invoke("rtc-disconnect", sessionId),
  rtcSendInput: (sessionId: string, input: any) =>
    ipcRenderer.invoke("rtc-send-input", sessionId, input),
  rtcGetSessionState: () => ipcRenderer.invoke("rtc-get-session-state"),

  // RTC - Event listeners
  onOnlineUsers: (callback: (users: any[]) => void) => {
    ipcRenderer.on("rtc-online-users", (_, users) => callback(users));
  },
  onIncomingRequest: (callback: (data: { sessionId: string; viewerUserId: string; viewerEmail: string }) => void) => {
    ipcRenderer.on("rtc-incoming-request", (_, data) => callback(data));
  },
  onRtcAccepted: (callback: (data: { sessionId: string; hostUserId: string }) => void) => {
    ipcRenderer.on("rtc-accepted", (_, data) => callback(data));
  },
  onRtcRejected: (callback: (data: { sessionId: string; reason?: string }) => void) => {
    ipcRenderer.on("rtc-rejected", (_, data) => callback(data));
  },
  onRtcOffer: (callback: (data: { sessionId: string; offer: RTCSessionDescriptionInit }) => void) => {
    ipcRenderer.on("rtc-offer", (_, data) => callback(data));
  },
  onRtcAnswer: (callback: (data: { sessionId: string; answer: RTCSessionDescriptionInit }) => void) => {
    ipcRenderer.on("rtc-answer", (_, data) => callback(data));
  },
  onRtcIce: (callback: (data: { sessionId: string; candidate: RTCIceCandidateInit }) => void) => {
    ipcRenderer.on("rtc-ice", (_, data) => callback(data));
  },
  onRtcDisconnected: (callback: (data: { sessionId: string; reason?: string }) => void) => {
    ipcRenderer.on("rtc-disconnected", (_, data) => callback(data));
  },
});
