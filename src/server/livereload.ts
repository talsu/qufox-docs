import type { Context } from "hono";
import { streamSSE } from "hono/streaming";

export interface LiveReloadEvent {
  revision: number;
  /** Decoded site paths whose content changed, e.g. "/guides/setup". */
  pages: string[];
  /** True when navigation/list pages are stale everywhere (add/remove/meta change). */
  global: boolean;
}

interface SseWriter {
  writeSSE(message: { event: string; data: string; id?: string }): Promise<void>;
}

const HEARTBEAT_MS = 30_000;

/** Fan-out hub for the `/__qufox/events` SSE endpoint. */
export class LiveReloadHub {
  readonly #clients = new Set<SseWriter>();
  readonly #heartbeat: NodeJS.Timeout;

  constructor() {
    this.#heartbeat = setInterval(() => {
      this.#send("ping", "{}");
    }, HEARTBEAT_MS);
    this.#heartbeat.unref();
  }

  get clientCount(): number {
    return this.#clients.size;
  }

  register(writer: SseWriter): () => void {
    this.#clients.add(writer);
    return () => this.#clients.delete(writer);
  }

  broadcast(event: "change" | "reload", payload: LiveReloadEvent): void {
    this.#send(event, JSON.stringify(payload));
  }

  close(): void {
    clearInterval(this.#heartbeat);
    this.#clients.clear();
  }

  #send(event: string, data: string): void {
    for (const client of this.#clients) {
      client.writeSSE({ event, data }).catch(() => {
        this.#clients.delete(client);
      });
    }
  }

  /** Hono handler keeping the SSE stream open until the client disconnects. */
  handler = (c: Context): Response => {
    c.header("Cache-Control", "no-cache");
    c.header("X-Accel-Buffering", "no");
    return streamSSE(c, async (stream) => {
      const unregister = this.register(stream);
      await new Promise<void>((resolve) => {
        stream.onAbort(() => {
          unregister();
          resolve();
        });
      });
    });
  };
}
