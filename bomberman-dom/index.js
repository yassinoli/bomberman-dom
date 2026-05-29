import createElement from "/fw/create-element.mjs";
import renderElement from "/fw/render-elemnt.mjs";

const DEFAULT_GRID_COLS = 17;
const DEFAULT_GRID_ROWS = 11;
const MAX_LIVES = 3;
const COLORS = ["#38bdf8", "#fb7185", "#facc15", "#34d399"];
const KEYS = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };

const root = document.getElementById("root");
const params = new URLSearchParams(location.search);
const testPlayer = Number(params.get("testPlayer"));
const autoJoinNickname = params.get("nickname") || (Number.isInteger(testPlayer) && testPlayer >= 1 && testPlayer <= 4 ? `Test ${testPlayer}` : "");
let ws = null;
let myPlayerId = null;
let nickname = autoJoinNickname || sessionStorage.getItem("bomberman-nickname") || localStorage.getItem("bomberman-nickname") || "";
let state = null;
let view = "login";
let boardBuilt = false;
let dirtyBoard = true;
let dirtyShell = true;
let chatMessages = [];
let lastMoveSent = 0;
let frames = 0;
let fps = 60;
let lastFpsAt = performance.now();

function h(tag, attrs = {}, events = {}, ...children) {
  return createElement(tag, attrs, events, ...children);
}

function connect() {
  const url = (location.protocol === "https:" ? "wss://" : "ws://") + location.host;
  ws = new WebSocket(url);
  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "state") {
      const previousView = view;
      state = data.state;
      if (state.phase === "lobby" || state.phase === "countdown") view = "lobby";
      if (state.phase === "playing" || state.phase === "ended") view = "game";
      dirtyBoard = true;
      dirtyShell = previousView !== view || view !== "game";
    }
    if (data.type === "joined") {
      myPlayerId = data.playerId;
      view = "lobby";
      dirtyShell = true;
    }
    if (data.type === "joinRejected") {
      chatMessages.push({ sender: "Server", text: data.reason, className: "death", time: nowTime() });
      view = "login";
      dirtyShell = true;
    }
    if (data.type === "chat") {
      chatMessages.push(data);
      if (chatMessages.length > 80) chatMessages.shift();
      dirtyShell = true;
    }
  });
  ws.addEventListener("close", () => {
    chatMessages.push({ sender: "Server", text: "Disconnected from server.", className: "death", time: nowTime() });
    dirtyShell = true;
  });
  ws.addEventListener("open", () => {
    if (autoJoinNickname) {
      send({ type: "join", nickname: autoJoinNickname });
    }
  });
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function send(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function joinGame(event) {
  event.preventDefault();
  const input = document.getElementById("nickname");
  nickname = input.value.trim().slice(0, 16);
  if (nickname.length < 2) return;
  sessionStorage.setItem("bomberman-nickname", nickname);
  localStorage.setItem("bomberman-nickname", nickname);
  send({ type: "join", nickname });
}

function sendChat(event) {
  event.preventDefault();
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;
  send({ type: "chat", text });
  input.value = "";
}

function loginView() {
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
        h("input", { id: "nickname", maxlength: "16", minlength: "2", placeholder: "Nickname", value: nickname, autocomplete: "off" }, {}, ""),
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
        h("a", { class: "reset-link", href: "/reset", target: "_blank", rel: "noreferrer" }, {}, "Reset local room"),
      ),
    ),
  );
}

function lobbyView() {
  const players = state?.players || [];
  const count = players.filter((player) => player.connected).length;
  const countdown = state?.countdownEndsAt ? Math.max(0, Math.ceil((state.countdownEndsAt - Date.now()) / 1000)) : null;
  return h(
    "main",
    { class: "screen" },
    {},
    h(
      "section",
      { class: "panel" },
      {},
      h("h2", {}, {}, "Waiting room"),
      h("p", {}, {}, `${count}/${state?.maxPlayers || 4} players joined. Minimum ${state?.minPlayers || 2} players required.`),
      h("p", {}, {}, countdown === null ? "When 2 players join, the match starts after 20 seconds unless the room fills first." : `Match starts in ${countdown}s.`),
      h("div", { class: "lobby-list" }, {}, ...players.map((player) => h("div", { class: "lobby-player" }, {}, h("span", {}, {}, player.nickname), h("span", {}, {}, `P${player.id + 1}`)))),
    ),
  );
}

function gameView() {
  const me = state?.players?.find((player) => player.id === myPlayerId);
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
        { class: "hud" },
        {},
        h("div", { id: "lives-readout", class: "hud-stat" }, {}, `Lives: ${me ? `${me.lives}/${MAX_LIVES}` : "-"}`),
        h("div", { id: "match-title", class: "hud-title" }, {}, state?.phase === "ended" ? `${state.winner} wins` : "BOMBERMAN DOM"),
        h("div", { id: "fps-readout", class: "hud-stat" }, {}, `FPS: ${fps}`),
      ),
      h("div", { class: "arena-wrap" }, {}, h("div", { id: "map-game", class: "map-game" }, {}, "")),
      h(
        "div",
        { id: "result-banner", class: `result-banner ${result.kind}${result.visible ? " visible" : ""}` },
        {},
        h("div", { class: "result-box" }, {}, h("h2", { id: "result-title", class: "result-title" }, {}, result.title), h("p", { id: "result-text", class: "result-text" }, {}, result.text)),
      ),
    ),
    h(
      "aside",
      { class: "sidebar" },
      {},
      h(
        "div",
        { class: "side-section" },
        {},
        h("h2", {}, {}, "Players"),
        h("div", { id: "player-list", class: "player-list" }, {}, ...(state?.players || []).map(playerRow)),
        h("div", { class: "perf", id: "perf-readout" }, {}, `Render: ${fps}fps, DOM board uses requestAnimationFrame`),
      ),
      h("div", { id: "chat-log", class: "chat-log" }, {}, ...chatMessages.map(messageView)),
      h(
        "form",
        { class: "chat-row" },
        { submit: sendChat },
        h("input", { id: "chat-input", maxlength: "120", placeholder: "Chat...", autocomplete: "off" }, {}, ""),
        h("button", { type: "submit" }, {}, "Send"),
      ),
    ),
  );
}

function playerRow(player) {
  const status = player.alive ? `${player.lives} lives` : player.lives > 0 ? "respawning" : "out";
  return h(
    "div",
    { class: "player-row" },
    {},
    h("span", { class: "swatch", style: `background:${COLORS[player.id] || "#fff"}` }, {}, ""),
    h("span", {}, {}, `${player.nickname}${player.id === myPlayerId ? " (you)" : ""}`),
    h("span", {}, {}, status),
  );
}

function messageView(message) {
  return h("div", { class: `message ${message.className || "system"}` }, {}, `[${message.time || nowTime()}] ${message.sender}: ${message.text}`);
}

function getResultState(me) {
  if (!state || !me) return { visible: false, kind: "", title: "", text: "" };
  if (state.phase === "ended" && state.winnerId === myPlayerId) {
    return { visible: true, kind: "win", title: "YOU WIN", text: "Last player standing." };
  }
  if (state.phase === "ended") {
    return { visible: true, kind: "lose", title: "GAME OVER", text: `${state.winner || "Another player"} wins this round.` };
  }
  if (me.lives <= 0) {
    return { visible: true, kind: "lose", title: "GAME OVER", text: "You are out. The remaining players are still fighting." };
  }
  return { visible: false, kind: "", title: "", text: "" };
}

function renderShell() {
  if (!dirtyShell) return;
  dirtyShell = false;
  if (view === "login") renderElement(true, root, loginView());
  if (view === "lobby") renderElement(true, root, lobbyView());
  if (view === "game") {
    renderElement(true, root, gameView());
    boardBuilt = false;
    dirtyBoard = true;
  }
}

function buildBoard() {
  const map = document.getElementById("map-game");
  if (!map || boardBuilt) return;
  const cols = state?.width || DEFAULT_GRID_COLS;
  const rows = state?.height || DEFAULT_GRID_ROWS;
  const walls = new Set(state?.walls || []);
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
  boardBuilt = true;
}

function renderBoard() {
  if (!dirtyBoard || view !== "game" || !state) return;
  buildBoard();
  const map = document.getElementById("map-game");
  if (!map) return;
  dirtyBoard = false;

  const wallSet = new Set(state.walls || []);
  const obstacleSet = new Set(state.obstacles);
  const explosionSet = new Set((state.explosions || []).flatMap((explosion) => explosion.cells));
  const powerupsByPos = new Map((state.powerups || []).map((powerup) => [powerup.pos, powerup]));
  const bombsByPos = new Map((state.bombs || []).map((bomb) => [bomb.pos, bomb]));
  const playersByPos = new Map((state.players || []).filter((player) => player.connected && player.alive).map((player) => [player.pos, player]));

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

function updateGameUi() {
  if (view !== "game" || !state) return;
  const me = state.players?.find((player) => player.id === myPlayerId);
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
  if (fpsReadout) fpsReadout.textContent = `FPS: ${fps}`;
  if (perfReadout) perfReadout.textContent = `Render: ${fps}fps, DOM board uses requestAnimationFrame`;
  if (resultBanner) resultBanner.className = `result-banner ${result.kind}${result.visible ? " visible" : ""}`;
  if (resultTitle) resultTitle.textContent = result.title;
  if (resultText) resultText.textContent = result.text;

  if (playerList) {
    playerList.innerHTML = "";
    for (const player of state.players || []) {
      const row = document.createElement("div");
      row.className = "player-row";
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = COLORS[player.id] || "#fff";
      const name = document.createElement("span");
      name.textContent = `${player.nickname}${player.id === myPlayerId ? " (you)" : ""}`;
      const status = document.createElement("span");
      status.textContent = player.alive ? `${player.lives} lives` : player.lives > 0 ? "respawning" : "out";
      row.append(swatch, name, status);
      playerList.appendChild(row);
    }
  }
}

function updateFps(now) {
  frames += 1;
  if (now - lastFpsAt >= 1000) {
    fps = frames;
    frames = 0;
    lastFpsAt = now;
    if (view === "lobby") dirtyShell = true;
  }
}

function frame(now) {
  updateFps(now);
  renderShell();
  updateGameUi();
  renderBoard();
  requestAnimationFrame(frame);
}

document.addEventListener("keydown", (event) => {
  if (view !== "game" || state?.phase !== "playing" || document.activeElement?.id === "chat-input") return;
  if (KEYS[event.key]) {
    event.preventDefault();
    const now = performance.now();
    if (now - lastMoveSent >= 45) {
      lastMoveSent = now;
      send({ type: "move", direction: KEYS[event.key] });
    }
  }
  if (event.key === " ") {
    event.preventDefault();
    send({ type: "bomb" });
  }
});

connect();
requestAnimationFrame(frame);
