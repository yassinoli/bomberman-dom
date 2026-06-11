import { appState, COLORS, MAX_LIVES } from "./state.js";
import { getResultState } from "./get-result-state.js";

export function updateGameUi() {
  if (appState.view !== "game" || !appState.state) return;
  const me = appState.state.players?.find((player) => player.id === appState.myPlayerId);
  const livesReadout = document.getElementById("lives-readout");
  const title = document.getElementById("match-title");
  const fpsReadout = document.getElementById("fps-readout");
  const perfReadout = document.getElementById("perf-readout");
  const playerList = document.getElementById("player-list");
  const resultBanner = document.getElementById("result-banner");
  const resultTitle = document.getElementById("result-title");
  const resultText = document.getElementById("result-text");
  const result = getResultState(me);

  if (livesReadout) livesReadout.textContent = `Lives: ${me ? `${me.lives}/${MAX_LIVES}` : "-"}`;
  if (title) title.textContent = result.visible ? result.title : "BOMBERMAN DOM";
  if (fpsReadout) fpsReadout.textContent = `FPS: ${appState.fps}`;
  if (perfReadout) perfReadout.textContent = `Render: ${appState.fps}fps, DOM board uses requestAnimationFrame`;
  if (resultBanner) resultBanner.className = `result-banner ${result.kind}${result.visible ? " visible" : ""}`;
  if (resultTitle) resultTitle.textContent = result.title;
  if (resultText) resultText.textContent = result.text;

  if (playerList) {
    playerList.innerHTML = "";
    for (const player of appState.state.players || []) {
      const row = document.createElement("div");
      row.className = "player-row";
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = COLORS[player.id] || "#fff";
      const name = document.createElement("span");
      name.textContent = `${player.nickname}${player.id === appState.myPlayerId ? " (you)" : ""}`;
      const status = document.createElement("span");
      status.textContent = player.alive ? `${player.lives} lives` : player.lives > 0 ? "respawning" : "out";
      row.append(swatch, name, status);
      playerList.appendChild(row);
    }
  }
}
