import { appState, KEYS } from "./state.js";
import { send } from "./send.js";

export function handleKeydown(event) {
  if (appState.view !== "game" || appState.state?.phase !== "playing" || document.activeElement?.id === "chat-input") return;
  if (KEYS[event.key]) {
    event.preventDefault();
    const now = performance.now();
    if (now - appState.lastMoveSent >= 45) {
      appState.lastMoveSent = now;
      send({ type: "move", direction: KEYS[event.key] });
    }
  }
  if (event.key === " ") {
    event.preventDefault();
    send({ type: "bomb" });
  }
}
