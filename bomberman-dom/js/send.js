import { appState } from "./state.js";

export function send(message) {
  if (appState.ws && appState.ws.readyState === WebSocket.OPEN) {
    appState.ws.send(JSON.stringify(message));
  }
}
