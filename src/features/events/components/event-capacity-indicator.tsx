"use client";

import { TicketCheck } from "lucide-react";
import { useEffect, useState } from "react";

type CapacitySnapshot = {
  capacity: number;
  confirmed: number;
  remaining: number;
  percentage: number;
};

type AvailabilityResponse =
  | { success: true; data: CapacitySnapshot | null }
  | { success: false };

export function EventCapacityIndicator({
  eventSlug,
  capacity,
  remainingSlots,
}: {
  eventSlug: string;
  capacity: number;
  remainingSlots: number;
}) {
  const [snapshot, setSnapshot] = useState(() =>
    createSnapshot(capacity, remainingSlots),
  );

  useEffect(() => {
    let active = true;

    async function refreshAvailability() {
      try {
        const response = await fetch(
          `/api/events/${encodeURIComponent(eventSlug)}/availability`,
          { cache: "no-store" },
        );
        const result = (await response.json()) as AvailabilityResponse;

        if (active && result.success && result.data) {
          setSnapshot(result.data);
        }
      } catch {
        // Mantém o último valor válido quando a conexão estiver instável.
      }
    }

    const interval = window.setInterval(refreshAvailability, 15_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshAvailability();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [eventSlug]);

  const soldOut = snapshot.remaining === 0;

  return (
    <section className="mb-7 overflow-hidden rounded-2xl border border-red-500/25 bg-red-500/[0.07] p-4 shadow-[0_18px_45px_rgba(127,29,29,0.14)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-400">
            <TicketCheck className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-white">
              {soldOut
                ? "Vagas regulares preenchidas"
                : `Restam apenas ${snapshot.remaining} ${snapshot.remaining === 1 ? "vaga" : "vagas"}`}
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              {snapshot.confirmed.toLocaleString("pt-BR")} de{" "}
              {snapshot.capacity.toLocaleString("pt-BR")} vagas já foram preenchidas.
            </p>
          </div>
        </div>
        <strong className="shrink-0 text-sm tabular-nums text-red-300">
          {snapshot.percentage}%
        </strong>
      </div>

      <div
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/8"
        role="progressbar"
        aria-label="Ocupação das vagas do evento"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={snapshot.percentage}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-red-700 via-red-500 to-orange-400 shadow-[0_0_20px_rgba(239,68,68,0.55)] transition-[width] duration-700 ease-out"
          style={{ width: `${snapshot.percentage}%` }}
        />
      </div>
    </section>
  );
}

export function createSnapshot(
  capacity: number,
  remainingSlots: number,
): CapacitySnapshot {
  const safeCapacity = Math.max(1, Math.trunc(capacity));
  const remaining = Math.min(
    safeCapacity,
    Math.max(0, Math.trunc(remainingSlots)),
  );
  const confirmed = safeCapacity - remaining;

  return {
    capacity: safeCapacity,
    confirmed,
    remaining,
    percentage: Math.min(
      100,
      Math.max(0, Math.round((confirmed / safeCapacity) * 100)),
    ),
  };
}
