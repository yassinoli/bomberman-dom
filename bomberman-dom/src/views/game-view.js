import { appState } from "../state/state.js";
import { h } from "../utils/h.js";
import { sendChat } from "../network/send-chat.js";
import { getResultState } from "../game/get-result-state.js";
import { getGameChatChildren, getGameHudChildren, getGamePlayersChildren, getGameResultChildren } from "./game-ui.js";

export function gameView() {
  const me = appState.state?.players?.find((player) => player.id === appState.myPlayerId);
  const result = getResultState(me);
  return h(
    "main",
    { class: "app" },
    {},
    h(
      "section",
      { class: "arena-shell" },
      {},
      h(
        "div",
        { class: "hud", ref: (el) => { appState.domRefs.gameHud = el; } },
        {},
        ...getGameHudChildren(me),
      ),
      h("div", { class: "arena-wrap" }, {}, h("div", { id: "map-game", class: "map-game" }, {}, "")),
      h(
        "div",
        { class: `result-banner ${result.kind}${result.visible ? " visible" : ""}`, ref: (el) => { appState.domRefs.resultBanner = el; } },
        {},
        ...getGameResultChildren(result),
      ),
    ),
    h(
      "aside",
      { class: "sidebar" },
      {},
      h(
        "div",
        { class: "side-section", ref: (el) => { appState.domRefs.gameSideSection = el; } },
        {},
        ...getGamePlayersChildren(),
      ),
      h(
        "div",
        {
          id: "chat-log",
          class: "chat-log",
          ref: (el) => { appState.domRefs.gameChatLog = el; },
        },
        {},
        ...getGameChatChildren(),
      ),
      h(
        "form",
        { class: "chat-row" },
        { submit: sendChat },
        h("input", { id: "chat-input", maxlength: "120", placeholder: "Chat...", autocomplete: "off", value: appState.chatDraft }, { input: (e) => { appState.chatDraft = e.target.value;}}, ""),
        h("button", { type: "submit" }, {}, "Send"),
      ),
    ),
  );
}