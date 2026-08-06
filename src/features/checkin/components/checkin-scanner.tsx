"use client";

import { Building2, Camera, CheckCircle2, Flashlight, Keyboard, LoaderCircle, Search, Wifi, WifiOff, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { isPotentialBusinessOwner } from "@/features/checkin/strategic-profile";
import { formatJobRole } from "@/features/registrations/job-roles";

type ScannerControls = { stop: () => void; switchTorch?: (on: boolean) => Promise<void> };
type LookupResult = {
  success: boolean;
  code: string;
  registration_id?: string;
  full_name?: string;
  ticket_code?: string;
  registration_status?: string;
  checked_in_at?: string | null;
  checked_in_by_name?: string | null;
  company_name?: string | null;
  job_role?: string | null;
  job_role_other?: string | null;
  potential_business_owner?: boolean;
};
type SearchResult = {
  registration_id: string;
  full_name: string;
  masked_email: string;
  masked_phone: string;
  ticket_code: string;
  registration_status: string;
  checked_in_at: string | null;
};

const outcomeCopy: Record<string, { title: string; tone: "green" | "yellow" | "red" }> = {
  TICKET_FOUND: { title: "Cadastro localizado", tone: "green" },
  CHECKIN_SUCCESS: { title: "Entrada confirmada", tone: "green" },
  ALREADY_CHECKED_IN: { title: "Entrada já registrada", tone: "yellow" },
  CANCELLED_REGISTRATION: { title: "Inscrição cancelada", tone: "red" },
  WAITLIST_REGISTRATION: { title: "Participante na lista de espera", tone: "yellow" },
  EVENT_CLOSED: { title: "Evento encerrado", tone: "red" },
  INVALID_TOKEN: { title: "Cadastro não localizado", tone: "red" },
  UNAUTHORIZED: { title: "Operador sem permissão", tone: "red" },
};

export function CheckinScanner({ eventId, initialCount, canOverrideWaitlist }: { eventId: string; initialCount: number; canOverrideWaitlist: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const scanLockedRef = useRef(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(false);
  const [currentValue, setCurrentValue] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [checkinCount, setCheckinCount] = useState(initialCount);
  const [history, setHistory] = useState<Array<{ name: string; code: string; at: string }>>([]);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      controlsRef.current?.stop();
    };
  }, []);

  const lookupTicket = useCallback(async (value: string) => {
    if (!navigator.onLine || scanLockedRef.current) return;
    scanLockedRef.current = true;
    controlsRef.current?.stop();
    setCameraActive(false);
    setPending(true);
    setCurrentValue(value);
    try {
      const response = await fetch(`/api/admin/events/${eventId}/checkin/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const data = (await response.json()) as LookupResult;
      setResult(data.success ? data : { success: false, code: data.code || "INVALID_TOKEN" });
      playFeedback(data.success && data.code === "TICKET_FOUND");
    } catch {
      setResult({ success: false, code: "LOOKUP_FAILED" });
      playFeedback(false);
    } finally {
      setPending(false);
    }
  }, [eventId]);

  async function startCamera(deviceId = selectedCamera) {
    if (!online || !videoRef.current) return;
    setCameraError(null);
    setResult(null);
    scanLockedRef.current = false;
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const callback = (scanResult: { getText(): string } | undefined, _error: unknown, activeControls: ScannerControls) => {
        controlsRef.current = activeControls;
        if (scanResult && !scanLockedRef.current) void lookupTicket(scanResult.getText());
      };
      const controls = deviceId
        ? await reader.decodeFromVideoDevice(deviceId, videoRef.current, callback)
        : await reader.decodeFromConstraints(
            { video: { facingMode: { ideal: "environment" } }, audio: false },
            videoRef.current,
            callback,
          );
      controlsRef.current = controls;
      setTorchAvailable(Boolean(controls.switchTorch));
      setCameraActive(true);
      const available = await BrowserQRCodeReader.listVideoInputDevices();
      setCameras(available.map((camera, index) => ({ id: camera.deviceId, label: camera.label || `Câmera ${index + 1}` })));
      if (!selectedCamera) {
        const rear = available.find((camera) => /back|rear|traseira|environment/i.test(camera.label));
        setSelectedCamera(rear?.deviceId ?? available[0]?.deviceId ?? "");
      }
    } catch {
      setCameraError("Não foi possível acessar a câmera. Autorize o acesso ou utilize a busca manual.");
      setCameraActive(false);
    }
  }

  async function confirmCheckin(forceWaitlist = false) {
    if (!currentValue || !online) return;
    setPending(true);
    try {
      const response = await fetch(`/api/admin/events/${eventId}/checkin/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: currentValue,
          method: currentValue.startsWith("EVENT:") ? "qr" : "manual",
          forceWaitlist,
          deviceInfo: { userAgent: navigator.userAgent.slice(0, 300) },
        }),
      });
      const data = (await response.json()) as LookupResult;
      setResult(data);
      if (data.code === "CHECKIN_SUCCESS") {
        setCheckinCount((count) => count + 1);
        setHistory((items) => [
          { name: data.full_name ?? "Participante", code: data.ticket_code ?? "—", at: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) },
          ...items,
        ].slice(0, 8));
        playFeedback(true);
      } else {
        playFeedback(false);
      }
    } catch {
      setResult({ success: false, code: "CHECKIN_FAILED" });
      playFeedback(false);
    } finally {
      setPending(false);
    }
  }

  async function searchPeople() {
    if (search.trim().length < 2) return setSearchResults([]);
    const response = await fetch(`/api/admin/events/${eventId}/checkin/search?q=${encodeURIComponent(search)}`);
    const data = (await response.json()) as { success: boolean; data?: SearchResult[] };
    setSearchResults(data.success ? data.data ?? [] : []);
  }

  function closeResult() {
    setResult(null);
    setCurrentValue(null);
    scanLockedRef.current = false;
  }

  async function toggleTorch() {
    if (!controlsRef.current?.switchTorch) return;
    const next = !torchOn;
    try { await controlsRef.current.switchTorch(next); setTorchOn(next); } catch { setTorchOn(false); }
  }

  const strategicProfile =
    result?.potential_business_owner ??
    isPotentialBusinessOwner(result?.job_role);
  const visual = result ? outcomeCopy[result.code] ?? { title: "Não foi possível validar", tone: "red" as const } : null;
  const toneClass = visual?.tone === "green" ? "border-emerald-500/30 bg-emerald-500/10" : visual?.tone === "yellow" ? "border-amber-500/30 bg-amber-500/10" : "border-red-500/30 bg-red-500/10";
  const modalToneClass = strategicProfile
    ? "border-amber-400/60 bg-[linear-gradient(145deg,rgba(120,83,15,.32),rgba(24,24,27,.97))] shadow-[0_0_55px_rgba(251,191,36,.16)]"
    : toneClass;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-black">
          <div className="relative aspect-[4/3] bg-[radial-gradient(circle_at_center,rgba(225,22,32,.12),transparent_65%)] sm:aspect-video">
            <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${cameraActive ? "block" : "hidden"}`} />
            {!cameraActive ? (
              <div className="absolute inset-0 grid place-items-center p-6 text-center">
                <div><Camera className="mx-auto size-10 text-zinc-700" /><p className="mt-4 text-sm text-zinc-500">Abra a câmera para ler o QR Code.</p></div>
              </div>
            ) : <div className="pointer-events-none absolute inset-1/2 size-[min(14rem,70vw)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border-2 border-red-500/70 shadow-[0_0_0_999px_rgba(0,0,0,.28)]" />}
          </div>
          <div className="flex flex-wrap gap-3 border-t border-white/8 p-4">
            <button onClick={() => void startCamera()} disabled={!online || pending} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white disabled:bg-zinc-800"><Camera className="size-4" />{cameraActive ? "Reiniciar câmera" : "Abrir câmera"}</button>
            <button onClick={toggleTorch} disabled={!cameraActive || !torchAvailable} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-zinc-300 disabled:text-zinc-700"><Flashlight className="size-4" />Lanterna</button>
            {cameras.length > 1 ? <select aria-label="Selecionar câmera" value={selectedCamera} onChange={(event) => { const id = event.target.value; controlsRef.current?.stop(); setSelectedCamera(id); void startCamera(id); }} className="min-h-12 rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-300">{cameras.map((camera) => <option key={camera.id} value={camera.id}>{camera.label}</option>)}</select> : null}
          </div>
        </div>

        {cameraError ? <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200">{cameraError}</div> : null}
        {!online ? <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-medium text-red-200">Sem conexão. Nenhuma leitura será considerada válida até a internet retornar.</div> : null}

        <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
          <h2 className="flex items-center gap-2 font-semibold text-white"><Keyboard className="size-4 text-red-500" />Código manual</h2>
          <div className="mt-4 flex gap-2">
            <input value={manualCode} onChange={(event) => setManualCode(event.target.value.toUpperCase())} placeholder="TDE-8F4K2D" className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none focus:border-red-500/60" />
            <button onClick={() => void lookupTicket(manualCode)} disabled={!online || manualCode.length < 3} className="rounded-xl bg-white/10 px-5 text-sm font-bold text-white disabled:text-zinc-700">Localizar</button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
          <h2 className="flex items-center gap-2 font-semibold text-white"><Search className="size-4 text-red-500" />Busca por participante</h2>
          <div className="mt-4 flex gap-2">
            <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void searchPeople(); }} placeholder="Nome, e-mail, telefone ou código" className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none focus:border-red-500/60" />
            <button onClick={searchPeople} className="rounded-xl bg-white/10 px-5 text-sm font-bold text-white">Buscar</button>
          </div>
          {searchResults.length > 0 ? <div className="mt-4 divide-y divide-white/8 rounded-xl border border-white/8">{searchResults.map((person) => <button key={person.registration_id} onClick={() => void lookupTicket(person.ticket_code)} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-white/5"><div><p className="text-sm font-medium text-white">{person.full_name}</p><p className="mt-1 text-xs text-zinc-600">{person.masked_email} · {person.masked_phone}</p></div><span className="font-mono text-xs text-red-400">{person.ticket_code}</span></button>)}</div> : null}
        </section>
      </div>

      <aside className="space-y-6">
        <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
          <div className="flex items-center justify-between"><p className="text-sm text-zinc-500">Conexão</p><span className={`flex items-center gap-2 text-xs font-medium ${online ? "text-emerald-400" : "text-red-400"}`}>{online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}{online ? "Online" : "Offline"}</span></div>
          <p className="mt-5 text-4xl font-semibold text-white">{checkinCount.toLocaleString("pt-BR")}</p><p className="mt-1 text-sm text-zinc-600">check-ins realizados</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5"><h2 className="font-semibold text-white">Últimas entradas</h2>{history.length === 0 ? <p className="mt-4 text-sm text-zinc-600">Nenhuma entrada nesta sessão.</p> : <div className="mt-4 space-y-3">{history.map((item, index) => <div key={`${item.code}-${index}`} className="flex justify-between gap-3 text-sm"><div><p className="text-zinc-300">{item.name}</p><p className="text-xs text-zinc-600">{item.code}</p></div><span className="text-xs text-zinc-600">{item.at}</span></div>)}</div>}</div>
      </aside>

      {pending || result ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-5 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-[2rem] border p-7 text-center ${pending ? "border-white/10 bg-zinc-950" : modalToneClass}`}>
        {pending ? <><LoaderCircle className="mx-auto size-12 animate-spin text-red-500" /><h2 className="mt-5 text-2xl font-semibold text-white">Validando ingresso</h2></> : <>{visual?.tone === "green" ? <CheckCircle2 className="mx-auto size-14 text-emerald-400" /> : <XCircle className={`mx-auto size-14 ${visual?.tone === "yellow" ? "text-amber-400" : "text-red-400"}`} />}<h2 className="mt-5 text-2xl font-semibold text-white">{visual?.title}</h2>{strategicProfile ? (
      <StrategicProfileAlert
        companyName={result?.company_name}
        jobRole={result?.job_role}
        jobRoleOther={result?.job_role_other}
      />
    ) : null}{result?.full_name ? <p className="mt-3 text-lg text-zinc-200">{result.full_name}</p> : null}{result?.ticket_code ? <p className="mt-1 font-mono text-sm text-zinc-500">{result.ticket_code}</p> : null}{result?.checked_in_at ? <p className="mt-3 text-sm text-zinc-400">Primeira entrada: {new Date(result.checked_in_at).toLocaleString("pt-BR")}{result.checked_in_by_name ? ` · ${result.checked_in_by_name}` : ""}</p> : null}{result?.code === "TICKET_FOUND" ? <button onClick={() => void confirmCheckin()} disabled={!online} className="mt-7 min-h-14 w-full rounded-xl bg-emerald-600 px-6 text-sm font-bold uppercase tracking-wide text-white disabled:bg-zinc-800">Confirmar entrada</button> : null}{result?.code === "WAITLIST_REGISTRATION" && canOverrideWaitlist ? <button onClick={() => void confirmCheckin(true)} disabled={!online} className="mt-7 min-h-14 w-full rounded-xl bg-amber-600 px-6 text-sm font-bold uppercase tracking-wide text-white disabled:bg-zinc-800">Promover e confirmar entrada</button> : null}<button onClick={closeResult} className="mt-3 min-h-12 w-full rounded-xl border border-white/10 px-6 text-sm font-semibold text-white">{result?.code === "CHECKIN_SUCCESS" ? "Ler próximo" : "Fechar"}</button></>}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StrategicProfileAlert({
  companyName,
  jobRole,
  jobRoleOther,
}: {
  companyName?: string | null;
  jobRole?: string | null;
  jobRoleOther?: string | null;
}) {
  return (
    <div
      role="status"
      aria-label="Sinal interno da recepção"
      className="mt-5 rounded-2xl border border-amber-300/45 bg-amber-300/10 p-4 text-left"
    >
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-300">
        <Building2 className="size-4 animate-pulse" />
        Sinal interno E1
      </div>

      <p className="mt-2 text-sm font-semibold text-white">
        Perfil empresarial identificado
      </p>

      <p className="mt-1 text-xs leading-5 text-amber-100/70">
        {companyName?.trim() || "Empresa não informada"} ·{" "}
        {formatJobRole(jobRole, jobRoleOther)}
      </p>
    </div>
  );
}

function playFeedback(success: boolean) {
  try {
    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = success ? 880 : 220;
    gain.gain.value = 0.08;
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.12);
  } catch { /* Som é complementar; o retorno visual permanece disponível. */ }
}
