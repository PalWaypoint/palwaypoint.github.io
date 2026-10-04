import { DurableObject } from 'cloudflare:workers';

const CLIENT = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const STALE_MS = 120_000;
const MAX_CONNECTIONS = 4096;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/connect') return new Response('Not found', { status: 404 });
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
    if (!allowed.includes(request.headers.get('Origin'))) return new Response('Forbidden', { status: 403 });
    if (request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('WebSocket required', { status: 426 });
    }
    if (!CLIENT.test(url.searchParams.get('client') || '')) return new Response('Invalid session', { status: 400 });
    return env.PRESENCE.getByName('palwaypoint').fetch(request);
  }
};

// Presence is ephemeral. No progress, save data, IP addresses or visitor history is stored.
export class Presence extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  live(now = Date.now()) {
    return this.ctx.getWebSockets().filter(ws => {
      if (ws.readyState !== 1) return false;
      const session = ws.deserializeAttachment();
      const last = this.ctx.getWebSocketAutoResponseTimestamp(ws)?.getTime() ?? session?.opened;
      if (!session || !CLIENT.test(session.client) || !Number.isFinite(last) || now - last > STALE_MS) {
        try { ws.close(1000, 'Session expired'); } catch {}
        return false;
      }
      return true;
    });
  }

  broadcast() {
    const sockets = this.live();
    const count = new Set(sockets.map(ws => ws.deserializeAttachment().client)).size;
    const message = JSON.stringify({ type: 'presence', count });
    for (const ws of sockets) {
      try { ws.send(message); } catch { try { ws.close(1011, 'Disconnected'); } catch {} }
    }
    return sockets.length;
  }

  async fetch(request) {
    const client = new URL(request.url).searchParams.get('client');
    if (!CLIENT.test(client || '')) return new Response('Invalid session', { status: 400 });
    if (this.live().length >= MAX_CONNECTIONS) return new Response('Counter busy', { status: 429 });
    const pair = new WebSocketPair();
    const [browser, server] = Object.values(pair);
    server.serializeAttachment({ client, opened: Date.now() });
    this.ctx.acceptWebSocket(server);
    this.broadcast();
    if (await this.ctx.storage.getAlarm() === null) await this.ctx.storage.setAlarm(Date.now() + 60_000);
    return new Response(null, { status: 101, webSocket: browser });
  }

  webSocketMessage(ws) {
    // The only accepted client message is the automatic ping above.
    ws.close(1008, 'Unsupported message');
    this.broadcast();
  }

  webSocketClose() { this.broadcast(); }
  webSocketError(ws) {
    try { ws.close(1011, 'Disconnected'); } catch {}
    this.broadcast();
  }

  async alarm() {
    if (this.broadcast()) await this.ctx.storage.setAlarm(Date.now() + 60_000);
  }
}
