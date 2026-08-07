import { PageHeader } from "@/components/admin/page-header";
import { TrackingSettingsForm } from "@/features/tracking/components/tracking-settings-form";
import { getTrackingSettings, getTrackingSummary } from "@/features/tracking/server/tracking";
import { requireOwner } from "@/lib/auth/dal";

export default async function SettingsPage() {
  await requireOwner();
  const [settings, summary] = await Promise.all([getTrackingSettings(), getTrackingSummary()]);

  return (
    <main>
      <PageHeader eyebrow="Configurações" title="Aquisição e rastreamento" description="Configure o Pixel da Meta e acompanhe as conversões do site e do formulário." />
      <div className="max-w-3xl p-5 sm:p-8 lg:p-10">
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <Metric label="Acessos do site" value={summary.page_view?.site ?? 0} />
          <Metric label="Cliques no site" value={summary.cta_click?.site ?? 0} />
          <Metric label="Acessos do formulário" value={summary.page_view?.form ?? 0} />
          <Metric label="Inscrições concluídas" value={summary.registration_completed?.form ?? 0} />
          <Metric label="Visualizações de ingresso" value={summary.ticket_view?.form ?? 0} />
        </div>
        <TrackingSettingsForm initial={{ metaPixelId: settings?.meta_pixel_id ?? "", metaApiEnabled: settings?.meta_api_enabled ?? false }} />
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><p className="text-xs uppercase tracking-wide text-zinc-600">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value.toLocaleString("pt-BR")}</p></div>;
}
