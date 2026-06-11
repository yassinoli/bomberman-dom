import { appState, COLORS } from "./state.js";
import { h } from "./h.js";

export function playerRow(player) {
  const status = player.alive ? `${player.lives} lives` : player.lives > 0 ? "respawning" : "out";
  return h(
    "div",
    { class: "player-row" },
    {},
    h("span", { class: "swatch", style: `background:${COLORS[player.id] || "#fff"}` }, {}, ""),
    h("span", {}, {}, `${player.nickname}${player.id === appState.myPlayerId ? " (you)" : ""}`),
    h("span", {}, {}, status),
  );
}
