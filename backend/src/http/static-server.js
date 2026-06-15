import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { HOSTNAME, MIME_TYPES, PORT } from "../config.js";
import { frameworkRoot, frontendRoot } from "../paths.js";

export function createHttpServer(gameRooms) {
  return createServer(async (req, res) => {
    try {
      if (req.url === "/reset") {
        gameRooms.resetRooms();
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
}

export function listen(server) {
  server.listen(PORT, HOSTNAME, () => {
    console.log(`Bomberman DOM running at http://${HOSTNAME}:${PORT}/`);
  });
}

async function serveStatic(req, res) {
  const url = new URL(req.url || "/", `http://${HOSTNAME}:${PORT}`);
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
