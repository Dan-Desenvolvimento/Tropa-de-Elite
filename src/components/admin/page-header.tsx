export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-white/8 px-5 py-7 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{title}</h1>
        {description ? <p className="mt-2 text-sm text-zinc-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}
