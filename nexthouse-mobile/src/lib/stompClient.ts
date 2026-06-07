/**
 * STOMP singleton for real-time chat and notifications.
 *
 * Correct @stomp/stompjs pattern: register all subscriptions via addSub().
 * On every connect (including reconnects), onConnect re-subscribes all of them.
 * This guarantees subscriptions survive network drops.
 */
import { Client } from '@stomp/stompjs';
import { BASE_URL, tokens } from './apiClient';

const WS_URL = BASE_URL.replace(/^http/, 'ws') + '/ws-native';

type SubEntry = { destination: string; callback: (body: string) => void };

// Registered subscriptions (survive reconnects)
const registry = new Map<string, SubEntry>();
// Active StompSubscription objects (reset on each connect)
const activeSubs = new Map<string, ReturnType<Client['subscribe']>>();

let client: Client | null = null;

function buildClient(): Client {
  const c = new Client({
    brokerURL: WS_URL,
    reconnectDelay: 5000,
    heartbeatIncoming: 15000,
    heartbeatOutgoing: 15000,
  });

  c.beforeConnect = async () => {
    const token = await tokens.getAccess();
    c.connectHeaders = { Authorization: token ? `Bearer ${token}` : '' };
  };

  // Called on every successful connect AND every reconnect
  c.onConnect = () => {
    activeSubs.clear(); // old sub objects are dead after reconnect
    registry.forEach((entry, id) => {
      const sub = c.subscribe(entry.destination, frame => entry.callback(frame.body));
      activeSubs.set(id, sub);
    });
  };

  c.onStompError = frame => {
    console.warn('[STOMP] broker error:', frame.headers?.message);
  };

  c.onWebSocketError = e => {
    console.warn('[STOMP] ws error:', e);
  };

  return c;
}

function getClient(): Client {
  if (!client) {
    client = buildClient();
    client.activate();
  }
  return client;
}

/**
 * Register a subscription. If already connected, subscribes immediately.
 * On every future reconnect, it is automatically re-subscribed.
 * @param id  Unique key (use component-local UUID or stable string)
 */
export function addSub(id: string, destination: string, callback: (body: string) => void) {
  registry.set(id, { destination, callback });
  const c = getClient();
  if (c.connected) {
    const sub = c.subscribe(destination, frame => callback(frame.body));
    activeSubs.set(id, sub);
  }
  // If not yet connected, onConnect will pick it up from registry
}

/** Remove a subscription and unsubscribe from the broker. */
export function removeSub(id: string) {
  registry.delete(id);
  activeSubs.get(id)?.unsubscribe();
  activeSubs.delete(id);
}

/** Disconnect and destroy the client (call on logout). */
export function disconnectStomp() {
  client?.deactivate();
  client = null;
  registry.clear();
  activeSubs.clear();
}