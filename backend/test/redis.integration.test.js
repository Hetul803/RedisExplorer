import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "redis";
import { createApp } from "../src/app.js";

// Explicit opt-in. Only test-owned, uniquely prefixed keys are removed.
test(
  "real Redis: CRUD, expiration, pagination, command errors, and cache reset",
  { skip: !process.env.TEST_REDIS_URL },
  async () => {
    const redis = createClient({
      url: process.env.TEST_REDIS_URL,
      socket: { reconnectStrategy: false },
    });
    redis.on("error", () => {});
    await redis.connect();
    const app = createApp({ redis });
    const server = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const prefix = `qa:${Date.now()}:`;
    const owned = [];
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function request(path, method = "GET", body) {
      const res = await fetch(base + path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: res.status, data: await res.json() };
    }
    try {
      for (const [type, value] of [
        ["string", ""],
        ["list", ["one", "two"]],
        ["set", ["one", "two"]],
        ["hash", { name: "Ada" }],
      ]) {
        const key = prefix + type;
        owned.push(key);
        assert.equal(
          (await request("/keys", "POST", { key, type, value })).status,
          201,
        );
        assert.equal(
          (await request("/keys", "POST", { key, type, value })).status,
          409,
        );
        assert.deepEqual((await request(`/keys/${key}`)).data.value, value);
        assert.equal(
          (await request(`/keys/${key}`, "PUT", { type, value })).status,
          200,
        );
      }
      assert.equal(
        (await request("/commands", "POST", { command: `GET ${prefix}list` }))
          .status,
        400,
      );
      const ttlKey = prefix + "ttl";
      owned.push(ttlKey);
      assert.equal(
        (
          await request("/commands", "POST", {
            command: `SET ${ttlKey} value EX 1`,
          })
        ).status,
        200,
      );
      assert.ok(
        (await request("/commands", "POST", { command: `TTL ${ttlKey}` })).data
          .result >= 0,
      );
      await new Promise((resolve) => setTimeout(resolve, 1100));
      assert.equal((await request(`/keys/${ttlKey}`)).status, 404);
      assert.equal(
        (await request(`/keys/${ttlKey}`, "PUT", { value: "stale" })).status,
        404,
      );
      for (let i = 0; i < 125; i++) {
        const key = prefix + i;
        owned.push(key);
        await redis.set(key, "page");
      }
      let cursor = "0";
      const found = new Set();
      let pages = 0;
      do {
        const result = await request(`/keys?cursor=${cursor}&limit=10`);
        assert.equal(result.status, 200);
        result.data.keys.forEach((k) => found.add(k.key));
        cursor = result.data.cursor;
        pages++;
      } while (cursor !== "0");
      assert.ok(pages > 1);
      assert.ok(found.has(prefix + "124"));
      assert.equal((await request("/keys?cursor=bad")).status, 400);
      const operations = (await request("/metrics")).data.operations;
      assert.ok(!operations.some((o) => o.action === "LIST KEYS"));
      assert.equal(
        (await request(`/keys/${prefix}string`, "DELETE")).status,
        200,
      );
      assert.equal((await request(`/keys/${prefix}string`)).status, 404);
      // Cache checks use the dedicated test database's demo fixture.
      await request("/cache/demo", "DELETE");
      assert.equal(
        (await request("/cache/demo", "POST", { ttl: 1 })).data.cached,
        false,
      );
      assert.equal(
        (await request("/cache/demo", "POST", { ttl: 1 })).data.cached,
        true,
      );
      await new Promise((resolve) => setTimeout(resolve, 1100));
      assert.equal(
        (await request("/cache/demo", "POST", { ttl: 1 })).data.cached,
        false,
      );
      await request("/cache/demo", "DELETE");
      console.log(
        "Verified all four types, conflicts, stale edits, expiry, multiple scan pages, wrong-type errors, cache expiry/reset.",
      );
    } finally {
      for (const key of owned) await redis.del(key);
      await new Promise((resolve) => server.close(resolve));
      await redis.quit();
    }
  },
);
