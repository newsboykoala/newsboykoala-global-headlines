import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8" };
export function staticHandler(root, basePath = "/") {
  const mount = basePath.replace(/\/$/, "") || "/";
  return async (request, response) => {
    const raw = new URL(request.url, "http://localhost").pathname;
    if (!raw.startsWith(mount)) { response.writeHead(404).end("Not found"); return; }
    let relative = raw.slice(mount.length).replace(/^\/+/, "");
    if (!relative || raw.endsWith("/")) relative = `${relative.replace(/\/$/, "")}${relative ? "/" : ""}index.html`;
    const file = join(root, normalize(relative));
    if (!file.startsWith(root)) { response.writeHead(403).end(); return; }
    try {
      const info = await stat(file);
      const target = info.isDirectory() ? join(file, "index.html") : file;
      response.writeHead(200, { "Content-Type": MIME[extname(target)] || "application/octet-stream", "Cache-Control": "no-store" });
      createReadStream(target).pipe(response);
    } catch { response.writeHead(404).end("Not found"); }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3000);
  createServer(staticHandler(join(process.cwd(), "site"))).listen(port, "0.0.0.0", () => console.log(`Static feed preview: http://0.0.0.0:${port}`));
}
