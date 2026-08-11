"use client";

import { useEffect } from "react";

type Props = { source: "site" | "form"; eventId?: string; registrationId?: string };

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const ATTRIBUTION_KEY = "tropa_tracking_attribution";

export type ClientTrackingAttribution = {
  sessionId: string;
  landingPage: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
};

function readCookie(name: string) {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || undefined;
}

export function getClientTrackingAttribution(): ClientTrackingAttribution {
  const params = new URLSearchParams(window.location.search);
  const stored = window.localStorage.getItem(ATTRIBUTION_KEY);
  let previous: Partial<ClientTrackingAttribution> = {};
  try {
    previous = stored ? (JSON.parse(stored) as Partial<ClientTrackingAttribution>) : {};
  } catch {
    window.localStorage.removeItem(ATTRIBUTION_KEY);
  }
  const sessionId = previous.sessionId || (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
  const fbclid = params.get("fbclid") || previous.fbclid || undefined;
  const fbp = readCookie("_fbp") || previous.fbp;
  const fbc = readCookie("_fbc") || previous.fbc || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined);
  const attribution: ClientTrackingAttribution = {
    sessionId,
    landingPage: previous.landingPage || window.location.href,
    referrer: document.referrer || previous.referrer || undefined,
    utmSource: params.get("utm_source") || previous.utmSource || undefined,
    utmMedium: params.get("utm_medium") || previous.utmMedium || undefined,
    utmCampaign: params.get("utm_campaign") || previous.utmCampaign || undefined,
    utmContent: params.get("utm_content") || previous.utmContent || undefined,
    utmTerm: params.get("utm_term") || previous.utmTerm || undefined,
    fbclid,
    fbp,
    fbc,
  };
  window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  return attribution;
}

export function TrackingBeacon({ source, eventId, registrationId }: Props) {
  useEffect(() => {
    const attribution = getClientTrackingAttribution();
    const send = (
      eventName: "page_view" | "form_started" | "cta_click" | "ticket_view",
      metadata: Record<string, string | number | boolean> = {},
      metaEventId?: string,
    ) => {
      void fetch("/api/tracking/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          eventName,
          source,
          path: window.location.pathname,
          eventId,
          metaEventId,
          registrationId,
          metadata,
          attribution,
        }),
      }).catch(() => undefined);
    };

    const pageEventId = `${attribution.sessionId}:${source}:${window.location.pathname}`;
    if (registrationId) {
      send("ticket_view", {}, registrationId);
      const completionKey = `tropa_complete_registration:${registrationId}`;
      if (!window.sessionStorage.getItem(completionKey)) {
        window.sessionStorage.setItem(completionKey, "1");
        window.fbq?.("track", "CompleteRegistration", {}, { eventID: registrationId });
      }
    } else {
      send("page_view", {}, pageEventId);
      window.fbq?.("track", "PageView", {}, { eventID: pageEventId });
      if (source === "form") {
        const formEventId = `${attribution.sessionId}:${window.location.pathname}`;
        const formStartKey = `tropa_form_started:${window.location.pathname}`;
        if (!window.sessionStorage.getItem(formStartKey)) {
          window.sessionStorage.setItem(formStartKey, "1");
          send("form_started", {}, formEventId);
          window.fbq?.("trackCustom", "FormStarted", {}, { eventID: formEventId });
        }
      }
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-track]") : null;
      if (target) send("cta_click", { label: target.dataset.track ?? "cta" });
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [eventId, registrationId, source]);

  return null;
}
