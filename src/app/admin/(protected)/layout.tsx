import Image from "next/image";
import Link from "next/link";
import { CalendarRange, LayoutDashboard, LogOut, ScanLine, UsersRound } from "lucide-react";

import { signOut } from "@/app/admin/actions";
import { requireStaff } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();

  return (
    <div className="min-h-screen bg-[#070708] text-white lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-white/8 bg-[#0c0c0e]/95 px-5 py-4 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
        <div className="relative h-16 w-48 overflow-hidden">
          <Image
            src="/Tropa-de-elite-branca-para-fundo-preto.png"
            alt="Tropa de Elite"
            fill
            sizes="192px"
            className="object-cover object-[center_59%]"
          />
        </div>

        <nav className="mt-4 flex gap-2 overflow-x-auto lg:mt-8 lg:flex-col lg:overflow-visible">
          <NavLink href="/admin" icon={LayoutDashboard}>Visão geral</NavLink>
          {staff.globalRole === "admin" ? (
            <>
              <NavLink href="/admin/eventos" icon={CalendarRange}>Eventos</NavLink>
              <NavLink href="/admin/equipe" icon={UsersRound}>Equipe</NavLink>
            </>
          ) : (
            <NavLink href="/admin/eventos" icon={ScanLine}>Check-in</NavLink>
          )}
        </nav>

        <div className="mt-5 hidden border-t border-white/8 pt-5 lg:absolute lg:bottom-6 lg:left-5 lg:right-5 lg:block">
          <p className="truncate text-sm font-medium text-zinc-300">{staff.fullName}</p>
          <p className="mt-1 text-xs text-zinc-600">{staff.globalRole === "admin" ? "Administrador" : "Operador"}</p>
          <form action={signOut} className="mt-4">
            <button className="flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white">
              <LogOut className="size-4" /> Sair
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function NavLink({ href, icon: Icon, children }: { href: string; icon: typeof LayoutDashboard; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white"
    >
      <Icon className="size-4 text-red-500" /> {children}
    </Link>
  );
}
