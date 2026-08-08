"use client";

import Script from "next/script";
import { useEffect } from "react";

const FALLBACK_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1760053031291739";

declare global {
  interface Window { fbq?: (...args: unknown[]) => void; }
}

export function MetaPixel() {
  useEffect(() => {
    let active = true;
    fetch("/api/tracking/config", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ pixelId: string | null }>)
      .then(({ pixelId }) => {
        if (!active || !pixelId || window.fbq) return;
        const script = document.createElement("script");
        script.dataset.metaPixel = "true";
        script.async = true;
        script.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`;
        document.head.appendChild(script);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,
'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${FALLBACK_PIXEL_ID}');
fbq('track','PageView');`}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${FALLBACK_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
