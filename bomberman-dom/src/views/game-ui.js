import { appState, MAX_LIVES } from "../state/state.js";
import { h } from "../utils/h.js";
import { getResultState } from "../game/get-result-state.js";
import { playerRow } from "../components/player-row.js";
import {messageView} from "../components/message-view.js";

export function getGameHudChildren(me) {
  const result = getResultState(me);

  return [
    h("div", { class: "hud-stat" }, {}, `Lives: ${me ? `${me.lives}/${MAX_LIVES}` : "-"}`),
    h("div", { class: "hud-title" }, {}, result.visible ? result.title : "BOMBERMAN DOM"),
  ];
}

export function getGameResultChildren(result) {
  return [
    h("div", { class: "result-box" }, {}, h("h2", { class: "result-title" }, {}, result.title), h("p", { class: "result-text" }, {}, result.text)),
  ];
}

export function getGamePlayersChildren() {
  return [
    h("h2", {}, {}, "Players"),
    h("div", { class: "player-list" }, {}, ...(appState.state?.players || []).map(playerRow)),
  ];
}

export function getGameChatChildren() {
  return appState.chatMessages.map(messageView);
}