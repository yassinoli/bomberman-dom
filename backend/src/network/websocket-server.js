import { WebSocketServer } from "ws";

export function attachWebSocketServer(server, gameRooms) {
  const wss = new WebSocketServer({ server });
  wss.on("connection", (ws) => gameRooms.attachClient(ws));
  return wss;
}
