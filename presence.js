import { presenceEndpoint } from './presence-config.js';

const CLIENT_KEY = 'palwaypoint-presence-browser-v1';
const CLIENT = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function startPresence(env, endpoint) {
  const { document } = env;
  if (!endpoint || !env.WebSocket || !env.crypto?.randomUUID) return () => {};
  let url;
  try { url = new URL(endpoint); } catch { return () => {}; }
  if (url.protocol !== 'wss:' && !(url.protocol === 'ws:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return () => {};
  let client;
  try {
    client = env.localStorage.getItem(CLIENT_KEY);
    if (!CLIENT.test(client || '')) {
      client = env.crypto.randomUUID();
      env.localStorage.setItem(CLIENT_KEY, client);
      // A concurrent tab may have initialized the same key.
      client = env.localStorage.getItem(CLIENT_KEY) || client;
    }
  } catch { client = env.crypto.randomUUID(); }
  url.searchParams.set('client', client);

  const badge = document.createElement('span');
  badge.className = 'presence-badge';
  badge.hidden = true;
  badge.title = 'Approximate number of browsers connected across PalWaypoint. Multiple tabs in one browser count once.';
  badge.setAttribute('aria-live', 'off');
  const dot = document.createElement('span');
  dot.className = 'presence-dot';
  dot.setAttribute('aria-hidden', 'true');
  const text = document.createElement('span');
  badge.append(dot, text);
  const map = document.querySelector('.map-viewport');
  (map || document.querySelector('.wiki-footer') || document.body).append(badge);

  let socket, heartbeat, retry, expiry, stable, attempts = 0, stopped = false, suspended = false;
  const hide = () => {
    badge.hidden = true;
    document.body.classList.remove('presence-online');
  };
  const clearTimers = () => {
    env.clearInterval(heartbeat);
    env.clearTimeout(expiry);
    env.clearTimeout(stable);
  };
  const schedule = () => {
    if (stopped || suspended || attempts >= 8 || env.navigator.onLine === false || retry) return;
    const delay = Math.min(60_000, 2000 * 2 ** attempts++) + Math.floor(Math.random() * 1000);
    retry = env.setTimeout(() => { retry = null; connect(); }, delay);
  };
  const disconnect = () => {
    const previous = socket;
    socket = null;
    clearTimers();
    hide();
    try { previous?.close(1000, 'Leaving'); } catch {}
  };
  const connect = () => {
    if (stopped || suspended || env.navigator.onLine === false || socket) return;
    let current;
    try { current = new env.WebSocket(url.href); } catch { schedule(); return; }
    socket = current;
    const expectReply = () => {
      env.clearTimeout(expiry);
      expiry = env.setTimeout(() => { if (socket === current) { disconnect(); schedule(); } }, 75_000);
    };
    expectReply();
    current.addEventListener('open', () => {
      if (socket !== current) return;
      stable = env.setTimeout(() => { if (socket === current) attempts = 0; }, 60_000);
      heartbeat = env.setInterval(() => {
        if (socket === current && current.readyState === 1) {
          try { current.send('ping'); } catch { disconnect(); schedule(); }
        }
      }, 30_000);
    });
    current.addEventListener('message', event => {
      if (socket !== current) return;
      if (event.data === 'pong') { expectReply(); return; }
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type !== 'presence' || !Number.isInteger(message.count) || message.count < 1 || message.count > 4096) return;
      expectReply();
      env.clearTimeout(retry);
      retry = null;
      text.textContent = `${message.count.toLocaleString()} online`;
      badge.hidden = false;
      document.body.classList.add('presence-online');
    });
    current.addEventListener('close', () => { if (socket === current) { socket = null; clearTimers(); hide(); schedule(); } });
    current.addEventListener('error', () => { if (socket === current) { disconnect(); schedule(); } });
  };
  const leave = () => { suspended = true; env.clearTimeout(retry); retry = null; disconnect(); };
  const resume = () => { suspended = false; attempts = 0; env.clearTimeout(retry); retry = null; connect(); };
  const offline = () => { env.clearTimeout(retry); retry = null; disconnect(); };
  env.addEventListener('pagehide', leave);
  env.addEventListener('pageshow', resume);
  env.addEventListener('online', resume);
  env.addEventListener('offline', offline);
  connect();
  return () => {
    stopped = true;
    leave();
    badge.remove();
    env.removeEventListener('pagehide', leave);
    env.removeEventListener('pageshow', resume);
    env.removeEventListener('online', resume);
    env.removeEventListener('offline', offline);
  };
}

if (typeof window !== 'undefined') startPresence(window, presenceEndpoint);
