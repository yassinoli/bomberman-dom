# Project Schema

This file shows the organization of the Bomberman DOM project after splitting the backend into smaller modules.

## Full Project Tree

```text
bomberman-dom/
+-- README.md
+-- shema.md
+-- fw/
|   +-- create-element.mjs
|   +-- diffing.mjs
|   +-- helpers.mjs
|   +-- patching.mjs
|   +-- render-elemnt.mjs
|   +-- routing.mjs
|   +-- state-managment.mjs
|   +-- wf-doc.md
+-- backend/
|   +-- app.js
|   +-- package.json
|   +-- package-lock.json
|   +-- moving.js
|   +-- src.js
|   +-- src/
|       +-- config.js
|       +-- paths.js
|       +-- game/
|       |   +-- constants.js
|       |   +-- coordinates.js
|       |   +-- game-rooms.js
|       |   +-- level.js
|       +-- http/
|       |   +-- static-server.js
|       +-- network/
|           +-- send-json.js
|           +-- websocket-server.js
+-- bomberman-dom/
    +-- index.html
    +-- styles/
    |   +-- index.css
    +-- src/
        +-- main.js
        +-- components/
        |   +-- message-view.js
        |   +-- player-row.js
        +-- game/
        |   +-- build-board.js
        |   +-- frame.js
        |   +-- get-result-state.js
        |   +-- handle-keydown.js
        |   +-- join-game.js
        |   +-- render-board.js
        +-- network/
        |   +-- connect.js
        |   +-- send.js
        |   +-- send-chat.js
        +-- state/
        |   +-- state.js
        +-- ui/
        |   +-- update-fps.js
        |   +-- update-game-ui.js
        |   +-- update-lobby-ui.js
        +-- utils/
        |   +-- h.js
        |   +-- now-time.js
        +-- views/
            +-- game-view.js
            +-- lobby-view.js
            +-- login-view.js
            +-- render-shell.js
```

## Backend Module Responsibilities

```text
backend/app.js
  Creates the game manager, HTTP server, WebSocket server, and starts the app.

backend/src/config.js
  Stores server host, port, and MIME type configuration.

backend/src/paths.js
  Resolves the backend, project, frontend, and framework paths.

backend/src/http/static-server.js
  Serves frontend files, framework files, and the local /reset route.

backend/src/network/websocket-server.js
  Creates the WebSocket server and passes connections to the game manager.

backend/src/network/send-json.js
  Sends JSON safely over an open WebSocket.

backend/src/game/constants.js
  Stores game constants such as player limits, timers, map size, directions, and spawn points.

backend/src/game/coordinates.js
  Converts between x/y map coordinates and one-dimensional cell indexes.

backend/src/game/level.js
  Builds the fixed wall layout and random breakable block map.

backend/src/game/game-rooms.js
  Owns room state, player joins/disconnects, chat, movement, bombs, explosions, power-ups, lives, respawn, and winner detection.
```

## Runtime Flow

```text
Browser
  |
  | HTTP GET /
  v
backend/src/http/static-server.js
  |
  | serves files from bomberman-dom/ and fw/
  v
Frontend app loads
  |
  | WebSocket connection
  v
backend/src/network/websocket-server.js
  |
  | passes socket to
  v
backend/src/game/game-rooms.js
  |
  | validates messages and updates authoritative state
  v
Broadcasts state/chat back to players
  |
  v
Frontend renders lobby/game DOM
```

## Main WebSocket Flow

```text
join message
  -> GameRooms.joinRoom()
  -> player is added to a room
  -> lobby state is broadcast

chat message
  -> GameRooms.handleChat()
  -> sanitized chat is broadcast

move message
  -> GameRooms.handleMove()
  -> movement is validated
  -> power-up pickup is checked
  -> state is broadcast

bomb message
  -> GameRooms.placeBomb()
  -> bomb is scheduled
  -> GameRooms.explodeBomb()
  -> blocks, players, power-ups, and winner are resolved
  -> state is broadcast
```
