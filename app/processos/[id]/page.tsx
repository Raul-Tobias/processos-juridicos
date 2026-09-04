"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Processo, Pedido } from "@/lib/db";
import type { BloqueioJudicial } from "@/lib/analisarComIA";
import StatusBadge from "@/components/StatusBadge";
import {
  ArrowLeft,
  Archive,
  Trash2,
  ArchiveRestore,
  CircleAlert,
  FileText,
  Eye,
} from "lucide-react";

const CAMPOS: {
  chave: Exclude<keyof Processo, "bloqueioJudicial" | "observacoes" | "pedidos">;
  label: string;
}[] = [
  { chave: "numeroProcesso", label: "Número do processo" },
  { chave: "partes", label: "Partes" },
  { chave: "varaComarca", label: "Vara / Comarca" },
  { chave: "tipoAcao", label: "Tipo de ação" },
  { chave: "valorCausa", label: "Valor da causa" },
  { chave: "objetoCausa", label: "Objeto da causa" },
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

  const camposDados = CAMPOS.filter(({ chave }) => chave !== "numeroProcesso");
  const bloqueioIdentificado = processo.bloqueioJudicial?.identificado === "sim";

  return (
    <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-10 pb-24">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[11px] font-medium text-ink/45 mb-7">
        <Link href="/processos" className="inline-flex items-center gap-1 hover:text-accent transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Processos
        </Link>
        <span aria-hidden="true" className="text-ink/25">/</span>
        <span>Detalhes</span>
      </nav>

      <header className="border-b border-[#dedad0] pb-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <h1 className="max-w-4xl font-serif text-[28px] sm:text-[38px] font-semibold leading-[1.13] tracking-[-0.02em] text-ink">
            {processo.partes ?? processo.nomeArquivo}
          </h1>
          <div className="shrink-0 sm:pt-1"><StatusBadge status={processo.status} /></div>
        </div>
        <p className="mt-3 font-mono text-xs text-ink/50">
          {processo.numeroProcesso ?? "Número não identificado"}
        </p>
      </header>

      <section aria-label="Resumo do processo" className="grid grid-cols-1 min-[540px]:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <ResumoItem label="Status"><StatusBadge status={processo.status} /></ResumoItem>
        <ResumoItem label="Próximo prazo" value={processo.prazoVencimento} />
        <ResumoItem label="Tipo de ação" value={processo.tipoAcao} />
        <ResumoItem label="Valor da causa" value={processo.valorCausa} />
        <ResumoItem label="Objeto da causa" value={processo.objetoCausa} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-7">
        <div className="lg:col-span-8 space-y-6">
          <section className="border border-[#e3ded6] rounded-lg bg-white shadow-[0_5px_20px_#5f473008] px-5 sm:px-7 py-6">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-accent mb-3">Resumo da fiscalização</p>
            <p className="border-l-2 border-accent/55 pl-4 sm:pl-5 max-w-3xl text-[15px] leading-7 text-ink/80 whitespace-pre-wrap">
              {processo.resumo ?? <span className="text-ink/35">Não identificado</span>}
            </p>
          </section>

          <section className="border border-[#e3ded6] rounded-lg bg-white shadow-[0_5px_20px_#5f473008] overflow-hidden">
            <div className="px-5 sm:px-7 py-5 border-b border-[#eee9e4]">
              <h2 className="font-serif text-[22px] font-semibold text-ink">Dados do processo</h2>
            </div>
            {editando ? (
              <div className="divide-y divide-[#eee9e4]">
                {CAMPOS.map(({ chave, label }) => (
                  <label key={chave} className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-2 sm:gap-5 px-5 sm:px-7 py-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink/45 sm:pt-2.5">{label}</span>
                    {chave === "objetoCausa" ? <textarea value={formulario[chave] ?? ""} onChange={(e) => setFormulario({ ...formulario, [chave]: e.target.value })} rows={3} className="rounded-md border border-[#dcd5cd] bg-[#fdfcfa] px-3 py-2 text-sm text-ink outline-none focus:border-accent/50 resize-y" /> : <input value={formulario[chave] ?? ""} onChange={(e) => setFormulario({ ...formulario, [chave]: e.target.value })} type={chave === "prazoVencimento" ? "date" : "text"} className="rounded-md border border-[#dcd5cd] bg-[#fdfcfa] px-3 py-2 text-sm text-ink outline-none focus:border-accent/50" />}
                  </label>
                ))}
                <label className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-2 sm:gap-5 px-5 sm:px-7 py-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink/45 sm:pt-2.5">Observações</span>
                  <textarea value={formulario.observacoes ?? ""} onChange={(e) => setFormulario({ ...formulario, observacoes: e.target.value })} rows={4} className="rounded-md border border-[#dcd5cd] bg-[#fdfcfa] px-3 py-2 text-sm text-ink outline-none focus:border-accent/50 resize-y" placeholder="Anotações internas sobre este processo" />
                </label>
              </div>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#eee9e4]">
                {camposDados.map(({ chave, label }, index) => (
                  <div key={chave} className={`px-5 sm:px-7 py-5 ${index > 1 ? "sm:border-t border-[#eee9e4]" : ""}`}>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink/45 mb-2">{label}</dt>
                    <dd className="text-[15px] leading-6 font-medium text-ink/85">{processo[chave] ?? <span className="font-normal text-ink/35">Não identificado</span>}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          {!editando && processo.observacoes && (
            <section className="border border-[#ddd2bd] rounded-lg bg-[#fcfaf5] px-5 sm:px-7 py-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#896d32] mb-2">Observações</p>
              <p className="text-sm leading-6 text-ink/75 whitespace-pre-wrap">{processo.observacoes}</p>
            </section>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <DosPedidosCard pedidos={processo.pedidos ?? []} valorCausa={processo.valorCausa} />

          <section className="border border-[#d9cbbd] border-t-[3px] border-t-[#a4823f] rounded-lg bg-[#fffdf9] overflow-hidden shadow-[0_5px_20px_#5f473008]">
            <div className="px-5 py-5 border-b border-[#ebe3d9]">
              <h2 className="font-serif text-[21px] font-semibold">Bloqueio judicial</h2>
              <p className="text-xs leading-5 text-ink/55 mt-1">Informações identificadas no documento enviado</p>
            </div>
            {bloqueioIdentificado ? (
              <dl className="divide-y divide-[#eee8df]">
                <LinhaBloqueio label="Identificado">{rotuloIdentificacao(processo.bloqueioJudicial?.identificado ?? "nao_identificado")}</LinhaBloqueio>
                <LinhaBloqueio label="Valor bloqueado">{processo.bloqueioJudicial?.valor}</LinhaBloqueio>
                <LinhaBloqueio label="Data do bloqueio">{processo.bloqueioJudicial?.data}</LinhaBloqueio>
                <LinhaBloqueio label="Contas / instituições">{processo.bloqueioJudicial?.contas.length ? processo.bloqueioJudicial.contas.join("; ") : null}</LinhaBloqueio>
                <LinhaBloqueio label="Pedido de desbloqueio">{rotuloIdentificacao(processo.bloqueioJudicial?.manifestacaoDesbloqueio.identificada ?? "nao_identificado")}</LinhaBloqueio>
                <LinhaBloqueio label="Detalhes da manifestação">{processo.bloqueioJudicial?.manifestacaoDesbloqueio.detalhes}</LinhaBloqueio>
                <LinhaBloqueio label="Data da manifestação">{processo.bloqueioJudicial?.manifestacaoDesbloqueio.data}</LinhaBloqueio>
              </dl>
            ) : (
              <div className="px-5 py-6">
                <p className="text-sm font-medium text-ink/75">Não há bloqueio judicial identificado</p>
                <p className="text-xs leading-5 text-ink/45 mt-1">A análise do documento não apontou medidas de bloqueio.</p>
              </div>
            )}
          </section>

          <section className="border border-[#e3ded6] rounded-lg bg-white px-5 py-5 shadow-[0_5px_20px_#5f473008]">
            <h2 className="font-serif text-[21px] font-semibold mb-4">Documento original</h2>
            <div className="flex gap-3">
              <span className="grid place-items-center shrink-0 w-9 h-10 rounded-md border border-[#ded8cf] bg-[#faf8f4] text-accent"><FileText className="w-4 h-4" /></span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink/85 break-words">{processo.nomeArquivo ?? "Não identificado"}</p>
                <p className="mt-1 text-[11px] leading-4 text-ink/45">Analisado em {new Date(processo.criadoEm).toLocaleString("pt-BR")}</p>
              </div>
            </div>
            <button disabled title="O arquivo original não está disponível para visualização" className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-md border border-[#d8d1c9] px-3 py-2.5 text-xs font-semibold text-ink/35 cursor-not-allowed">
              <Eye className="w-3.5 h-3.5" />
              Visualizar documento
            </button>
          </section>
        </aside>
      </div>

      {mensagem && <p className="mt-5 text-sm text-ink/60">{mensagem}</p>}

      <section className="mt-10 pt-6 border-t border-[#dedad0]">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink/45 mb-3">Ações</p>
        <div className="flex flex-wrap items-center gap-3">
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
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md bg-accent text-paper hover:bg-accent-light transition-colors"
          >
            Editar dados
          </button>
        )}

        {!editando && <>
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
              Sim, excluir
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
            className="sm:ml-auto inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md border border-accent/25 text-accent hover:bg-accent/5 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        )}</>}
        </div>
      </section>
    </div>
  );
}

function ResumoItem({ label, value, children }: { label: string; value?: string | null; children?: React.ReactNode }) {
  return <div className="min-h-[88px] border border-[#e3ded6] rounded-lg bg-white px-4 py-3.5 shadow-[0_3px_14px_#5f473006]">
    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink/45 mb-2">{label}</p>
    {children ?? <p className={`text-[13px] leading-5 font-medium ${value ? "text-ink/80" : "text-ink/35 font-normal"}`}>{value ?? "Não identificado"}</p>}
  </div>;
}

function DosPedidosCard({ pedidos, valorCausa }: { pedidos: Pedido[]; valorCausa: string | null }) {
  const [expandido, setExpandido] = useState(false);
  const pedidosOrdenados = [...pedidos].sort((a, b) => b.valor - a.valor);
  const pedidosVisiveis = expandido ? pedidosOrdenados : pedidosOrdenados.slice(0, 4);
  const totalVerbas = pedidos
    .filter(({ descricao }) => !descricao.toLocaleLowerCase().includes("dano moral"))
    .reduce((total, pedido) => total + pedido.valor, 0);
  const totalCausa = interpretarValorBRL(valorCausa);

  return (
    <section className="border border-[#e3ded6] rounded-lg bg-white shadow-[0_5px_20px_#5f473008] overflow-hidden">
      <div className="px-5 py-5 border-b border-[#eee9e4]">
        <h2 className="font-serif text-[21px] font-semibold text-ink">Dos pedidos</h2>
        <p className="text-xs leading-5 text-ink/55 mt-1">Verbas identificadas na petição</p>
      </div>

      {pedidosVisiveis.length > 0 ? (
        <div className="px-5 py-2 divide-y divide-[#eee9e4]">
          {pedidosVisiveis.map((pedido, index) => (
            <div key={`${pedido.descricao}-${index}`} className="flex items-baseline justify-between gap-4 py-3">
              <span
                className="min-w-0 flex-1 truncate text-[clamp(11px,2.5vw,13px)] leading-5 text-ink/75"
                title={pedido.descricao}
              >
                {pedido.descricao}
              </span>
              <span className={`shrink-0 text-right text-[13px] font-semibold ${pedido.destaque ? "text-[#b94c26]" : "text-ink/80"}`}>
                {formatarBRL(pedido.valor)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-5 py-6 text-sm text-ink/45">Nenhum pedido identificado.</p>
      )}

      {pedidos.length > 4 && (
        <button
          type="button"
          onClick={() => setExpandido(!expandido)}
          className="mx-5 mb-4 text-xs font-semibold text-accent hover:text-accent-light transition-colors"
        >
          {expandido ? "Recolher pedidos" : "Ver todos os pedidos"}
        </button>
      )}

      <dl className="border-t border-[#eee9e4] px-5">
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="text-xs text-ink/55">Total das verbas</dt>
          <dd className="shrink-0 text-sm font-semibold text-ink/85">{formatarBRL(totalVerbas)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-[#eee9e4] py-3">
          <dt className="text-xs font-semibold text-ink/65">Valor total da causa</dt>
          <dd className="shrink-0 text-sm font-semibold text-ink">{formatarBRL(totalCausa)}</dd>
        </div>
      </dl>
    </section>
  );
}

function formatarBRL(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function interpretarValorBRL(valor: string | null) {
  if (!valor) return 0;
  const numero = Number(valor.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

function rotuloIdentificacao(valor: BloqueioJudicial["identificado"]) {
  return valor === "sim" ? "Sim" : valor === "nao" ? "Não" : "Não identificado";
}

function LinhaBloqueio({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-3.5">
      <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink/45 mb-1">
        {label}
      </dt>
      <dd className="text-sm leading-5 text-ink/80">
        {children || <span className="text-ink/30">Não identificado</span>}
      </dd>
    </div>
  );
}