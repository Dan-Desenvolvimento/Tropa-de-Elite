import { CheckCheck, ExternalLink } from "lucide-react";

export function WhatsAppPreview({
  body,
  headerMediaUrl,
  buttonLabel,
  buttonUrl = null,
  compact = false,
}: {
  body: string;
  headerMediaUrl: string | null;
  buttonLabel: string | null;
  buttonUrl?: string | null;
  compact?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b141a] shadow-2xl shadow-black/40">
      <div className="flex items-center gap-3 border-b border-white/5 bg-[#202c33] px-4 py-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-900 text-xs font-black text-white">
          TE
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Tropa de Elite</p>
          <p className="text-[10px] text-zinc-400">conta comercial</p>
        </div>
      </div>

      <div
        className={`bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.035),transparent_30%),linear-gradient(135deg,#0b141a,#111b21)] ${compact ? "p-3" : "p-5"}`}
      >
        <div className="ml-auto max-w-[94%] overflow-hidden rounded-xl rounded-tr-sm bg-[#202c33] shadow-lg">
          {headerMediaUrl ? (
            <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-zinc-900">
              {/* A mídia vem de um bucket público configurável; a prévia não deve depender
                  da lista de domínios do otimizador do Next.js. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={headerMediaUrl}
                alt="Cabeçalho da mensagem"
                referrerPolicy="no-referrer"
                className="size-full object-cover"
              />
            </div>
          ) : null}

          <div className={compact ? "p-3" : "p-4"}>
            <p className={`whitespace-pre-wrap leading-relaxed text-zinc-100 ${compact ? "text-xs" : "text-sm"}`}>
              {body || "O texto da sua mensagem aparecerá aqui."}
            </p>
            <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-zinc-400">
              <span>agora</span>
              <CheckCheck className="size-3.5 text-sky-400" />
            </div>
          </div>

          {buttonLabel ? (
            <a
              href={buttonUrl ?? undefined}
              target={buttonUrl ? "_blank" : undefined}
              rel={buttonUrl ? "noreferrer" : undefined}
              aria-disabled={!buttonUrl}
              className="flex w-full items-center justify-center gap-2 border-t border-white/8 px-4 py-3 text-xs font-semibold text-sky-400"
            >
              <ExternalLink className="size-3.5" />
              {buttonLabel}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
