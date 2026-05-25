// import html package
import { createServer } from "http";
import { Server } from "socket.io";
import { WebSocket } from "http";

// create http server
const httpServer = createServer();
const PORT = 3000;

//upgrade from http to websocket
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});


httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});