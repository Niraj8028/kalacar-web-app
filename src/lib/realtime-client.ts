"use client";
import { useEffect, useRef } from "react";
import type { default as PusherClient } from "pusher-js";
import { SHOP_CHANNEL, customerChannel } from "@/lib/realtime-channels";
import type { Topic } from "@/lib/realtime-channels";

// The shop's one live connection. It's open only while someone is here: a hidden tab or 30 minutes
// without activity closes it and stops all checks. Coming back reconnects and reloads once.
const IDLE_AFTER_MS = 30 * 60 * 1000;
const BACKSTOP_CONNECTED_MS = 5 * 60 * 1000;
const BACKSTOP_OFFLINE_MS = 60 * 1000;

let pusher: PusherClient | null = null;
let starting: Promise<PusherClient | null> | null = null;
let lastActive = Date.now();
let idle = false;
const wakeListeners = new Set<() => void>();
const awake = () => document.visibilityState === "visible" && !idle;
// Returning to a tab also reconnects, so both are treated as one wake-up.
let lastWake = 0;
function wake() {
  if (Date.now() - lastWake < 3000) return;
  lastWake = Date.now();
  wakeListeners.forEach(listener => listener());
}

function connection() {
  starting ??= (async () => {
    const response = await fetch("/api/realtime/config", { cache: "no-store" });
    const config = await response.json() as { key: string | null; cluster: string | null };
    if (!config.key || !config.cluster) return null;
    const { default: Pusher } = await import("pusher-js");
    pusher = new Pusher(config.key, { cluster: config.cluster, channelAuthorization: { endpoint: "/api/realtime/auth/customer", transport: "ajax" } });
    // Signals sent while the connection was down are gone, so every reconnect reloads.
    let first = true;
    pusher.connection.bind("connected", () => { if (!first) wake(); first = false; });
    if (!awake()) pusher.disconnect();
    return pusher;
  })().catch(() => null);
  return starting;
}

function watchPresence() {
  const update = () => {
    if (awake()) { pusher?.connect(); wake(); }
    else pusher?.disconnect();
  };
  const onActivity = () => {
    lastActive = Date.now();
    if (idle) { idle = false; update(); }
  };
  document.addEventListener("visibilitychange", update);
  ["pointerdown", "keydown", "scroll", "touchstart"].forEach(name => window.addEventListener(name, onActivity, { passive: true }));
  window.setInterval(() => {
    if (!idle && Date.now() - lastActive > IDLE_AFTER_MS) { idle = true; pusher?.disconnect(); }
  }, 60000);
}
let watching = false;

/**
 * Runs `load` when `topic` is signalled, on returning to the tab or waking from idle, and on a slow
 * backstop while someone is here. A hidden or idle tab makes no requests at all.
 */
export function useLiveLoad(topics: Topic | Topic[], load: () => unknown, customerId?: string | null) {
  const latest = useRef(load);
  useEffect(() => { latest.current = load; });
  const needsCustomer = customerId !== undefined;
  const topicNames = Array.isArray(topics) ? topics.join() : topics;
  useEffect(() => {
    if (needsCustomer && !customerId) return;
    if (!watching) { watching = true; watchPresence(); }
    let active = true;
    let lastRun = Date.now();
    const run = () => { if (active) { lastRun = Date.now(); void latest.current(); } };
    wakeListeners.add(run);
    const channelName = customerId ? customerChannel(customerId) : SHOP_CHANNEL;
    const names = topicNames.split(",");
    void connection().then(live => {
      if (active) names.forEach(name => live?.subscribe(channelName).bind(name, run));
    });
    const timer = window.setInterval(() => {
      const wait = pusher?.connection.state === "connected" ? BACKSTOP_CONNECTED_MS : BACKSTOP_OFFLINE_MS;
      if (awake() && Date.now() - lastRun >= wait) run();
    }, BACKSTOP_OFFLINE_MS);
    return () => {
      active = false;
      wakeListeners.delete(run);
      window.clearInterval(timer);
      names.forEach(name => pusher?.channel(channelName)?.unbind(name, run));
      // The shop channel is shared; a customer's own channel closes with their page or sign-out.
      if (customerId) pusher?.unsubscribe(channelName);
    };
  }, [topicNames, customerId, needsCustomer]);
}
