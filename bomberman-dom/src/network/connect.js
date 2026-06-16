import { appState } from "../state/state.js";
import { nowTime } from "../utils/now-time.js";
import { send } from "./send.js";
import { renderShell } from "../views/render-shell.js";
import { startFrameLoop } from "../game/frame.js";
import { updateGameChat } from "../ui/update-game-ui.js";


function getGameUiSignature(state) {
  if (!state) return "";
  return [
    state.phase,
    state.winnerId ?? "",
    state.winner || "",
    ...(state.players || []).map((player) => `${player.id}:${player.lives}:${player.alive ? 1 : 0}:${player.connected ? 1 : 0}`),
  ].join("|");
}
export function connect() {
  const url = (location.protocol === "https:" ? "wss://" : "ws://") + location.host;
  appState.ws = new WebSocket(url);
  appState.ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "state") {
      const previousView = appState.view;
      const nextGameUiSignature = getGameUiSignature(data.state);
      appState.state = data.state;
      if (appState.state.phase === "lobby" || appState.state.phase === "countdown") appState.view = "lobby";
      if (appState.state.phase === "playing" || appState.state.phase === "ended") appState.view = "game";
      appState.dirtyBoard = true;
      appState.dirtyShell = previousView !== appState.view;
      appState.dirtyGameUi = appState.view === "game" && nextGameUiSignature !== appState.lastGameUiSignature;
      appState.lastGameUiSignature = nextGameUiSignature;
      if (appState.view === "game") startFrameLoop();
    }
    if (data.type === "joined") {
      appState.myPlayerId = data.playerId;
      appState.view = "lobby";
      appState.dirtyShell = true;
    }
    if (data.type === "joinRejected") {
      appState.chatMessages.push({ sender: "Server", text: data.reason, className: "death", time: nowTime() });
      appState.view = "login";
      appState.dirtyShell = true;
    }
    if (data.type === "chat") {
      appState.chatMessages.push(data);
      if (appState.chatMessages.length > 80) appState.chatMessages.shift();
      appState.dirtyShell = true;
    }
    renderShell();
  });
  appState.ws.addEventListener("close", () => {
    appState.chatMessages.push({ sender: "Server", text: "Disconnected from server.", className: "death", time: nowTime() });
    appState.dirtyShell = true;
    renderShell();
  });
  appState.ws.addEventListener("open", () => {
    if (appState.autoJoinNickname) {
      send({ type: "join", nickname: appState.autoJoinNickname });
    }
  });
}
