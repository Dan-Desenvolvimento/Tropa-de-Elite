"use client";

import { useEffect } from "react";

declare global {
  interface Window { fbq?: (...args: unknown[]) => void; }
}

export function MetaPixel() {
  useEffect(() => {
    let active = true;
    fetch("/api/tracking/config", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ pixelId: string | null }>)
      .then(({ pixelId }) => {
        if (!active || !pixelId || document.querySelector("[data-meta-pixel]") ) return;
        const script = document.createElement("script");
        script.dataset.metaPixel = "true";
        script.async = true;
        script.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`;
        document.head.appendChild(script);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  return null;
}
