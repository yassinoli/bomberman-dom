import { appState, DEFAULT_GRID_COLS, DEFAULT_GRID_ROWS } from "./state.js";

export function buildBoard() {
  const map = document.getElementById("map-game");
  if (!map || appState.boardBuilt) return;
  const cols = appState.state?.width || DEFAULT_GRID_COLS;
  const rows = appState.state?.height || DEFAULT_GRID_ROWS;
  const walls = new Set(appState.state?.walls || []);
  map.style.setProperty("--cols", String(cols));
  map.style.setProperty("--rows", String(rows));
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < cols * rows; i++) {
    const cell = document.createElement("div");
    cell.className = walls.has(i) ? "cell wall" : "cell";
    cell.dataset.index = String(i);
    fragment.appendChild(cell);
  }
  map.textContent = "";
  map.appendChild(fragment);
  appState.boardBuilt = true;
}
