"use client";

import { useEffect, useState } from "react";

export function TicketGroupRedirect({ groupUrl }: { groupUrl: string | null }) {
  const [seconds, setSeconds] = useState(3);

  useEffect(() => {
    if (!groupUrl) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    const redirect = window.setTimeout(() => { window.location.assign(groupUrl); }, 3000);
    return () => { window.clearInterval(timer); window.clearTimeout(redirect); };
  }, [groupUrl]);

  if (!groupUrl) return null;
  return <p className="mt-4 text-xs text-zinc-500">Você será direcionado para o grupo oficial em {seconds}s.</p>;
}
