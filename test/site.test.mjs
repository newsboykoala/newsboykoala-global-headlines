import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { join } from "node:path";
import { staticHandler } from "../scripts/serve.mjs";

test("서브경로 /repo/와 /repo/embed/에서 정적 진입점과 상대 자산이 제공된다", async () => {
  const server = createServer(staticHandler(join(process.cwd(), "site"), "/repo"));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const root = await fetch(`http://127.0.0.1:${port}/repo/`);
    const embed = await fetch(`http://127.0.0.1:${port}/repo/embed/`);
    const asset = await fetch(`http://127.0.0.1:${port}/repo/assets/feed.js`);
    assert.equal(root.status, 200);
    assert.equal(embed.status, 200);
    assert.equal(asset.status, 200);
    assert.match(await root.text(), /assets\/feed\.js/);
    assert.match(await embed.text(), /\.\.\/assets\/feed\.js/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
