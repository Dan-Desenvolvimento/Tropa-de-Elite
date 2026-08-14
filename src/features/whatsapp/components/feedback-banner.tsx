import {
  AlertCircle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";

export type Feedback = {
  tone: "success" | "error" | "info";
  message: string;
};

const tones = {
  success: {
    icon: CheckCircle2,
    className:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
  },
  error: {
    icon: AlertCircle,
    className: "border-red-500/25 bg-red-500/10 text-red-100",
  },
  info: {
    icon: Info,
    className: "border-sky-500/25 bg-sky-500/10 text-sky-100",
  },
};

export function FeedbackBanner({
  feedback,
  onClose,
}: {
  feedback: Feedback;
  onClose: () => void;
}) {
  const tone = tones[feedback.tone];
  const Icon = tone.icon;

  return (
    <div
      role={feedback.tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${tone.className}`}
    >
      <Icon className="mt-0.5 size-5 shrink-0" />
      <p className="flex-1 leading-6">{feedback.message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar aviso"
        className="rounded-lg p-1 opacity-70 transition hover:bg-white/10 hover:opacity-100"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
