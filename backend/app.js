import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { Level, createRandomMap } from "./src.js";

const hostname = "localhost";
const port = 8000;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const JOIN_WINDOW_MS = 20000;
const READY_WINDOW_MS = 10000;
const BOMB_TIME_MS = 3000;
const EXPLOSION_TIME_MS = 650;
const RESPAWN_TIME_MS = 1200;
const POWER_UPS = ["bombs", "flames", "speed"];
const START_POSITIONS = [
  { x: 1, y: 1 },
  { x: 15, y: 1 },
  { x: 1, y: 9 },
  { x: 15, y: 9 },
];
const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const backendRoot = resolve(fileURLToPath(new URL(".", import.meta.url)));
const projectRoot = resolve(backendRoot, "..");
const frontendRoot = resolve(projectRoot, "bomberman-dom");
const frameworkRoot = resolve(projectRoot, "fw");

let rooms = [createRoom(0)];

// Handles HTTP requests for static files and local room resets.
const server = createServer(async (req, res) => {
  try {
    if (req.url === "/reset") {
      resetRooms();
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Local rooms reset. Return to the game tab.");
      return;
    }

    await serveStatic(req, res);
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server error");
  }
});

const wss = new WebSocketServer({ server });

// Handles a connected websocket client and routes incoming game messages.
wss.on("connection", (ws) => {
  // Parses and dispatches one websocket message from the client.
  ws.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.type === "join") joinRoom(ws, message.nickname);
    if (message.type === "chat") handleChat(ws, message.text);
    if (message.type === "move") handleMove(ws, message.direction);
    if (message.type === "bomb") placeBomb(ws);
  });

  // Cleans up room state when the websocket closes.
  ws.on("close", () => disconnectPlayer(ws));
});

// Starts the HTTP and websocket server.
server.listen(port, hostname, () => {
  console.log(`Bomberman DOM running at http://${hostname}:${port}/`);
});

/**
 * Serves frontend and framework files from the allowed project directories.
 */
async function serveStatic(req, res) {
  const url = new URL(req.url || "/", `http://${hostname}:${port}`);
  const pathname = decodeURIComponent(url.pathname);
  const base = pathname.startsWith("/fw/") ? frameworkRoot : frontendRoot;
  const relativePath = pathname.startsWith("/fw/") ? pathname.slice(4) : pathname === "/" ? "index.html" : pathname.slice(1);
  const resolvedPath = resolve(base, normalize(relativePath));

  if (!resolvedPath.startsWith(base)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(resolvedPath);
    if (!fileStat.isFile()) throw new Error("Not a file");
    res.writeHead(200, { "Content-Type": MIME_TYPES[extname(resolvedPath)] || "application/octet-stream" });
    createReadStream(resolvedPath).pipe(res);
  } catch {
    const indexPath = join(frontendRoot, "index.html");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    createReadStream(indexPath).pipe(res);
  }
}

/**
 * Creates a fresh game room with an initialized map and empty game state.
 */
function createRoom(id) {
  const level = new Level(createRandomMap());
  return {
    id,
    phase: "lobby",
    players: [],
    map: level.rows,
    width: level.width,
    height: level.height,
    bombs: [],
    powerups: [],
    explosions: [],
    joinTimer: null,
    readyTimer: null,
    countdownEndsAt: null,
    winner: null,
    winnerId: null,
  };
}

/**
 * Closes active player connections and restores the room list to one lobby.
 */
function resetRooms() {
  for (const room of rooms) {
    clearTimeout(room.joinTimer);
    clearTimeout(room.readyTimer);
    for (const player of room.players) player.conn.close();
  }
  rooms = [createRoom(0)];
}

/**
 * Finds an available lobby room or creates a new one.
 */
function openRoom() {
  let room = rooms.find((candidate) => candidate.phase === "lobby" && candidate.players.length < MAX_PLAYERS);
  if (!room) {
    room = createRoom(rooms.length);
    rooms.push(room);
  }
  return room;
}

/**
 * Validates a nickname, adds the websocket as a player, and updates lobby state.
 */
function joinRoom(ws, nickname) {
  if (ws.player) return;
  const name = String(nickname || "").trim().slice(0, 16);
  if (name.length < 2) {
    send(ws, { type: "joinRejected", reason: "Nickname must be at least 2 characters." });
    return;
  }

  const room = openRoom();
  const slot = room.players.length;
  const player = {
    id: slot,
    conn: ws,
    nickname: name,
    pos: toIndex(room, START_POSITIONS[slot]),
    spawn: toIndex(room, START_POSITIONS[slot]),
    lives: 3,
    alive: false,
    connected: true,
    bombsAvailable: 1,
    flameLength: 1,
    speed: 1,
    movingAt: 0,
  };

  ws.player = { roomId: room.id, playerId: player.id };
  room.players.push(player);
  send(ws, { type: "joined", playerId: player.id });
  broadcastChat(room, "Server", `${name} joined the room.`, "system");

  if (room.players.length >= MIN_PLAYERS && !room.joinTimer && !room.readyTimer) {
    room.countdownEndsAt = Date.now() + JOIN_WINDOW_MS;
    // Advances the lobby to the ready countdown after the join window expires.
    room.joinTimer = setTimeout(() => startReadyCountdown(room), JOIN_WINDOW_MS);
  }
  if (room.players.length === MAX_PLAYERS) startReadyCountdown(room);

  broadcastState(room);
}

/**
 * Moves a lobby room into the ready countdown phase.
 */
function startReadyCountdown(room) {
  if (room.phase !== "lobby" || room.readyTimer) return;
  clearTimeout(room.joinTimer);
  room.joinTimer = null;
  room.phase = "countdown";
  room.countdownEndsAt = Date.now() + READY_WINDOW_MS;
  broadcastState(room);
  // Starts the game when the ready countdown expires.
  room.readyTimer = setTimeout(() => startGame(room), READY_WINDOW_MS);
}

/**
 * Starts the match and places each player on a free spawn tile.
 */
function startGame(room) {
  clearTimeout(room.readyTimer);
  room.readyTimer = null;
  room.phase = "playing";
  room.countdownEndsAt = null;
  for (const player of room.players) {
    player.alive = true;
    player.pos = findFreeTile(room, player.spawn, player);
  }
  broadcastChat(room, "Server", "Battle started.", "system");
  broadcastState(room);
}

/**
 * Sanitizes and broadcasts a chat message from a connected player.
 */
function handleChat(ws, text) {
  const room = roomFor(ws);
  if (!room) return;
  const cleanText = String(text || "").trim().slice(0, 120);
  if (!cleanText) return;
  const player = playerFor(room, ws);
  if (!player) return;
  broadcastChat(room, player.nickname, cleanText, "chat");
}

/**
 * Applies a movement request for a live player if the target tile is valid.
 */
function handleMove(ws, direction) {
  const room = roomFor(ws);
  const player = room && playerFor(room, ws);
  if (!room || !player || room.phase !== "playing" || !player.alive) return;
  const delta = DIRECTIONS[direction];
  if (!delta) return;

  const now = Date.now();
  const moveDelay = Math.max(55, 145 - player.speed * 25);
  if (now - player.movingAt < moveDelay) return;
  player.movingAt = now;

  const current = fromIndex(room, player.pos);
  const next = { x: current.x + delta.x, y: current.y + delta.y };
  const nextIndex = toIndex(room, next);
  if (!canEnter(room, next.x, next.y, player)) return;
  player.pos = nextIndex;
  collectPowerup(room, player);
  broadcastState(room);
}

/**
 * Checks whether a player can enter a map tile.
 */
function canEnter(room, x, y, movingPlayer = null) {
  if (x < 0 || y < 0 || x >= room.width || y >= room.height) return false;
  if (room.map[y][x] !== "empty") return false;
  const index = toIndex(room, { x, y });
  if (room.bombs.some((bomb) => bomb.pos === index)) return false;
  if (room.players.some((player) => player !== movingPlayer && player.connected && player.alive && player.pos === index)) return false;
  return true;
}

/**
 * Places a bomb for the websocket's player when they have one available.
 */
function placeBomb(ws) {
  const room = roomFor(ws);
  const player = room && playerFor(room, ws);
  if (!room || !player || room.phase !== "playing" || !player.alive) return;
  if (player.bombsAvailable <= 0 || room.bombs.some((bomb) => bomb.pos === player.pos)) return;

  player.bombsAvailable -= 1;
  const bomb = {
    id: `${player.id}-${Date.now()}`,
    ownerId: player.id,
    pos: player.pos,
    flameLength: player.flameLength,
    explodesAt: Date.now() + BOMB_TIME_MS,
  };
  room.bombs.push(bomb);
  broadcastState(room);

  // Detonates the bomb after its fuse expires.
  setTimeout(() => explodeBomb(room, bomb), BOMB_TIME_MS);
}

/**
 * Resolves bomb detonation, damage, block destruction, and explosion cleanup.
 */
function explodeBomb(room, bomb) {
  if (room.phase !== "playing") return;
  const bombIndex = room.bombs.findIndex((candidate) => candidate.id === bomb.id);
  if (bombIndex === -1) return;
  room.bombs.splice(bombIndex, 1);

  const owner = room.players.find((player) => player.id === bomb.ownerId);
  if (owner) owner.bombsAvailable += 1;

  const cells = affectedCells(room, bomb);
  const explosion = { id: bomb.id, cells };
  room.explosions.push(explosion);

  for (const index of cells) {
    const { x, y } = fromIndex(room, index);
    if (room.map[y][x] === "break") {
      room.map[y][x] = "empty";
      maybeSpawnPowerup(room, index);
    }
  }

  for (const player of room.players) {
    if (player.alive && cells.includes(player.pos)) damagePlayer(room, player);
  }

  checkWinner(room);
  broadcastState(room);
  // Removes temporary explosion cells after the animation window.
  setTimeout(() => {
    room.explosions = room.explosions.filter((item) => item.id !== explosion.id);
    broadcastState(room);
  }, EXPLOSION_TIME_MS);
}

/**
 * Calculates all map cells reached by a bomb explosion.
 */
function affectedCells(room, bomb) {
  const origin = fromIndex(room, bomb.pos);
  const cells = [bomb.pos];
  for (const delta of Object.values(DIRECTIONS)) {
    for (let step = 1; step <= bomb.flameLength; step += 1) {
      const x = origin.x + delta.x * step;
      const y = origin.y + delta.y * step;
      if (x < 0 || y < 0 || x >= room.width || y >= room.height) break;
      const cell = room.map[y][x];
      if (cell === "wall") break;
      cells.push(toIndex(room, { x, y }));
      if (cell === "break") break;
    }
  }
  return cells;
}

/**
 * Removes a life from a player and schedules respawn when lives remain.
 */
function damagePlayer(room, player) {
  player.lives -= 1;
  player.alive = false;
  broadcastChat(room, "Server", player.lives > 0 ? `${player.nickname} lost a life.` : `${player.nickname} is out.`, "death");
  if (player.lives <= 0) return;

  // Respawns the player after the respawn delay if the match is still active.
  setTimeout(() => {
    if (room.phase !== "playing" || player.lives <= 0) return;
    player.pos = findFreeTile(room, player.spawn, player);
    player.alive = true;
    broadcastState(room);
  }, RESPAWN_TIME_MS);
}

/**
 * Ends the match when only one connected player still has lives.
 */
function checkWinner(room) {
  const alivePlayers = room.players.filter((player) => player.connected && player.lives > 0);
  if (room.phase === "playing" && alivePlayers.length === 1) {
    room.phase = "ended";
    room.winner = alivePlayers[0].nickname;
    room.winnerId = alivePlayers[0].id;
    broadcastChat(room, "Server", `${room.winner} wins.`, "death");
  }
}

/**
 * Finds the nearest enterable tile to a preferred spawn position.
 */
function findFreeTile(room, preferredPos, player) {
  const preferred = fromIndex(room, preferredPos);
  if (canEnter(room, preferred.x, preferred.y, player)) return preferredPos;

  const queue = [preferred];
  const visited = new Set([preferredPos]);

  while (queue.length > 0) {
    const current = queue.shift();
    for (const delta of Object.values(DIRECTIONS)) {
      const next = { x: current.x + delta.x, y: current.y + delta.y };
      if (next.x < 0 || next.y < 0 || next.x >= room.width || next.y >= room.height) continue;
      const nextIndex = toIndex(room, next);
      if (visited.has(nextIndex)) continue;
      if (canEnter(room, next.x, next.y, player)) return nextIndex;
      if (room.map[next.y][next.x] === "empty") {
        visited.add(nextIndex);
        queue.push(next);
      }
    }
  }

  return preferredPos;
}

/**
 * Randomly spawns a power-up on a cleared block tile.
 */
function maybeSpawnPowerup(room, pos) {
  if (Math.random() > 0.35 || room.powerups.some((powerup) => powerup.pos === pos)) return;
  const kind = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
  room.powerups.push({ pos, kind });
}

/**
 * Gives a player the power-up on their current tile and removes it from the room.
 */
function collectPowerup(room, player) {
  const index = room.powerups.findIndex((powerup) => powerup.pos === player.pos);
  if (index === -1) return;
  const [powerup] = room.powerups.splice(index, 1);
  if (powerup.kind === "bombs") player.bombsAvailable = Math.min(5, player.bombsAvailable + 1);
  if (powerup.kind === "flames") player.flameLength = Math.min(5, player.flameLength + 1);
  if (powerup.kind === "speed") player.speed = Math.min(4, player.speed + 1);
  broadcastChat(room, "Server", `${player.nickname} picked up ${powerup.kind}.`, "system");
}

/**
 * Marks a websocket's player as disconnected and updates room membership.
 */
function disconnectPlayer(ws) {
  const room = roomFor(ws);
  const player = room && playerFor(room, ws);
  if (!room || !player) return;
  player.connected = false;
  player.alive = false;
  broadcastChat(room, "Server", `${player.nickname} disconnected.`, "death");
  if (room.phase === "lobby" || room.phase === "countdown") {
    room.players = room.players.filter((candidate) => candidate.conn !== ws);
    room.players.forEach((candidate, index) => {
      candidate.id = index;
      candidate.spawn = toIndex(room, START_POSITIONS[index]);
      candidate.pos = candidate.spawn;
      candidate.conn.player = { roomId: room.id, playerId: candidate.id };
      send(candidate.conn, { type: "joined", playerId: candidate.id });
    });
    if (room.players.length < MIN_PLAYERS) {
      clearTimeout(room.joinTimer);
      clearTimeout(room.readyTimer);
      room.joinTimer = null;
      room.readyTimer = null;
      room.phase = "lobby";
      room.countdownEndsAt = null;
    }
  }
  checkWinner(room);
  broadcastState(room);
}

/**
 * Sends a chat-style message to every player in the room.
 */
function broadcastChat(room, sender, text, className) {
  const message = { type: "chat", sender, text, className, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
  for (const player of room.players) send(player.conn, message);
}

/**
 * Sends the public game state to every player in the room.
 */
function broadcastState(room) {
  const payload = { type: "state", state: publicState(room) };
  for (const player of room.players) send(player.conn, payload);
}

/**
 * Builds the client-safe state payload for a room.
 */
function publicState(room) {
  return {
    phase: room.phase,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    countdownEndsAt: room.countdownEndsAt,
    width: room.width,
    height: room.height,
    walls: cellsOf(room, "wall"),
    obstacles: cellsOf(room, "break"),
    bombs: room.bombs.map((bomb) => ({ pos: bomb.pos, explodesAt: bomb.explodesAt })),
    powerups: room.powerups,
    explosions: room.explosions,
    winner: room.winner,
    winnerId: room.winnerId ?? null,
    players: room.players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      pos: player.pos,
      lives: player.lives,
      alive: player.alive,
      connected: player.connected,
      bombs: player.bombsAvailable,
      flames: player.flameLength,
      speed: player.speed,
    })),
  };
}

/**
 * Lists all map cell indexes matching a tile type.
 */
function cellsOf(room, type) {
  const cells = [];
  for (let y = 0; y < room.height; y += 1) {
    for (let x = 0; x < room.width; x += 1) {
      if (room.map[y][x] === type) cells.push(toIndex(room, { x, y }));
    }
  }
  return cells;
}

/**
 * Finds the room associated with a websocket.
 */
function roomFor(ws) {
  if (!ws.player) return null;
  return rooms.find((room) => room.id === ws.player.roomId) || null;
}

/**
 * Finds the player associated with a websocket inside a room.
 */
function playerFor(room, ws) {
  return room.players.find((player) => player.conn === ws) || null;
}

/**
 * Sends a JSON message when the websocket connection is open.
 */
function send(ws, message) {
  if (ws.readyState === 1) ws.send(JSON.stringify(message));
}

/**
 * Converts x/y coordinates into a one-dimensional map index.
 */
function toIndex(room, pos) {
  return pos.y * room.width + pos.x;
}

/**
 * Converts a one-dimensional map index into x/y coordinates.
 */
function fromIndex(room, pos) {
  return { x: pos % room.width, y: Math.floor(pos / room.width) };
}
