"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Every ad zone reserves its height from first paint whether or not AdSense is
 * configured (design doc §6). Without that, the unit dropping in later shifts
 * the page and tanks CLS — which is the one Core Web Vital ad-supported tool
 * sites reliably fail.
 */
export function AdSlot({
  slot,
  format = "auto",
  width,
  height,
  label = "Advertisement",
  className,
}: {
  /** AdSense ad-unit id. Rendering is skipped until both this and the client id exist. */
  slot?: string;
  format?: "auto" | "rectangle" | "vertical" | "horizontal";
  /**
   * Reserved width in pixels — always a standard IAB unit (728×90 leaderboard,
   * 336×280 medium rectangle, 300×600 half page). The slot is capped at this
   * and centred rather than stretched edge to edge: a full-bleed empty box
   * reads as broken content, and AdSense never fills one that wide anyway.
   */
  width: number;
  /** Reserved height in pixels. Must match the unit's real height. */
  height: number;
  label?: string;
  className?: string;
}) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!CLIENT_ID || !slot || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // An ad blocker or a failed script load must never break the tool.
    }
  }, [slot]);

  const configured = Boolean(CLIENT_ID && slot);

  return (
    <aside
      aria-label={label}
      className={cn(
        "mx-auto flex w-full items-center justify-center overflow-hidden rounded-lg",
        configured ? "" : "border border-dashed border-border bg-surface/50",
        className,
      )}
      // Width is a cap, not a floor, so a 728px leaderboard still fits a
      // 360px phone; the reserved height is what keeps CLS at zero.
      style={{ maxWidth: width, height }}
    >
      {configured ? (
        <ins
          className="adsbygoogle block"
          style={{ display: "block", width: "100%", height }}
          data-ad-client={CLIENT_ID}
          data-ad-slot={slot}
          data-ad-format={format}
          // Fixed units must opt out, or AdSense overrides the size we reserved.
          data-full-width-responsive="false"
        />
      ) : (
        <span className="text-[11px] tracking-wide text-muted-subtle uppercase">
          {label}
        </span>
      )}
    </aside>
  );
}
