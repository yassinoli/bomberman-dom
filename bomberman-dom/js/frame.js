import { updateFps } from "./update-fps.js";
import { renderShell } from "./render-shell.js";
import { updateGameUi } from "./update-game-ui.js";
import { renderBoard } from "./render-board.js";
import { appState } from "./state.js";

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
  renderShell();
  updateGameUi();
  renderBoard();
  requestAnimationFrame(frame);
}
