"use client";

import { LoaderCircle, Save } from "lucide-react";
import { FormEvent, useState } from "react";

export function TrackingSettingsForm({ initial }: { initial: { metaPixelId: string; metaApiEnabled: boolean } }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage(null); setError(null);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/settings/tracking", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ metaPixelId: String(data.get("metaPixelId") ?? ""), metaApiEnabled: data.get("metaApiEnabled") === "on", metaApiAccessToken: String(data.get("metaApiAccessToken") ?? "") }) });
    const result = (await response.json()) as { success: boolean; message?: string };
    if (!result.success) setError(result.message ?? "Não foi possível salvar."); else setMessage("Configurações salvas.");
    setPending(false);
  }

  const input = "mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none focus:border-red-500/60";
  return <form onSubmit={submit} className="space-y-6 rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:p-7">
    <div><h2 className="text-lg font-semibold text-white">Meta Ads</h2><p className="mt-2 text-sm leading-6 text-zinc-500">O Pixel ID é público. O token da API fica somente no servidor e nunca é exibido novamente.</p></div>
    <label className="block text-sm text-zinc-300">Pixel ID<input name="metaPixelId" defaultValue={initial.metaPixelId} inputMode="numeric" placeholder="Ex.: 123456789012345" className={input} /></label>
    <label className="block text-sm text-zinc-300">Token da Conversions API<input name="metaApiAccessToken" type="password" autoComplete="new-password" placeholder="Deixe vazio para manter o token atual" className={input} /></label>
    <label className="flex items-start gap-3 text-sm text-zinc-300"><input name="metaApiEnabled" type="checkbox" defaultChecked={initial.metaApiEnabled} className="mt-1 size-4 accent-red-600" /><span><strong className="text-white">Ativar API de conversões</strong><span className="mt-1 block text-xs leading-5 text-zinc-500">Envia PageView, Lead, CompleteRegistration e ViewContent pelo servidor.</span></span></label>
    {message ? <p className="text-sm text-emerald-400">{message}</p> : null}{error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
    <button disabled={pending} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white disabled:bg-zinc-800">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}Salvar configurações</button>
  </form>;
}
