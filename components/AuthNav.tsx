"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Usuario } from "@/lib/auth";
import { EMAIL_ADMIN } from "@/lib/auth-constants";

export default function AuthNav() {
  const router = useRouter();
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
      <Link href="/login" className="px-2 sm:px-3 py-2 rounded-md text-accent hover:bg-accent/5 transition-colors">
        Entrar
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-0.5 border-l border-ink/10 pl-1 sm:pl-2">
      <Link href="/" className="px-2 sm:px-3 py-2 rounded-md text-ink/60 hover:text-ink hover:bg-ink/5 transition-colors">
        Novo processo
      </Link>
      <Link href="/processos" className="px-2 sm:px-3 py-2 rounded-md text-ink/60 hover:text-ink hover:bg-ink/5 transition-colors">
        Processos
      </Link>
      <Link href="/dashboard" className="px-2 sm:px-3 py-2 rounded-md text-ink/60 hover:text-ink hover:bg-ink/5 transition-colors">
        Dashboard
      </Link>
      {usuario.perfil === "admin" && usuario.email === EMAIL_ADMIN && (
        <Link href="/admin" className="px-2 sm:px-3 py-2 rounded-md text-ink/60 hover:text-ink hover:bg-ink/5 transition-colors">
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
        className="px-2 sm:px-3 py-2 rounded-md text-ink/60 hover:text-ink hover:bg-ink/5 transition-colors"
      >
        Sair
      </button>
    </span>
  );
}
