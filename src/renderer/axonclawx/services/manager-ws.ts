import { getToken } from './request';

type ManagerWSStatus = 'connecting' | 'open' | 'closed';
type ManagerWSMessageHandler = (msg: any) => void;
type ManagerWSStatusHandler = (status: ManagerWSStatus) => void;

function isElectronRenderer(): boolean {
  try {
    return typeof window !== 'undefined' && !!(window as unknown as { electron?: unknown }).electron;
  } catch {
    return false;
  }
}

class ManagerWSBus {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private backoffMs = 800;
  private subscribers = new Set<ManagerWSMessageHandler>();
  private statusSubscribers = new Set<ManagerWSStatusHandler>();
  private refCount = 0;

  subscribe(onMessage: ManagerWSMessageHandler, onStatus?: ManagerWSStatusHandler) {
    this.refCount += 1;
    this.subscribers.add(onMessage);
    if (onStatus) this.statusSubscribers.add(onStatus);
    this.ensureConnected();

    // If the WS is already open, immediately notify the new subscriber
    if (onStatus && this.ws && this.ws.readyState === WebSocket.OPEN) {
      queueMicrotask(() => onStatus('open'));
    }

    return () => {
      this.subscribers.delete(onMessage);
      if (onStatus) this.statusSubscribers.delete(onStatus);
      this.refCount = Math.max(0, this.refCount - 1);
      if (this.refCount === 0) {
        this.stop();
      }
    };
  }

  private notifyStatus(status: ManagerWSStatus) {
    for (const fn of this.statusSubscribers) fn(status);
  }

  private ensureConnected() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.connect();
  }

  private connect() {
    if (this.refCount === 0) return;

    // Electron 桌面版没有 /api/v1/ws 管理总线端点（location.host 通常是 Vite 5173），
    // 直接连接会得到 HTTP 200 并触发 WebSocket 握手错误。
    // 桌面版改为静默禁用该旁路总线，避免持续错误刷屏与误判。
    if (isElectronRenderer()) {
      this.notifyStatus('closed');
      return;
    }

    this.notifyStatus('connecting');

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = getToken();
    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
    const ws = new WebSocket(`${proto}//${location.host}/api/v1/ws${qs}`);
    this.ws = ws;

    ws.onopen = () => {
      this.backoffMs = 800;
      ws.send(JSON.stringify({ action: 'subscribe', channels: ['gw_event', 'alert', 'activity'] }));
      this.notifyStatus('open');
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        for (const fn of this.subscribers) fn(msg);
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      this.notifyStatus('closed');
      if (this.refCount > 0) this.scheduleReconnect();
    };

    ws.onerror = () => {
      // rely on onclose
    };
  }

  private scheduleReconnect() {
    if (this.refCount === 0) return;
    if (this.reconnectTimer != null) return;
    const delay = this.backoffMs;
    this.backoffMs = Math.min(Math.floor(this.backoffMs * 1.7), 5000);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private stop() {
    if (this.reconnectTimer != null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.close();
    }
    this.notifyStatus('closed');
  }
}

const bus = new ManagerWSBus();

export function subscribeManagerWS(onMessage: ManagerWSMessageHandler, onStatus?: ManagerWSStatusHandler) {
  return bus.subscribe(onMessage, onStatus);
}

export type { ManagerWSStatus };
