const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const HTTP_PORT = Number(process.env.PORT || 3000);
const FRONTEND_DIR = path.resolve(__dirname, "../bomberman-dom");
const FRAMEWORK_DIR = path.resolve(__dirname, "../fw");
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const GRID_COLS = 19;
const GRID_ROWS = 11;
const GRID_SIZE = GRID_COLS * GRID_ROWS;
const MAX_LIVES = 3;
const BOMB_DELAY_MS = 2000;
const LOBBY_WAIT_MS = 20000;
const COUNTDOWN_MS = 10000;
const POWERUP_CHANCE = 0.35;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const walls = [
  20, 22, 24, 26, 28, 30, 32, 34, 36, 58, 60, 62, 64, 66, 68, 70, 72, 74, 96, 98, 100, 102, 104, 106, 108, 110, 112, 134, 136, 138, 140, 142, 144, 146, 148, 150, 172, 174, 176, 178, 180, 182,
  184, 186, 188,
];
const safeCells = [0, 1, 19, 17, 18, 37, 171, 189, 190, 191, 207, 208];
const spawnCells = [0, 18, 190, 208];
const powerupTypes = ["bombs", "flames", "speed"];

const clients = new Map();
let nextClientId = 1;
let nextBombId = 1;
let nextPowerupId = 1;
let waitTimer = null;
let countdownTimer = null;
let countdownEndsAt = null;

const room = {
  phase: "join",
  players: [],
  obstacles: [],
  powerups: [],
  bombs: [],
  explosions: [],
  winner: null,
};

function resetRoom() {
  resetLobbyTimers();
  for (const bomb of room.bombs) {
    if (bomb.timer) clearTimeout(bomb.timer);
  }
  room.phase = "join";
  room.players = [];
  room.obstacles = [];
  room.powerups = [];
  room.bombs = [];
  room.explosions = [];
  room.winner = null;
  nextBombId = 1;
  nextPowerupId = 1;
  for (const client of clients.values()) {
    client.playerId = null;
  }
}

function requestUrl(req) {
  return new URL(req.url, `http://${req.headers.host || `localhost:${HTTP_PORT}`}`);
}

function sendHttp(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function safeJoin(root, requestPath) {
  const decodedPath = decodeURIComponent(requestPath);
  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(root, decodedPath === "/" || decodedPath === "" ? "index.html" : normalizedPath);
  return filePath.startsWith(root) ? filePath : null;
}

function createServer() {
  return http.createServer((req, res) => {
    const parsed = requestUrl(req);
    if (parsed.pathname === "/reset") {
      resetRoom();
      sendHttp(res, 200, "Bomberman room reset.");
      sendState();
      return;
    }

    const root = parsed.pathname.startsWith("/fw/") ? FRAMEWORK_DIR : FRONTEND_DIR;
    const requestPath = parsed.pathname.startsWith("/fw/") ? parsed.pathname.slice(3) : parsed.pathname;
    const filePath = safeJoin(root, requestPath);
    if (!filePath) {
      sendHttp(res, 403, "Forbidden");
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        sendHttp(res, 404, "Not found");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
      res.end(data);
    });
  });
}

function encodeFrame(data) {
  const payload = Buffer.from(data);
  let header;

  if (payload.length < 126) {
    header = Buffer.alloc(2);
    header[1] = payload.length;
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }

  header[0] = 0x81;
  return Buffer.concat([header, payload]);
}

function decodeFrames(client) {
  const messages = [];
  let offset = 0;

  while (offset + 2 <= client.buffer.length) {
    const firstByte = client.buffer[offset];
    const secondByte = client.buffer[offset + 1];
    const opcode = firstByte & 0x0f;
    const masked = (secondByte & 0x80) === 0x80;
    let payloadLength = secondByte & 0x7f;
    let headerLength = 2;

    if (payloadLength === 126) {
      if (offset + 4 > client.buffer.length) break;
      payloadLength = client.buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (payloadLength === 127) {
      if (offset + 10 > client.buffer.length) break;
      payloadLength = Number(client.buffer.readBigUInt64BE(offset + 2));
      headerLength = 10;
    }

    const maskLength = masked ? 4 : 0;
    const frameLength = headerLength + maskLength + payloadLength;
    if (offset + frameLength > client.buffer.length) break;

    if (opcode === 0x8) messages.push({ type: "close" });
    if (opcode === 0x9) messages.push({ type: "ping" });
    if (opcode === 0x1) {
      const maskStart = offset + headerLength;
      const payloadStart = maskStart + maskLength;
      const payload = Buffer.alloc(payloadLength);
      for (let i = 0; i < payloadLength; i++) {
        const byte = client.buffer[payloadStart + i];
        payload[i] = masked ? byte ^ client.buffer[maskStart + (i % 4)] : byte;
      }
      messages.push({ type: "text", data: payload.toString("utf8") });
    }

    offset += frameLength;
  }

  client.buffer = client.buffer.subarray(offset);
  return messages;
}

function send(client, message) {
  if (!client.socket.destroyed) {
    client.socket.write(encodeFrame(JSON.stringify(message)));
  }
}

function broadcast(message) {
  for (const client of clients.values()) {
    send(client, message);
  }
}

function publicState() {
  return {
    phase: room.phase,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    countdownEndsAt,
    players: room.players,
    obstacles: room.obstacles,
    powerups: room.powerups,
    bombs: room.bombs.map((bomb) => ({ id: bomb.id, ownerId: bomb.ownerId, pos: bomb.pos, range: bomb.range, explodeAt: bomb.explodeAt })),
    explosions: room.explosions,
    winner: room.winner,
  };
}

function sendState() {
  broadcast({ type: "state", state: publicState() });
}

function broadcastChat(sender, text, className = "system") {
  broadcast({
    type: "chat",
    sender,
    text,
    className,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });
}

function joinedPlayers() {
  return room.players.filter((player) => player.connected);
}

function firstFreePlayerId() {
  const used = new Set(joinedPlayers().map((player) => player.id));
  for (let id = 0; id < MAX_PLAYERS; id++) {
    if (!used.has(id)) return id;
  }
  return null;
}

function playerByClient(client) {
  return room.players.find((player) => player.clientId === client.id);
}

function sanitizeNickname(value) {
  const nickname = String(value || "").trim().replace(/\s+/g, " ").slice(0, 16);
  return nickname || "Pilot";
}

function resetLobbyTimers() {
  if (waitTimer) clearTimeout(waitTimer);
  if (countdownTimer) clearTimeout(countdownTimer);
  waitTimer = null;
  countdownTimer = null;
  countdownEndsAt = null;
}

function maybeScheduleStart() {
  const count = joinedPlayers().length;
  if (room.phase === "playing") return;

  if (count < MIN_PLAYERS) {
    room.phase = "lobby";
    resetLobbyTimers();
    sendState();
    return;
  }

  if (room.phase === "countdown") return;

  if (count === MAX_PLAYERS) {
    startCountdown();
    return;
  }

  if (!waitTimer) {
    room.phase = "lobby";
    waitTimer = setTimeout(startCountdown, LOBBY_WAIT_MS);
    broadcastChat("Server", "At least 2 players joined. Match starts soon if the room is not full.");
    sendState();
  }
}

function startCountdown() {
  const count = joinedPlayers().length;
  if (count < MIN_PLAYERS || room.phase === "playing") {
    maybeScheduleStart();
    return;
  }

  if (waitTimer) clearTimeout(waitTimer);
  waitTimer = null;
  room.phase = "countdown";
  countdownEndsAt = Date.now() + COUNTDOWN_MS;
  broadcastChat("Server", "Get ready. Match starts in 10 seconds.");
  sendState();

  if (countdownTimer) clearTimeout(countdownTimer);
  countdownTimer = setTimeout(startGame, COUNTDOWN_MS);
}

function createObstacles() {
  const blocked = new Set([...walls, ...safeCells, ...spawnCells]);
  const obstacles = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    if (blocked.has(i)) continue;
    if (Math.random() < 0.58) obstacles.push(i);
  }
  return obstacles;
}

function startGame() {
  const active = joinedPlayers();
  if (active.length < MIN_PLAYERS) {
    resetLobbyTimers();
    room.phase = "lobby";
    sendState();
    return;
  }

  room.phase = "playing";
  room.winner = null;
  room.obstacles = createObstacles();
  room.powerups = [];
  room.bombs = [];
  room.explosions = [];
  nextBombId = 1;
  nextPowerupId = 1;
  countdownEndsAt = null;

  active.forEach((player) => {
    player.pos = spawnCells[player.id];
    player.lives = MAX_LIVES;
    player.alive = true;
    player.maxBombs = 1;
    player.bombsActive = 0;
    player.range = 2;
    player.speed = 1;
    player.lastMoveAt = 0;
  });

  broadcastChat("Server", "Match started. Last pilot standing wins.");
  sendState();
}

function canMoveTo(index) {
  if (index < 0 || index >= GRID_SIZE) return false;
  if (walls.includes(index)) return false;
  if (room.obstacles.includes(index)) return false;
  if (room.bombs.some((bomb) => bomb.pos === index)) return false;
  if (room.players.some((player) => player.connected && player.alive && player.pos === index)) return false;
  return true;
}

function moveTarget(pos, direction) {
  if (direction === "left" && pos % GRID_COLS !== 0) return pos - 1;
  if (direction === "right" && pos % GRID_COLS !== GRID_COLS - 1) return pos + 1;
  if (direction === "up" && pos >= GRID_COLS) return pos - GRID_COLS;
  if (direction === "down" && pos < GRID_SIZE - GRID_COLS) return pos + GRID_COLS;
  return pos;
}

function collectPowerup(player) {
  const powerup = room.powerups.find((item) => item.pos === player.pos);
  if (!powerup) return;

  room.powerups = room.powerups.filter((item) => item.id !== powerup.id);
  if (powerup.kind === "bombs") player.maxBombs += 1;
  if (powerup.kind === "flames") player.range += 1;
  if (powerup.kind === "speed") player.speed += 1;
  broadcastChat("Server", `${player.nickname} collected ${powerup.kind}.`);
}

function handleMove(client, direction) {
  const player = playerByClient(client);
  if (!player || room.phase !== "playing" || !player.alive) return;

  const now = Date.now();
  const cooldown = Math.max(70, 170 - (player.speed - 1) * 25);
  if (now - player.lastMoveAt < cooldown) return;

  const target = moveTarget(player.pos, direction);
  if (target === player.pos || !canMoveTo(target)) return;

  player.pos = target;
  player.lastMoveAt = now;
  collectPowerup(player);
  sendState();
}

function blastCells(centerPos, radius) {
  const cells = new Set([centerPos]);
  const directions = [
    { delta: -1, blocked: (pos) => pos % GRID_COLS === 0 },
    { delta: 1, blocked: (pos) => pos % GRID_COLS === GRID_COLS - 1 },
    { delta: -GRID_COLS, blocked: (pos) => pos < GRID_COLS },
    { delta: GRID_COLS, blocked: (pos) => pos >= GRID_SIZE - GRID_COLS },
  ];

  for (const direction of directions) {
    let pos = centerPos;
    for (let step = 0; step < radius; step++) {
      if (direction.blocked(pos)) break;
      const next = pos + direction.delta;
      if (next < 0 || next >= GRID_SIZE || walls.includes(next)) break;
      cells.add(next);
      pos = next;
      if (room.obstacles.includes(next)) break;
    }
  }

  return [...cells];
}

function maybeDropPowerup(pos) {
  if (Math.random() > POWERUP_CHANCE) return;
  const kind = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
  room.powerups.push({ id: nextPowerupId++, pos, kind });
}

function checkWinner() {
  const alive = joinedPlayers().filter((player) => player.alive && player.lives > 0);
  if (room.phase === "playing" && alive.length <= 1) {
    room.phase = "ended";
    room.winner = alive[0]?.nickname || "Nobody";
    broadcastChat("Server", `${room.winner} wins the match!`, "death");
    sendState();
  }
}

function explodeBomb(bombId) {
  const bomb = room.bombs.find((item) => item.id === bombId);
  if (!bomb) return;

  const owner = room.players.find((player) => player.id === bomb.ownerId);
  if (owner) owner.bombsActive = Math.max(0, owner.bombsActive - 1);

  const cells = blastCells(bomb.pos, bomb.range);
  room.bombs = room.bombs.filter((item) => item.id !== bomb.id);
  room.explosions.push({ id: bomb.id, cells, endsAt: Date.now() + 450 });

  for (const cell of cells) {
    if (room.obstacles.includes(cell)) {
      room.obstacles = room.obstacles.filter((pos) => pos !== cell);
      maybeDropPowerup(cell);
    }

    for (const player of room.players) {
      if (!player.connected || !player.alive || player.pos !== cell) continue;
      player.lives -= 1;
      player.alive = false;
      broadcastChat("Server", `${player.nickname} was hit by a bomb.`, "death");
      if (player.lives > 0) {
        setTimeout(() => respawnPlayer(player.id), 2500);
      }
    }
  }

  setTimeout(() => {
    room.explosions = room.explosions.filter((item) => item.id !== bomb.id);
    sendState();
  }, 450);

  checkWinner();
  sendState();
}

function respawnPlayer(playerId) {
  const player = room.players.find((item) => item.id === playerId);
  if (!player || room.phase !== "playing" || player.lives <= 0) return;
  const spawn = spawnCells[player.id];
  if (!canMoveTo(spawn)) {
    setTimeout(() => respawnPlayer(playerId), 800);
    return;
  }
  player.pos = spawn;
  player.alive = true;
  broadcastChat("Server", `${player.nickname} respawned.`);
  sendState();
}

function handleBomb(client) {
  const player = playerByClient(client);
  if (!player || room.phase !== "playing" || !player.alive) return;
  if (player.bombsActive >= player.maxBombs) return;
  if (room.bombs.some((bomb) => bomb.pos === player.pos)) return;

  const bomb = {
    id: nextBombId++,
    ownerId: player.id,
    pos: player.pos,
    range: player.range,
    explodeAt: Date.now() + BOMB_DELAY_MS,
    timer: null,
  };

  player.bombsActive += 1;
  room.bombs.push(bomb);
  bomb.timer = setTimeout(() => explodeBomb(bomb.id), BOMB_DELAY_MS);
  sendState();
}

function handleJoin(client, message) {
  if (room.phase === "playing" || room.phase === "countdown") {
    send(client, { type: "joinRejected", reason: "A match is already starting or running." });
    return;
  }

  const playerId = firstFreePlayerId();
  if (playerId === null) {
    send(client, { type: "joinRejected", reason: "Arena is full." });
    return;
  }

  const player = {
    id: playerId,
    clientId: client.id,
    nickname: sanitizeNickname(message.nickname),
    connected: true,
    pos: spawnCells[playerId],
    lives: MAX_LIVES,
    alive: true,
    maxBombs: 1,
    bombsActive: 0,
    range: 2,
    speed: 1,
    lastMoveAt: 0,
  };

  client.playerId = playerId;
  room.phase = "lobby";
  room.players = room.players.filter((item) => item.connected);
  room.players.push(player);

  send(client, { type: "joined", playerId });
  broadcastChat("Server", `${player.nickname} joined the lobby.`);
  maybeScheduleStart();
  sendState();
}

function handleChat(client, message) {
  const player = playerByClient(client);
  const text = String(message.text || "").trim().slice(0, 120);
  if (!player || !text) return;
  broadcastChat(player.nickname, text, "chat");
}

function handleMessage(client, rawData) {
  let message;
  try {
    message = JSON.parse(rawData);
  } catch {
    send(client, { type: "error", message: "Invalid JSON." });
    return;
  }

  if (message.type === "join") handleJoin(client, message);
  if (message.type === "chat") handleChat(client, message);
  if (message.type === "move") handleMove(client, message.direction);
  if (message.type === "bomb") handleBomb(client);
}

function acceptWebSocket(req, socket) {
  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\nMissing websocket key.");
    socket.destroy();
    return;
  }

  const acceptKey = crypto.createHash("sha1").update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");
  socket.write(["HTTP/1.1 101 Switching Protocols", "Upgrade: websocket", "Connection: Upgrade", `Sec-WebSocket-Accept: ${acceptKey}`, "\r\n"].join("\r\n"));

  const client = {
    id: nextClientId++,
    playerId: null,
    socket,
    buffer: Buffer.alloc(0),
  };
  clients.set(socket, client);
  send(client, { type: "state", state: publicState() });

  socket.on("data", (chunk) => {
    client.buffer = Buffer.concat([client.buffer, chunk]);
    for (const frame of decodeFrames(client)) {
      if (frame.type === "text") handleMessage(client, frame.data);
      if (frame.type === "close") socket.end();
      if (frame.type === "ping") socket.write(Buffer.from([0x8a, 0x00]));
    }
  });

  socket.on("close", () => {
    clients.delete(socket);
    const player = playerByClient(client);
    if (player) {
      player.connected = false;
      player.alive = false;
      broadcastChat("Server", `${player.nickname} disconnected.`);
      if (room.phase === "lobby" || room.phase === "countdown") {
        room.players = room.players.filter((item) => item.connected);
        maybeScheduleStart();
      } else {
        checkWinner();
        sendState();
      }
    }
  });

  socket.on("error", () => {
    clients.delete(socket);
  });
}

const server = createServer();
server.on("upgrade", acceptWebSocket);
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${HTTP_PORT} is already in use. Stop the old server or run with another port, for example:`);
    console.error(`$env:PORT=3001; node backend/main.js`);
    process.exit(1);
  }
  console.error(error);
  process.exit(1);
});

server.listen(HTTP_PORT, () => {
  console.log(`Bomberman server running at http://localhost:${HTTP_PORT}/`);
});
