import { connect } from "./js/connect.js";
import { renderShell } from "./js/render-shell.js";
import { startFrameLoop } from "./js/frame.js";
import { handleKeydown } from "./js/handle-keydown.js";
import { appState } from "./js/state.js";
import { updateLobbyUi } from "./js/update-lobby-ui.js";

document.addEventListener("keydown", handleKeydown);

connect();
renderShell();

setInterval(() => {
  if (appState.view !== "lobby" || !appState.state) return;
  updateLobbyUi();
}, 1000);

if (appState.view === "game") startFrameLoop();
