"use client";

import { useSyncExternalStore } from "react";

/** Nothing ever changes the value after hydration, so nothing to subscribe to. */
const noopSubscribe = () => () => {};

/**
 * Reads a value that only exists in the browser — the resolved theme, the local
 * time zone, whether the platform is a Mac — without a hydration mismatch and
 * without setting state from an effect.
 *
 * React renders `serverFallback` on the server and during hydration, then
 * re-renders once with the real value. `compute` must return a primitive: React
 * compares snapshots by identity, so returning a fresh object each call would
 * loop forever.
 */
export function useClientValue<T extends string | number | boolean | null>(
  compute: () => T,
  serverFallback: T,
): T {
  return useSyncExternalStore(noopSubscribe, compute, () => serverFallback);
}
