import { appState } from "./state.js";
import { nowTime } from "./now-time.js";
import { send } from "./send.js";

export function connect() {
  const url = (location.protocol === "https:" ? "wss://" : "ws://") + location.host;
  appState.ws = new WebSocket(url);
  appState.ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "state") {
      const previousView = appState.view;
      appState.state = data.state;
      if (appState.state.phase === "lobby" || appState.state.phase === "countdown") appState.view = "lobby";
      if (appState.state.phase === "playing" || appState.state.phase === "ended") appState.view = "game";
      appState.dirtyBoard = true;
      appState.dirtyShell = previousView !== appState.view || appState.view !== "game";
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
  });
  appState.ws.addEventListener("close", () => {
    appState.chatMessages.push({ sender: "Server", text: "Disconnected from server.", className: "death", time: nowTime() });
    appState.dirtyShell = true;
  });
  appState.ws.addEventListener("open", () => {
    if (appState.autoJoinNickname) {
      send({ type: "join", nickname: appState.autoJoinNickname });
    }
  });
}
