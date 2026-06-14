import { connect } from "./network/connect.js";
import { renderShell } from "./views/render-shell.js";
import { startFrameLoop } from "./game/frame.js";
import { handleKeydown } from "./game/handle-keydown.js";
import { appState } from "./state/state.js";
import { updateLobbyUi } from "./ui/update-lobby-ui.js";

document.addEventListener("keydown", handleKeydown);

connect();
renderShell();

setInterval(() => {
  if (appState.view !== "lobby" || !appState.state) return;
  updateLobbyUi();
}, 1000);

if (appState.view === "game") startFrameLoop();
