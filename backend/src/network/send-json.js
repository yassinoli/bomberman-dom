export function sendJson(ws, message) {
  if (ws.readyState === 1) ws.send(JSON.stringify(message));
}
