"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserPlus, UserRoundX } from "lucide-react";
import type { Usuario } from "@/lib/auth";

const PERFIS = [
  { valor: "operador", label: "Operador" },
  { valor: "consulta", label: "Consulta" },
];

const PERMISSOES = [
  { chave: "analisar", label: "Analisar documentos" },
  { chave: "editar", label: "Editar processos" },
  { chave: "excluir", label: "Excluir processos" },
] as const;

const PERMISSOES_POR_PERFIL = {
  admin: { analisar: true, editar: true, excluir: true },
  operador: { analisar: true, editar: true, excluir: false },
  consulta: { analisar: false, editar: false, excluir: false },
};

export default function AdminPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ nome: "", email: "", senha: "", perfil: "consulta", permissoes: { analisar: false, editar: false, excluir: false } });

  useEffect(() => {
    fetch("/api/admin/usuarios")
      .then(async (resposta) => {
        if (resposta.status === 401 || resposta.status === 403) {
          router.replace("/");
          return null;
        }
        return resposta.json();
      })
      .then((dados) => {
        if (dados) setUsuarios(dados.usuarios ?? []);
      });
  }, [router]);

  async function carregarUsuarios() {
    const resposta = await fetch("/api/admin/usuarios");
    if (resposta.ok) setUsuarios((await resposta.json()).usuarios ?? []);
  }

  async function criar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    const resposta = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const dados = await resposta.json();
    if (!resposta.ok) { setErro(dados.erro ?? "Não foi possível criar o usuário."); return; }
    setForm({ nome: "", email: "", senha: "", perfil: "consulta", permissoes: { analisar: false, editar: false, excluir: false } });
    carregarUsuarios();
  }

  async function alternarAtivo(usuario: Usuario) {
    await fetch(`/api/admin/usuarios/${usuario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !usuario.ativo }),
    });
    carregarUsuarios();
  }

  async function mudarPerfil(usuario: Usuario, perfil: string) {
    await fetch(`/api/admin/usuarios/${usuario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ perfil }),
    });
    carregarUsuarios();
  }

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-6 pt-12 pb-24">
      <div className="flex items-start gap-3 mb-10">
        <ShieldCheck className="w-7 h-7 text-accent mt-1" />
        <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-2">Controle de acesso</p><h1 className="font-serif text-4xl font-semibold">Administração</h1><p className="text-ink/55 mt-2">Gerencie quem pode acessar e operar o Autos.</p></div>
      </div>
      <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-8">
        <form onSubmit={criar} className="border border-ink/10 bg-paper/70 rounded-2xl p-5 h-fit space-y-4">
          <div className="flex items-center gap-2 mb-2"><UserPlus className="w-4 h-4 text-accent" /><h2 className="font-serif text-xl font-semibold">Novo usuário</h2></div>
          <label className="block text-sm">Nome<input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-1 w-full rounded-lg border border-ink/15 bg-white/40 px-3 py-2 outline-none" /></label>
          <label className="block text-sm">E-mail<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-lg border border-ink/15 bg-white/40 px-3 py-2 outline-none" /></label>
          <label className="block text-sm">Senha<input required minLength={8} type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} className="mt-1 w-full rounded-lg border border-ink/15 bg-white/40 px-3 py-2 outline-none" /></label>
          <label className="block text-sm">Perfil<select value={form.perfil} onChange={(e) => { const perfil = e.target.value as keyof typeof PERMISSOES_POR_PERFIL; setForm({ ...form, perfil, permissoes: { ...PERMISSOES_POR_PERFIL[perfil] } }); }} className="mt-1 w-full rounded-lg border border-ink/15 bg-white/40 px-3 py-2 outline-none">{PERFIS.map((p) => <option key={p.valor} value={p.valor}>{p.label}</option>)}</select></label>
          <fieldset className="border-t border-ink/10 pt-4">
            <legend className="font-mono text-[10px] uppercase tracking-wide text-ink/40 mb-2">Autorizações adicionais</legend>
            <div className="space-y-2">
              {PERMISSOES.map((permissao) => (
                <label key={permissao.chave} className="flex items-center gap-2 text-sm text-ink/70">
                  <input
                    type="checkbox"
                    checked={form.permissoes[permissao.chave]}
                    onChange={(e) => setForm({ ...form, permissoes: { ...form.permissoes, [permissao.chave]: e.target.checked } })}
                    className="accent-accent"
                  />
                  {permissao.label}
                </label>
              ))}
            </div>
          </fieldset>
          {erro && <p className="text-sm text-accent">{erro}</p>}
          <button className="w-full rounded-lg bg-accent text-paper px-4 py-2.5 font-medium hover:bg-accent-light">Criar usuário</button>
        </form>
        <section>
          <h2 className="font-mono text-xs uppercase tracking-widest text-ink/40 mb-4">Usuários com acesso</h2>
          <div className="border border-ink/10 bg-paper/70 rounded-2xl divide-y divide-ink/10 overflow-hidden">
            {usuarios.map((usuario) => <div key={usuario.id} className="px-4 sm:px-5 py-4 flex flex-wrap items-center justify-between gap-4"><div><p className="font-medium">{usuario.nome}</p><p className="text-sm text-ink/50">{usuario.email}</p><p className="font-mono text-[10px] uppercase tracking-wide text-ink/40 mt-1">{usuario.ativo ? "Ativo" : "Desativado"}</p></div><div className="flex flex-wrap items-center justify-end gap-2"><select value={usuario.perfil} onChange={(e) => mudarPerfil(usuario, e.target.value)} className="rounded-lg border border-ink/15 bg-white/40 px-2 py-2 text-sm">{PERFIS.map((p) => <option key={p.valor} value={p.valor}>{p.label}</option>)}</select><button onClick={() => alternarAtivo(usuario)} title={usuario.ativo ? "Desativar usuário" : "Reativar usuário"} className="p-2 rounded-lg border border-ink/15 hover:bg-ink/5"><UserRoundX className="w-4 h-4" /></button></div><div className="w-full flex flex-wrap gap-x-4 gap-y-2 border-t border-ink/10 pt-3"><span className="w-full font-mono text-[10px] uppercase tracking-wide text-ink/40">Autorizações</span>{PERMISSOES.map((permissao) => <label key={permissao.chave} className="flex items-center gap-2 text-xs text-ink/65"><input type="checkbox" checked={usuario.permissoes[permissao.chave]} onChange={async (e) => { await fetch(`/api/admin/usuarios/${usuario.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ permissoes: { ...usuario.permissoes, [permissao.chave]: e.target.checked } }) }); carregarUsuarios(); }} className="accent-accent" />{permissao.label}</label>)}</div></div>)}
          </div>
        </section>
      </div>
    </div>
  );
}
