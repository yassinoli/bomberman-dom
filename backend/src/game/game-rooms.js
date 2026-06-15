import {
  BOMB_TIME_MS,
  DIRECTIONS,
  EXPLOSION_TIME_MS,
  JOIN_WINDOW_MS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  POWER_UPS,
  READY_WINDOW_MS,
  RESPAWN_TIME_MS,
  START_POSITIONS,
} from "./constants.js";
import { fromIndex, toIndex } from "./coordinates.js";
import { Level, createRandomMap } from "./level.js";
import { sendJson } from "../network/send-json.js";

export class GameRooms {
  constructor() {
    this.rooms = [this.createRoom(0)];
  }

  attachClient(ws) {
    ws.on("message", (raw) => this.handleMessage(ws, raw));
    ws.on("close", () => this.disconnectPlayer(ws));
  }

  resetRooms() {
    for (const room of this.rooms) {
      clearTimeout(room.joinTimer);
      clearTimeout(room.readyTimer);
      for (const player of room.players) player.conn.close();
    }
    this.rooms = [this.createRoom(0)];
  }

  handleMessage(ws, raw) {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.type === "join") this.joinRoom(ws, message.nickname);
    if (message.type === "chat") this.handleChat(ws, message.text);
    if (message.type === "move") this.handleMove(ws, message.direction);
    if (message.type === "bomb") this.placeBomb(ws);
  }

  createRoom(id) {
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

  openRoom() {
    let room = this.rooms.find((candidate) => candidate.phase === "lobby" && candidate.players.length < MAX_PLAYERS);
    if (!room) {
      room = this.createRoom(this.rooms.length);
      this.rooms.push(room);
    }
    return room;
  }

  joinRoom(ws, nickname) {
    if (ws.player) return;
    const name = String(nickname || "")
      .trim()
      .slice(0, 16);
    if (name.length < 2) {
      sendJson(ws, { type: "joinRejected", reason: "Nickname must be at least 2 characters." });
      return;
    }

    const room = this.openRoom();
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
    sendJson(ws, { type: "joined", playerId: player.id });
    this.broadcastChat(room, "Server", `${name} joined the room.`, "system");

    if (room.players.length >= MIN_PLAYERS && !room.joinTimer && !room.readyTimer) {
      room.countdownEndsAt = Date.now() + JOIN_WINDOW_MS;
      room.joinTimer = setTimeout(() => this.startReadyCountdown(room), JOIN_WINDOW_MS);
    }
    if (room.players.length === MAX_PLAYERS) this.startReadyCountdown(room);

    this.broadcastState(room);
  }

  startReadyCountdown(room) {
    if (room.phase !== "lobby" || room.readyTimer) return;
    clearTimeout(room.joinTimer);
    room.joinTimer = null;
    room.phase = "countdown";
    room.countdownEndsAt = Date.now() + READY_WINDOW_MS;
    this.broadcastState(room);
    room.readyTimer = setTimeout(() => this.startGame(room), READY_WINDOW_MS);
  }

  startGame(room) {
    clearTimeout(room.readyTimer);
    room.readyTimer = null;
    room.phase = "playing";
    room.countdownEndsAt = null;
    for (const player of room.players) {
      player.alive = true;
      player.pos = this.findFreeTile(room, player.spawn, player);
    }
    this.broadcastChat(room, "Server", "Battle started.", "system");
    this.broadcastState(room);
  }

  handleChat(ws, text) {
    const room = this.roomFor(ws);
    if (!room) return;
    const cleanText = String(text || "")
      .trim()
      .slice(0, 120);
    if (!cleanText) return;
    const player = this.playerFor(room, ws);
    if (!player) return;
    this.broadcastChat(room, player.nickname, cleanText, "chat");
  }

  handleMove(ws, direction) {
    const room = this.roomFor(ws);
    const player = room && this.playerFor(room, ws);
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
    if (!this.canEnter(room, next.x, next.y, player)) return;
    player.pos = nextIndex;
    this.collectPowerup(room, player);
    this.broadcastState(room);
  }

  canEnter(room, x, y, movingPlayer = null) {
    if (x < 0 || y < 0 || x >= room.width || y >= room.height) return false;
    if (room.map[y][x] !== "empty") return false;
    const index = toIndex(room, { x, y });
    if (room.bombs.some((bomb) => bomb.pos === index)) return false;
    if (room.players.some((player) => player !== movingPlayer && player.connected && player.alive && player.pos === index)) return false;
    return true;
  }

  placeBomb(ws) {
    const room = this.roomFor(ws);
    const player = room && this.playerFor(room, ws);
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
    this.broadcastState(room);
    setTimeout(() => this.explodeBomb(room, bomb), BOMB_TIME_MS);
  }

  explodeBomb(room, bomb) {
    if (room.phase !== "playing") return;
    const bombIndex = room.bombs.findIndex((candidate) => candidate.id === bomb.id);
    if (bombIndex === -1) return;
    room.bombs.splice(bombIndex, 1);

    const owner = room.players.find((player) => player.id === bomb.ownerId);
    if (owner) owner.bombsAvailable += 1;

    const cells = this.affectedCells(room, bomb);
    const explosion = { id: bomb.id, cells };
    room.explosions.push(explosion);

    for (const index of cells) {
      const { x, y } = fromIndex(room, index);
      if (room.map[y][x] === "break") {
        room.map[y][x] = "empty";
        this.maybeSpawnPowerup(room, index);
      }
    }

    for (const player of room.players) {
      if (player.alive && cells.includes(player.pos)) this.damagePlayer(room, player);
    }

    this.checkWinner(room);
    this.broadcastState(room);
    setTimeout(() => {
      room.explosions = room.explosions.filter((item) => item.id !== explosion.id);
      this.broadcastState(room);
    }, EXPLOSION_TIME_MS);
  }

  affectedCells(room, bomb) {
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

  damagePlayer(room, player) {
    player.lives -= 1;
    player.alive = false;
    this.broadcastChat(room, "Server", player.lives > 0 ? `${player.nickname} lost a life.` : `${player.nickname} is out.`, "death");
    if (player.lives <= 0) return;

    setTimeout(() => {
      if (room.phase !== "playing" || player.lives <= 0) return;
      player.pos = this.findFreeTile(room, player.spawn, player);
      player.alive = true;
      this.broadcastState(room);
    }, RESPAWN_TIME_MS);
  }

  checkWinner(room) {
    const alivePlayers = room.players.filter((player) => player.connected && player.lives > 0);
    if (room.phase === "playing" && alivePlayers.length === 1) {
      room.phase = "ended";
      room.winner = alivePlayers[0].nickname;
      room.winnerId = alivePlayers[0].id;
      this.broadcastChat(room, "Server", `${room.winner} wins.`, "death");
    }
  }

  findFreeTile(room, preferredPos, player) {
    const preferred = fromIndex(room, preferredPos);
    if (this.canEnter(room, preferred.x, preferred.y, player)) return preferredPos;

    const queue = [preferred];
    const visited = new Set([preferredPos]);

    while (queue.length > 0) {
      const current = queue.shift();
      for (const delta of Object.values(DIRECTIONS)) {
        const next = { x: current.x + delta.x, y: current.y + delta.y };
        if (next.x < 0 || next.y < 0 || next.x >= room.width || next.y >= room.height) continue;
        const nextIndex = toIndex(room, next);
        if (visited.has(nextIndex)) continue;
        if (this.canEnter(room, next.x, next.y, player)) return nextIndex;
        if (room.map[next.y][next.x] === "empty") {
          visited.add(nextIndex);
          queue.push(next);
        }
      }
    }

    return preferredPos;
  }

  maybeSpawnPowerup(room, pos) {
    if (Math.random() > 0.35 || room.powerups.some((powerup) => powerup.pos === pos)) return;
    const kind = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
    room.powerups.push({ pos, kind });
  }

  collectPowerup(room, player) {
    const index = room.powerups.findIndex((powerup) => powerup.pos === player.pos);
    if (index === -1) return;
    const [powerup] = room.powerups.splice(index, 1);
    if (powerup.kind === "bombs") player.bombsAvailable = Math.min(5, player.bombsAvailable + 1);
    if (powerup.kind === "flames") player.flameLength = Math.min(5, player.flameLength + 1);
    if (powerup.kind === "speed") player.speed = Math.min(4, player.speed + 1);
    this.broadcastChat(room, "Server", `${player.nickname} picked up ${powerup.kind}.`, "system");
  }

  disconnectPlayer(ws) {
    const room = this.roomFor(ws);
    const player = room && this.playerFor(room, ws);
    if (!room || !player) return;
    player.connected = false;
    player.alive = false;
    this.broadcastChat(room, "Server", `${player.nickname} disconnected.`, "death");
    if (room.phase === "lobby" || room.phase === "countdown") {
      room.players = room.players.filter((candidate) => candidate.conn !== ws);
      room.players.forEach((candidate, index) => {
        candidate.id = index;
        candidate.spawn = toIndex(room, START_POSITIONS[index]);
        candidate.pos = candidate.spawn;
        candidate.conn.player = { roomId: room.id, playerId: candidate.id };
        sendJson(candidate.conn, { type: "joined", playerId: candidate.id });
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
    this.checkWinner(room);
    this.broadcastState(room);
  }

  broadcastChat(room, sender, text, className) {
    const message = { type: "chat", sender, text, className, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    for (const player of room.players) sendJson(player.conn, message);
  }

  broadcastState(room) {
    const payload = { type: "state", state: this.publicState(room) };
    for (const player of room.players) sendJson(player.conn, payload);
  }

  publicState(room) {
    return {
      phase: room.phase,
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
      countdownEndsAt: room.countdownEndsAt,
      width: room.width,
      height: room.height,
      walls: this.cellsOf(room, "wall"),
      obstacles: this.cellsOf(room, "break"),
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

  cellsOf(room, type) {
    const cells = [];
    for (let y = 0; y < room.height; y += 1) {
      for (let x = 0; x < room.width; x += 1) {
        if (room.map[y][x] === type) cells.push(toIndex(room, { x, y }));
      }
    }
    return cells;
  }

  roomFor(ws) {
    if (!ws.player) return null;
    return this.rooms.find((room) => room.id === ws.player.roomId) || null;
  }

  playerFor(room, ws) {
    return room.players.find((player) => player.conn === ws) || null;
  }
}
