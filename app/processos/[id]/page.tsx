"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Processo } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";
import {
  ArrowLeft,
  Archive,
  Trash2,
  ArchiveRestore,
  CircleAlert,
} from "lucide-react";

const CAMPOS: { chave: keyof Processo; label: string }[] = [
  { chave: "numeroProcesso", label: "Número do processo" },
  { chave: "partes", label: "Partes" },
  { chave: "varaComarca", label: "Vara / Comarca" },
  { chave: "tipoAcao", label: "Tipo de ação" },
  { chave: "valorCausa", label: "Valor da causa" },
  { chave: "prazoVencimento", label: "Próximo prazo" },
  { chave: "andamentoAtual", label: "Andamento atual" },
];

export default function DetalheProcesso() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/processos/${id}`)
      .then((r) => {
        if (r.status === 401) {
          router.replace("/login");
          throw new Error();
        }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((dados) => {
        setProcesso(dados);
        setFormulario(
          Object.fromEntries(
            [
              ...CAMPOS.map(({ chave }) => [chave, dados[chave] ?? ""]),
              ["observacoes", dados.observacoes ?? ""],
            ]
          )
        );
        setCarregando(false);
      })
      .catch(() => {
        setErro(true);
        setCarregando(false);
      });
  }, [id, router]);

  if (carregando) {
    return (
      <div className="max-w-3xl mx-auto px-6 pt-14">
        <p className="text-ink/40 font-mono text-sm">Carregando…</p>
      </div>
    );
  }

  if (erro || !processo) {
    return (
      <div className="max-w-3xl mx-auto px-6 pt-14">
        <p className="text-ink/60">Processo não encontrado.</p>
        <Link href="/processos" className="text-accent underline text-sm">
          Voltar para a lista
        </Link>
      </div>
    );
  }

  async function alternarArquivamento() {
    if (!processo) return;
    setProcessando(true);
    const novoStatus =
      processo.status === "arquivado" ? "em_andamento" : "arquivado";
    try {
      const resp = await fetch(`/api/processos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (resp.ok) {
        setProcesso({ ...processo, status: novoStatus });
      }
    } finally {
      setProcessando(false);
    }
  }

  async function alternarUrgencia() {
    if (!processo) return;
    setProcessando(true);
    const novoStatus =
      processo.status === "urgente" ? "em_andamento" : "urgente";
    try {
      const resp = await fetch(`/api/processos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (resp.ok) {
        setProcesso({ ...processo, status: novoStatus });
      }
    } finally {
      setProcessando(false);
    }
  }

  async function deletarProcessoAtual() {
    setProcessando(true);
    try {
      const resp = await fetch(`/api/processos/${id}`, {
        method: "DELETE",
      });
      if (resp.ok) {
        router.push("/processos");
      }
    } finally {
      setProcessando(false);
    }
  }

  async function salvarDados() {
    if (!processo) return;
    setSalvando(true);
    setMensagem(null);
    try {
      const resp = await fetch(`/api/processos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formulario,
          observacoes: formulario.observacoes ?? "",
        }),
      });
      if (!resp.ok) throw new Error();
      const atualizado = await resp.json();
      setProcesso({ ...processo, ...atualizado });
      setEditando(false);
      setMensagem("Alterações salvas.");
    } catch {
      setMensagem("Não foi possível salvar as alterações.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-6 pt-9 sm:pt-10 pb-24">
      <Link
        href="/processos"
        className="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Processos
      </Link>

      <div className="flex items-start justify-between gap-4 mb-3">
        <h1 className="font-serif text-2xl sm:text-4xl font-semibold leading-tight tracking-[-0.02em]">
          {processo.partes ?? processo.nomeArquivo}
        </h1>
        <div className="shrink-0 mt-1">
          <StatusBadge status={processo.status} />
        </div>
      </div>
      <p className="font-mono text-sm text-ink/50 mb-10">
        {processo.numeroProcesso ?? "Número não identificado"}
      </p>

      {processo.resumo && (
        <p className="text-ink/80 leading-relaxed mb-10 border-l-2 border-accent/40 pl-4">
          {processo.resumo}
        </p>
      )}

      {editando ? (
        <div className="border border-ink/10 bg-paper/70 rounded-2xl divide-y divide-ink/10 overflow-hidden shadow-[0_12px_30px_#1c243108]">
          {CAMPOS.map(({ chave, label }) => (
            <label
              key={chave}
              className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 px-5 py-3.5"
            >
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink/40 sm:pt-2">
                {label}
              </span>
              <input
                value={formulario[chave] ?? ""}
                onChange={(e) =>
                  setFormulario({ ...formulario, [chave]: e.target.value })
                }
                type={chave === "prazoVencimento" ? "date" : "text"}
                className="sm:col-span-2 rounded-lg border border-ink/15 bg-white/40 px-3 py-2 text-sm outline-none focus:border-accent/50"
              />
            </label>
          ))}
          <label className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 px-5 py-3.5">
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink/40 sm:pt-2">
              Observações
            </span>
            <textarea
              value={formulario.observacoes ?? ""}
              onChange={(e) =>
                setFormulario({ ...formulario, observacoes: e.target.value })
              }
              rows={4}
              className="sm:col-span-2 rounded-lg border border-ink/15 bg-white/40 px-3 py-2 text-sm outline-none focus:border-accent/50 resize-y"
              placeholder="Anotações internas sobre este processo"
            />
          </label>
        </div>
      ) : (
        <dl className="border border-ink/10 bg-paper/70 rounded-2xl divide-y divide-ink/10 overflow-hidden shadow-[0_12px_30px_#1c243108]">
          {CAMPOS.map(({ chave, label }) => (
          <div
            key={chave}
            className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 px-5 py-3.5"
          >
            <dt className="font-mono text-[11px] uppercase tracking-wide text-ink/40 sm:pt-0.5">
              {label}
            </dt>
            <dd className="sm:col-span-2 text-ink/85">
              {processo[chave] ?? (
                <span className="text-ink/30">Não identificado</span>
              )}
            </dd>
          </div>
          ))}
        </dl>
      )}

      {!editando && processo.observacoes && (
        <div className="mt-5 rounded-2xl border border-gold/20 bg-gold/5 px-5 py-4">
          <p className="font-mono text-[11px] uppercase tracking-wide text-gold mb-2">
            Observações
          </p>
          <p className="text-sm text-ink/75 whitespace-pre-wrap">{processo.observacoes}</p>
        </div>
      )}

      {mensagem && <p className="mt-4 text-sm text-ink/60">{mensagem}</p>}

      <p className="font-mono text-xs text-ink/35 mt-6">
        Arquivo original: {processo.nomeArquivo} · analisado em{" "}
        {new Date(processo.criadoEm).toLocaleString("pt-BR")}
      </p>

      <div className="flex items-center gap-3 mt-10 pt-6 border-t border-ink/10">
        {editando ? (
          <>
            <button
              onClick={salvarDados}
              disabled={salvando}
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-accent text-paper hover:bg-accent-light transition-colors disabled:opacity-40"
            >
              {salvando ? "Salvando…" : "Salvar alterações"}
            </button>
            <button
              onClick={() => {
                setEditando(false);
                setFormulario(
                  Object.fromEntries(
                    [
                      ...CAMPOS.map(({ chave }) => [
                        chave,
                        processo[chave] ?? "",
                      ]),
                      ["observacoes", processo.observacoes ?? ""],
                    ]
                  )
                );
              }}
              disabled={salvando}
              className="text-sm text-ink/50 px-2 hover:text-ink transition-colors"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            onClick={() => {
              setMensagem(null);
              setEditando(true);
            }}
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-ink/15 hover:bg-ink/5 transition-colors"
          >
            Editar dados
          </button>
        )}

        {!editando && (
          <>
        <button
          onClick={alternarUrgencia}
          disabled={processando || processo.status === "arquivado"}
          title={
            processo.status === "urgente"
              ? "Remover marcação de urgente"
              : "Marcar processo como urgente"
          }
          className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-colors disabled:opacity-40 ${
            processo.status === "urgente"
              ? "border-accent/30 bg-accent/10 text-accent hover:bg-accent/15"
              : "border-ink/15 hover:bg-ink/5"
          }`}
        >
          <CircleAlert className="w-4 h-4" />
          {processo.status === "urgente"
            ? "Remover urgência"
            : "Marcar como urgente"}
        </button>

        <button
          onClick={alternarArquivamento}
          disabled={processando}
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-ink/15 hover:bg-ink/5 transition-colors disabled:opacity-40"
        >
          {processo.status === "arquivado" ? (
            <>
              <ArchiveRestore className="w-4 h-4" />
              Desarquivar
            </>
          ) : (
            <>
              <Archive className="w-4 h-4" />
              Arquivar
            </>
          )}
        </button>

        {confirmandoExclusao ? (
          <div className="inline-flex items-center gap-2">
            <span className="text-sm text-ink/60">Tem certeza?</span>
            <button
              onClick={deletarProcessoAtual}
              disabled={processando}
              className="text-sm font-medium px-3 py-2 rounded-lg bg-accent text-paper hover:bg-accent-light transition-colors disabled:opacity-40"
            >
              Sim, deletar
            </button>
            <button
              onClick={() => setConfirmandoExclusao(false)}
              className="text-sm text-ink/50 px-2 hover:text-ink transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmandoExclusao(true)}
            disabled={processando}
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-accent/25 text-accent hover:bg-accent/5 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
            Deletar
          </button>
        )}
          </>
        )}
      </div>
    </div>
  );
}