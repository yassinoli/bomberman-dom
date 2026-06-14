import { appState } from "./state.js";
import { h } from "./h.js";
import { joinGame } from "./join-game.js";

export function loginView() {
  return h(
    "main",
    { class: "screen" },
    {},
    h(
      "section",
      { class: "panel" },
      {},
      h("h1", {}, {}, "Bomberman DOM"),
      h("p", {}, {}, "Enter a nickname to join the multiplayer lobby."),
      h(
        "form",
        { class: "nickname-form" },
        { submit: joinGame },
        h("input", { id: "nickname", maxlength: "16", minlength: "2", placeholder: "Nickname", value: appState.nickname, autocomplete: "off" }, {}, ""),
        h("button", { type: "submit" }, {}, "Join lobby"),
      ),
      h(
        "div",
        { class: "test-tools" },
        {},
        h("p", {}, {}, "Local test: open these slots in separate tabs or different browsers on this PC."),
        h(
          "div",
          { class: "test-links" },
          {},
          h("a", { href: "/?testPlayer=1", target: "_blank", rel: "noreferrer" }, {}, "P1"),
          h("a", { href: "/?testPlayer=2", target: "_blank", rel: "noreferrer" }, {}, "P2"),
          h("a", { href: "/?testPlayer=3", target: "_blank", rel: "noreferrer" }, {}, "P3"),
          h("a", { href: "/?testPlayer=4", target: "_blank", rel: "noreferrer" }, {}, "P4"),
        ),
      ),
    ),
  );
}
