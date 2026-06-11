import { updateFps } from "./update-fps.js";
import { renderShell } from "./render-shell.js";
import { updateGameUi } from "./update-game-ui.js";
import { renderBoard } from "./render-board.js";

export function frame(now) {
  updateFps(now);
  renderShell();
  updateGameUi();
  renderBoard();
  requestAnimationFrame(frame);
}
