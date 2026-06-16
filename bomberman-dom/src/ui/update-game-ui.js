import { appState } from "../state/state.js";
import { getResultState } from "../game/get-result-state.js";
import renderElement from "/fw/render-elemnt.mjs";
import { getGameChatChildren, getGameHudChildren, getGamePlayersChildren, getGameResultChildren } from "../views/game-ui.js";

export function updateGameUi() {
  if (appState.view !== "game" || !appState.state) return;
  const me = appState.state.players?.find((player) => player.id === appState.myPlayerId);
  const result = getResultState(me);
  const { gameHud, resultBanner, gameSideSection } = appState.domRefs;

  if (!gameHud || !resultBanner || !gameSideSection) return;

  renderElement(true, gameHud, ...getGameHudChildren(me));
  resultBanner.className = `result-banner ${result.kind}${result.visible ? " visible" : ""}`;
  renderElement(true, resultBanner, ...getGameResultChildren(result));
  renderElement(true, gameSideSection, ...getGamePlayersChildren());
  appState.dirtyGameUi = false;
}

export function updateGameChat() {
  if (appState.view !== "game") return;
  const { gameChatLog } = appState.domRefs;
  if (!gameChatLog) return;
  renderElement(true, gameChatLog, ...getGameChatChildren());
  appState.dirtyGameChat = false;
}