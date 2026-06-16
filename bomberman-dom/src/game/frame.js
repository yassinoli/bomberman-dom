import { updateFps } from "../ui/update-fps.js";
import { renderShell } from "../views/render-shell.js";
import { updateGameUi } from "../ui/update-game-ui.js";
import { renderBoard } from "./render-board.js";
import { appState } from "../state/state.js";

let frameRunning = false;

export function startFrameLoop() {
  if (frameRunning) return;
  frameRunning = true;
  requestAnimationFrame(frame);
}

export function frame(now) {
  if (appState.view !== "game") {
    frameRunning = false;
    return;
  }
  updateFps(now);
  if (appState.dirtyGame) updateGameUi();
  renderBoard();
  if (appState.dirtyBoard || appState.dirtyGameUi) {
    requestAnimationFrame(frame);
    return;
  }
  frameRunning = false;
}
