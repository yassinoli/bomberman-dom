import { appState } from "./state.js";

export function updateLobbyUi() {
  if (appState.view !== "lobby" || !appState.state) return;
  const countdownEl = document.getElementById("lobby-countdown");
  if (!countdownEl) return;
  const countdown = appState.state.countdownEndsAt ? Math.max(0, Math.ceil((appState.state.countdownEndsAt - Date.now()) / 1000)) : null;
  countdownEl.textContent = countdown === null ? "When 2 players join, the match starts after 20 seconds unless the room fills first." : `Match starts in ${countdown}s.`;
}
