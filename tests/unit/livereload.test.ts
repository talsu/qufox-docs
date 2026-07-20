import { describe, expect, it } from "vitest";
import { LiveReloadHub } from "../../src/server/livereload.js";

function fakeClient() {
  const messages: Array<{ event: string; data: string }> = [];
  return {
    messages,
    writeSSE: async (message: { event: string; data: string }) => {
      messages.push(message);
    },
  };
}

describe("LiveReloadHub", () => {
  it("broadcasts change events to every registered client", () => {
    const hub = new LiveReloadHub();
    const a = fakeClient();
    const b = fakeClient();
    hub.register(a);
    hub.register(b);

    hub.broadcast("change", { revision: 3, pages: ["/guides/setup"], global: false });

    for (const client of [a, b]) {
      expect(client.messages).toHaveLength(1);
      expect(client.messages[0]?.event).toBe("change");
      expect(JSON.parse(client.messages[0]?.data ?? "{}")).toEqual({
        revision: 3,
        pages: ["/guides/setup"],
        global: false,
      });
    }
    hub.close();
  });

  it("stops sending after a client unregisters", () => {
    const hub = new LiveReloadHub();
    const client = fakeClient();
    const unregister = hub.register(client);
    unregister();

    hub.broadcast("reload", { revision: 1, pages: [], global: true });
    expect(client.messages).toHaveLength(0);
    expect(hub.clientCount).toBe(0);
    hub.close();
  });
});
