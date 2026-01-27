// ICE server configuration - reads from environment variables
export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUrl = process.env.TURN_SERVER_URL;
  const turnUsername = process.env.TURN_USERNAME;
  const turnCredential = process.env.TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    // Add multiple transport options for better connectivity
    servers.push(
      {
        urls: turnUrl,
        username: turnUsername,
        credential: turnCredential,
      },
      {
        urls: turnUrl.replace(":80", ":443"),
        username: turnUsername,
        credential: turnCredential,
      },
      {
        urls: turnUrl.replace("turn:", "turns:").replace(":80", ":443") + "?transport=tcp",
        username: turnUsername,
        credential: turnCredential,
      }
    );
  }

  return servers;
}
