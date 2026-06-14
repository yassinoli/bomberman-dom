import { appState, COLORS } from "../state/state.js";
import { buildBoard } from "./build-board.js";

export function renderBoard() {
  if (!appState.dirtyBoard || appState.view !== "game" || !appState.state) return;
  buildBoard();
  const map = document.getElementById("map-game");
  if (!map) return;
  appState.dirtyBoard = false;

  const wallSet = new Set(appState.state.walls || []);
  const obstacleSet = new Set(appState.state.obstacles);
  const explosionSet = new Set((appState.state.explosions || []).flatMap((explosion) => explosion.cells));
  const powerupsByPos = new Map((appState.state.powerups || []).map((powerup) => [powerup.pos, powerup]));
  const bombsByPos = new Map((appState.state.bombs || []).map((bomb) => [bomb.pos, bomb]));
  const playersByPos = new Map((appState.state.players || []).filter((player) => player.connected && player.alive).map((player) => [player.pos, player]));

  for (const cell of map.children) {
    const index = Number(cell.dataset.index);
    let className = wallSet.has(index) ? "cell wall" : "cell";
    if (obstacleSet.has(index)) className += " block";
    if (explosionSet.has(index)) className += " explosion";
    if (cell.className !== className) cell.className = className;
    cell.textContent = "";

    const powerup = powerupsByPos.get(index);
    if (powerup) {
      const item = document.createElement("div");
      item.className = "powerup";
      item.textContent = powerup.kind[0].toUpperCase();
      cell.appendChild(item);
    }

    const bomb = bombsByPos.get(index);
    if (bomb) {
      const item = document.createElement("div");
      item.className = "bomb";
      item.textContent = "O";
      cell.appendChild(item);
    }

    const player = playersByPos.get(index);
    if (player) {
      const item = document.createElement("div");
      item.className = `player${player.alive ? "" : " dead"}`;
      item.style.background = COLORS[player.id] || "#fff";
      item.textContent = String(player.id + 1);
      cell.appendChild(item);
    }
  }
}
