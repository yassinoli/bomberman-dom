import renderElement from "/fw/render-elemnt.mjs";
import { appState } from "../state/state.js";
import { loginView } from "./login-view.js";
import { lobbyView } from "./lobby-view.js";
import { gameView } from "./game-view.js";

function focusLobbyChatInput() {
  const input = document.getElementById("chat-input");
  if (input && appState.view === "lobby") input.focus({ preventScroll: true });
}

export function renderShell() {
  if (!appState.dirtyShell) return;
  appState.dirtyShell = false;
  if (appState.view === "login") renderElement(true, appState.root, loginView());
  if (appState.view === "lobby") {
    renderElement(true, appState.root, lobbyView());
    focusLobbyChatInput();
  }
  if (appState.view === "game") {
    renderElement(true, appState.root, gameView());
    appState.boardBuilt = false;
    appState.dirtyBoard = true;
  }
}
