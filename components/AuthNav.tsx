"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Usuario } from "@/lib/auth";
import { EMAIL_ADMIN } from "@/lib/auth-constants";
import { BarChart3, FilePlus2, Files, Gavel, LogOut, PanelLeftClose, ShieldCheck } from "lucide-react";

const itensNavegacao = [
  { href: "/", label: "Novo processo", Icone: FilePlus2 },
  { href: "/processos", label: "Processos", Icone: Files },
  { href: "/processos?filtro=bloqueio", label: "Bloqueio judicial", Icone: Gavel },
  { href: "/dashboard", label: "Dashboard", Icone: BarChart3 },
];

export default function AuthNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    function carregarUsuario() {
      return fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((dados) => setUsuario(dados?.usuario ?? null));
    }

    carregarUsuario();
    window.addEventListener("autos-auth-changed", carregarUsuario);
    return () => window.removeEventListener("autos-auth-changed", carregarUsuario);
  }, []);

  if (!usuario) {
    return (
      <Link href="/login" className="flex items-center gap-3 px-3 py-2 rounded-lg text-accent hover:bg-accent/5 transition-colors">
        Entrar
      </Link>
    );
  }

  return (
    <span className="flex flex-col gap-1 w-full">
      {itensNavegacao.map(({ href, label, Icone }) => {
        const selecionado = href === "/" ? pathname === "/" : pathname === href;
        return (
        <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${selecionado ? "bg-accent/10 text-accent font-semibold" : "text-ink/60 hover:text-ink hover:bg-ink/5"}`}>
          <Icone className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          <span>{label}</span>
        </Link>
      )})}
      {usuario.perfil === "admin" && usuario.email === EMAIL_ADMIN && (
        <Link href="/admin" className="mt-4 pt-4 border-t border-[#dedad0] flex items-center gap-3 px-3 py-2.5 rounded-lg text-ink/60 hover:text-ink hover:bg-ink/5 transition-colors">
          <ShieldCheck className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          Admin
        </Link>
      )}
      <button
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          setUsuario(null);
          window.dispatchEvent(new Event("autos-auth-changed"));
          router.push("/login");
        }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-ink/60 hover:text-ink hover:bg-ink/5 transition-colors text-left"
      >
        <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.8} />
        Sair
      </button>
      <span className="hidden md:flex mt-auto fixed bottom-0 left-0 w-[228px] border-t border-[#dedad0] bg-[#fbfaf6] px-6 py-5 items-center gap-3 text-[11px] text-ink/55">
        <PanelLeftClose className="w-4 h-4" strokeWidth={1.7} /> Recolher menu
      </span>
    </span>
  );
}
