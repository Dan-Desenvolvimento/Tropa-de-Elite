"use client";

import { useEffect } from "react";

type Props = { source: "site" | "form"; eventId?: string; registrationId?: string };

export function TrackingBeacon({ source, eventId, registrationId }: Props) {
  useEffect(() => {
    const send = (eventName: "page_view" | "cta_click" | "ticket_view", metadata: Record<string, string | number | boolean> = {}) => {
      void fetch("/api/tracking/events", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ eventName, source, path: window.location.pathname, eventId, registrationId, metadata }) }).catch(() => undefined);
    };

    send(registrationId ? "ticket_view" : "page_view");
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-track]") : null;
      if (target) send("cta_click", { label: target.dataset.track ?? "cta" });
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [eventId, registrationId, source]);

  return null;
}
