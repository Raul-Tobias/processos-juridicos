"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/auth/me"), fetch("/api/auth/bootstrap")])
      .then(async ([sessao, bootstrap]) => {
        if (sessao.ok) {
          router.replace("/dashboard");
          return;
        }
        if (!bootstrap.ok) throw new Error("Não foi possível verificar o acesso inicial.");
        const dados = await bootstrap.json();
        setPrimeiroAcesso(dados.primeiroAcesso === true);
      })
      .catch(() => setErro("Não foi possível conectar ao servidor."));
  }, [router]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setCarregando(true);
    setErro("");
    const endpoint = primeiroAcesso ? "/api/auth/bootstrap" : "/api/auth/login";
    const body = primeiroAcesso ? { nome, email, senha } : { email, senha };
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30_000);
      const resposta = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível concluir.");
        return;
      }
      if (primeiroAcesso) {
        setPrimeiroAcesso(false);
        setErro("Administrador criado. Entre com suas credenciais.");
        return;
      }
      window.dispatchEvent(new Event("autos-auth-changed"));
      router.replace("/dashboard");
    } catch (error) {
      setErro(error instanceof DOMException && error.name === "AbortError"
        ? "O servidor demorou para responder. Tente novamente."
        : "Não foi possível conectar ao servidor.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 pt-16 pb-24">
      <Link href="/login" className="text-sm text-ink/50 hover:text-ink">Acesso ao sistema</Link>
      <div className="mt-10 mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-2">Acesso seguro</p>
        <h1 className="font-serif text-4xl font-semibold">{primeiroAcesso ? "Criar administrador" : "Entrar no Autos"}</h1>
        <p className="text-ink/55 mt-3">{primeiroAcesso ? "Configure o primeiro acesso ao sistema." : "Use suas credenciais para continuar."}</p>
      </div>
      <form onSubmit={enviar} className="border border-ink/10 bg-paper/70 rounded-2xl p-6 shadow-[0_12px_30px_#1c243108] space-y-4">
        {primeiroAcesso && <label className="block text-sm">Nome<input required value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 w-full rounded-lg border border-ink/15 bg-white/40 px-3 py-2.5 outline-none focus:border-accent/50" /></label>}
        <label className="block text-sm">E-mail<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-ink/15 bg-white/40 px-3 py-2.5 outline-none focus:border-accent/50" /></label>
        <label className="block text-sm">Senha<input required minLength={8} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="mt-1 w-full rounded-lg border border-ink/15 bg-white/40 px-3 py-2.5 outline-none focus:border-accent/50" /></label>
        {erro && <p role="alert" className="text-sm text-accent">{erro}</p>}
        <button disabled={carregando} className="w-full rounded-lg bg-accent text-paper px-4 py-3 font-medium hover:bg-accent-light disabled:opacity-40">{carregando ? "Aguarde…" : primeiroAcesso ? "Criar acesso" : "Entrar"}</button>
      </form>
    </div>
  );
}
