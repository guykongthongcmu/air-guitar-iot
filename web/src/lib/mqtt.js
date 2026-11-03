import mqtt from 'mqtt';

export function parseStrum(text) {
  let o = null;
  try {
    o = JSON.parse(text);
  } catch {
    o = { dir: String(text).trim().toLowerCase() };
  }
  if (!o || typeof o !== 'object') return null;
  const dir = String(o.dir || '').toLowerCase();
  if (dir !== 'down' && dir !== 'up') return null;
  let speed = Number(o.speed);
  if (!isFinite(speed) || speed <= 0) speed = 40;
  return { dir, speed, t: o.t };
}

export function parseButton(text) {
  const t = String(text).trim().toLowerCase();
  return t === 'song' || t === 'reset' ? t : null;
}

export class MqttLink {

  constructor(handlers) {
    this.h = handlers;
    this.client = null;
    this.connected = false;
    this.prefix = 'airguitar';
    this.lastChord = undefined;
  }

  connect(url, prefix) {
    this.disconnect();
    this.prefix = prefix || 'airguitar';
    const clientId = 'airguitar-web-' + Math.random().toString(16).slice(2, 8);
    this.h.onStatus('connecting', clientId);
    let c;
    try {
      c = mqtt.connect(url, { clientId, reconnectPeriod: 3000, connectTimeout: 8000, clean: true });
    } catch (e) {
      this.h.onStatus('error', e.message);
      return;
    }
    this.client = c;
    c.on('connect', () => {
      this.connected = true;
      c.subscribe([this.prefix + '/strum', this.prefix + '/button', this.prefix + '/status', this.prefix + '/dist']);
      this.lastChord = undefined;
      this.h.onStatus('connected', clientId);
    });
    c.on('reconnect', () => this.h.onStatus('connecting', clientId));
    c.on('close', () => {
      this.connected = false;
      this.h.onStatus('disconnected', '');
    });
    c.on('error', e => this.h.onStatus('error', e.message));
    c.on('message', (topic, payload) => this.handleMessage(topic, payload.toString(), performance.now()));
  }

  handleMessage(topic, text, recv) {
    if (topic === this.prefix + '/strum') {
      const s = parseStrum(text);
      if (s) this.h.onStrum(s, recv);
      else if (this.h.onBad) this.h.onBad(topic, text);
    } else if (topic === this.prefix + '/status') {
      if (this.h.onBoard) this.h.onBoard(text.trim() === 'online');
    } else if (topic === this.prefix + '/dist') {
      if (this.h.onDist) this.h.onDist(text.trim());
    } else if (topic === this.prefix + '/button') {
      const b = parseButton(text);
      if (b) this.h.onButton(b);
      else if (this.h.onBad) this.h.onBad(topic, text);
    }
  }

  disconnect() {
    if (this.client) {
      this.client.removeAllListeners();
      this.client.end(true);
    }
    this.client = null;
    this.connected = false;
  }

  publishChord(chord) {
    const c = chord || 'none';
    if (c === this.lastChord) return;
    this.lastChord = c;
    if (this.connected) this.client.publish(this.prefix + '/chord', c);
  }

  publishSession(obj) {
    if (this.connected) this.client.publish(this.prefix + '/session', JSON.stringify(obj));
  }
}
