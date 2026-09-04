"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, Ellipsis, FileText, FilterX, FolderOpen, Gavel, Landmark, Search, ShieldCheck } from "lucide-react";
import { Processo } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";

const FILTROS = [
  { valor: "todos", label: "Todos" }, { valor: "urgente", label: "Urgentes" },
  { valor: "em_andamento", label: "Em andamento" }, { valor: "aguardando", label: "Aguardando" },
  { valor: "arquivado", label: "Arquivados" }, { valor: "bloqueio", label: "Bloqueio judicial" },
];

function diasAteVencimento(dataISO: string | null) {
  if (!dataISO) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return Math.round((new Date(dataISO).getTime() - hoje.getTime()) / 86400000);
}
function formatarData(dataISO: string | null) { return dataISO ? new Intl.DateTimeFormat("pt-BR").format(new Date(dataISO)) : "—"; }
function tipoIcone(tipo: string | null) {
  const valor = (tipo ?? "").toLocaleLowerCase();
  if (valor.includes("ambiental")) return Landmark;
  if (valor.includes("fiscal")) return Gavel;
  if (valor.includes("sanit")) return ShieldCheck;
  return FileText;
}
function renderTipoIcone(tipo: string | null) {
  const Icone = tipoIcone(tipo);
  if (Icone === Landmark) return <Landmark aria-hidden="true" />;
  if (Icone === Gavel) return <Gavel aria-hidden="true" />;
  if (Icone === ShieldCheck) return <ShieldCheck aria-hidden="true" />;
  return <FileText aria-hidden="true" />;
}
function FiltroSelect({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="process-filter"><span>{label}</span><select defaultValue="todos">{children}</select><ChevronDown aria-hidden="true" /></label>;
}

function ProcessoLinha({ processo }: { processo: Processo }) {
  const dias = diasAteVencimento(processo.prazoVencimento);
  const vencido = dias !== null && dias < 0;
  const atualizado = new Date(processo.criadoEm);
  return <div className="process-row">
    <div className="process-main-cell"><span className="process-file-icon"><FolderOpen aria-hidden="true" /></span><div className="min-w-0"><p className="process-number">{processo.numeroProcesso ?? "Número não identificado"}</p><p className="process-parties">{processo.partes ?? processo.nomeArquivo}</p><p className="process-meta">{processo.tipoAcao ?? "Tipo não identificado"} · {processo.varaComarca ?? "Vara não identificada"}</p></div></div>
    <div className="process-type">{renderTipoIcone(processo.tipoAcao)}<span>{processo.tipoAcao ?? "Não identificado"}</span></div>
    <div><StatusBadge status={vencido ? "vencido" : processo.status} /></div>
    <div className={`process-deadline ${vencido ? "is-overdue" : ""}`}>{processo.prazoVencimento ? <><span><CalendarDays aria-hidden="true" />{formatarData(processo.prazoVencimento)}</span><small>{vencido ? `${Math.abs(dias ?? 0)} dias atrasado` : dias === 0 ? "vence hoje" : `em ${dias} dias`}</small></> : "—"}</div>
    <div className="process-responsible">—</div>
    <div className="process-updated"><span><Clock3 aria-hidden="true" />{formatarData(processo.criadoEm)}</span><small>{new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(atualizado)}</small></div>
    <div className="process-actions"><Link href={`/processos/${processo.id}`}>Ver</Link><button type="button" aria-label={`Mais ações para ${processo.numeroProcesso ?? "este processo"}`}><Ellipsis aria-hidden="true" /></button></div>
  </div>;
}

function ListaProcessosConteudo() {
  const router = useRouter(); const parametros = useSearchParams();
  const [processos, setProcessos] = useState<Processo[]>([]); const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState(""); const [ordenacao, setOrdenacao] = useState("recentes");
  const filtro = parametros.get("filtro") ?? "todos";
  useEffect(() => { fetch("/api/processos").then(async (r) => { if (r.status === 401) { router.replace("/login"); return null; } if (!r.ok) throw new Error(); return r.json(); }).then((dados) => { if (Array.isArray(dados)) setProcessos(dados); setCarregando(false); }).catch(() => setCarregando(false)); }, [router]);
  const filtrados = useMemo(() => { const termo = busca.trim().toLocaleLowerCase(); return processos.filter((p) => { const status = filtro === "todos" ? true : filtro === "bloqueio" ? p.bloqueioJudicial?.identificado === "sim" : p.status === filtro; const texto = [p.numeroProcesso, p.partes, p.nomeArquivo, p.tipoAcao, p.varaComarca].filter(Boolean).join(" ").toLocaleLowerCase(); return status && (!termo || texto.includes(termo)); }).sort((a, b) => ordenacao === "prazo" ? (a.prazoVencimento ?? "9999-12-31").localeCompare(b.prazoVencimento ?? "9999-12-31") : ordenacao === "nome" ? (a.partes ?? a.nomeArquivo ?? "").localeCompare(b.partes ?? b.nomeArquivo ?? "", "pt-BR") : new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()); }, [busca, filtro, ordenacao, processos]);
  function selecionarFiltro(valor: string) { router.push(valor === "todos" ? "/processos" : `/processos?filtro=${valor}`); }
  const contar = (valor: string) => processos.filter((p) => valor === "todos" ? true : valor === "bloqueio" ? p.bloqueioJudicial?.identificado === "sim" : p.status === valor).length;

  return <div className="process-page">
    <header className="process-header"><div><p className="eyebrow">Acompanhamento</p><h1>Processos</h1><p className="result-count">{processos.length} {processos.length === 1 ? "processo encontrado" : "processos encontrados"}.</p></div><div className="header-actions"><div className="header-account"><button type="button" aria-label="Notificações" className="notification"><Bell aria-hidden="true" /><b>3</b></button><span className="account-avatar">A</span></div><Link href="/" className="new-process"><span>+</span> Novo processo</Link></div></header>
    <section className="filters-panel" aria-label="Filtros de processos"><label className="search-field"><Search aria-hidden="true" /><span className="sr-only">Buscar processo</span><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por número, parte, tipo ou comarca" /></label><FiltroSelect label="Período"><option value="todos">Todos</option><option value="mes">Este mês</option></FiltroSelect><FiltroSelect label="Tipo"><option value="todos">Todos</option></FiltroSelect><FiltroSelect label="Responsável"><option value="todos">Todos</option></FiltroSelect><FiltroSelect label="Comarca"><option value="todos">Todas</option></FiltroSelect><button type="button" className="clear-filters" onClick={() => { setBusca(""); selecionarFiltro("todos"); }}><FilterX aria-hidden="true" /> Limpar filtros</button></section>
    <div className="status-toolbar"><div className="status-tabs">{FILTROS.map((f) => <button key={f.valor} type="button" onClick={() => selecionarFiltro(f.valor)} className={`status-tab status-${f.valor} ${filtro === f.valor ? "is-selected" : ""}`}><span>{f.label}</span><b>{filtro === f.valor ? filtrados.length : contar(f.valor)}</b></button>)}</div><label className="sort-field"><span>Ordenar por:</span><select value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)}><option value="recentes">Mais recentes</option><option value="prazo">Próximo prazo</option><option value="nome">Nome das partes</option></select><ChevronDown aria-hidden="true" /></label></div>
    {carregando ? <p className="loading-state">Carregando...</p> : filtrados.length === 0 ? <div className="empty-state"><FolderOpen aria-hidden="true" /><p>{busca || filtro !== "todos" ? "Nenhum processo corresponde aos filtros." : "Nenhum processo encontrado."} <Link href="/">Anexe o primeiro</Link>.</p></div> : <section className="process-table" aria-label="Lista de processos"><div className="process-table-head"><span>Processo</span><span>Tipo</span><span>Status</span><span>Prazo</span><span>Responsável</span><span>Última atualização</span><span>Ação</span></div>{filtrados.map((processo) => <ProcessoLinha key={processo.id} processo={processo} />)}<footer className="table-footer"><span>Mostrando 1–{filtrados.length} de {processos.length} processos</span><div className="pagination"><label>Itens por página <select defaultValue="20"><option>20</option></select><ChevronDown aria-hidden="true" /></label><button type="button" disabled><ChevronLeft aria-hidden="true" /> Anterior</button><button type="button" className="current-page">1</button><button type="button">2</button><button type="button">3</button><button type="button">4</button><button type="button">5</button><button type="button">Próxima <ChevronRight aria-hidden="true" /></button></div></footer></section>}
  </div>;
}
export default function ListaProcessos() { return <Suspense fallback={<div className="process-page"><p className="loading-state">Carregando...</p></div>}><ListaProcessosConteudo /></Suspense>; }
