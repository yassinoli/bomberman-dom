import { GameRooms } from "./src/game/game-rooms.js";
import { createHttpServer, listen } from "./src/http/static-server.js";
import { attachWebSocketServer } from "./src/network/websocket-server.js";

const gameRooms = new GameRooms();
const server = createHttpServer(gameRooms);

attachWebSocketServer(server, gameRooms);
listen(server);
