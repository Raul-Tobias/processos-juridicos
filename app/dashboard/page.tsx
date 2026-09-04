"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, ArrowUpRight, Bell, Clock3, FileCheck2, MoreVertical, Search } from "lucide-react";
import { Processo } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";

const CORES_STATUS: Record<string, string> = { em_andamento: "#182538", urgente: "#7f2d32", aguardando: "#b28a32", arquivado: "#a8a8a5" };

const LABEL_STATUS: Record<string, string> = {
  em_andamento: "Em andamento",
  urgente: "Urgente",
  aguardando: "Aguardando",
  arquivado: "Arquivado",
};

function diasAteVencimento(dataISO: string | null): number | null {
  if (!dataISO) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(dataISO);
  return Math.round((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Dashboard() {
  const router = useRouter();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroBloqueio, setFiltroBloqueio] = useState("todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    fetch("/api/processos")
      .then(async (r) => {
        if (r.status === 401) {
          router.replace("/login");
          return null;
        }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((dados) => {
        if (!Array.isArray(dados)) return;
        setProcessos(dados);
        setCarregando(false);
      })
      .catch(() => setCarregando(false));
  }, [router]);

  const processosFiltrados = useMemo(
    () => processos.filter((p) => {
      const texto = [p.numeroProcesso, p.partes, p.tipoAcao, p.varaComarca].filter(Boolean).join(" ").toLocaleLowerCase();
      const criadoEm = new Date(p.criadoEm);
      const agora = new Date();
      const correspondePeriodo = filtroPeriodo === "todos" || (filtroPeriodo === "mes" && criadoEm.getMonth() === agora.getMonth() && criadoEm.getFullYear() === agora.getFullYear());
      return (filtroStatus === "todos" || p.status === filtroStatus) &&
        (filtroTipo === "todos" || p.tipoAcao === filtroTipo) &&
        correspondePeriodo &&
        (!busca.trim() || texto.includes(busca.trim().toLocaleLowerCase())) &&
        (filtroBloqueio === "todos" || (filtroBloqueio === "sim"
          ? p.bloqueioJudicial?.identificado === "sim"
          : p.bloqueioJudicial?.identificado !== "sim"));
    }),
    [busca, filtroBloqueio, filtroPeriodo, filtroStatus, filtroTipo, processos]
  );

  const tiposDisponiveis = useMemo(
    () => Array.from(new Set(processos.map((p) => p.tipoAcao).filter((tipo): tipo is string => Boolean(tipo)))),
    [processos]
  );

  const dadosStatus = useMemo(() => {
    const ordem = ["aguardando", "em_andamento", "arquivado", "urgente"];
    return ordem.map((status) => ({
      status,
      valor: processosFiltrados.filter((p) => p.status === status).length,
    }));
  }, [processosFiltrados]);

  const prazosCriticos = useMemo(() => {
    return processosFiltrados
      .map((p) => ({ ...p, dias: diasAteVencimento(p.prazoVencimento) }))
      .filter((p) => p.status !== "arquivado" && p.dias !== null && p.dias < 0)
      .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0))
      .slice(0, 8);
  }, [processosFiltrados]);

  const urgentesProximos = useMemo(() => {
    return processosFiltrados
      .map((p) => ({ ...p, dias: diasAteVencimento(p.prazoVencimento) }))
      .filter(
        (p) =>
          p.status !== "arquivado" &&
          p.dias !== null &&
          p.dias >= 0 &&
          p.dias <= 7
      )
      .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0));
  }, [processosFiltrados]);

  const prazosVencidos = useMemo(
    () =>
      processosFiltrados.filter((p) => {
        const dias = diasAteVencimento(p.prazoVencimento);
        return dias !== null && dias < 0 && p.status !== "arquivado";
      }).length,
    [processosFiltrados]
  );

  const prazosProximos = urgentesProximos.length;
  const processosAtivos = processosFiltrados.filter(
    (p) => p.status !== "arquivado"
  ).length;
  const atencao = useMemo(
    () => processosFiltrados
      .map((p) => ({ ...p, dias: diasAteVencimento(p.prazoVencimento) }))
      .filter((p) => p.status !== "arquivado" && p.dias !== null && p.dias <= 7)
      .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0)),
    [processosFiltrados]
  );
  const recentes = useMemo(
    () =>
      [...processosFiltrados]
        .sort(
          (a, b) =>
            new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
        )
        .slice(0, 5),
    [processosFiltrados]
  );
  const totalStatus = dadosStatus.reduce((total, item) => total + item.valor, 0);
  const maiorAtraso = Math.max(...prazosCriticos.map((processo) => Math.abs(processo.dias ?? 0)), 1);

  if (carregando) {
    return (
      <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 pt-10 sm:pt-12">
        <p className="text-ink/40 font-mono text-sm">Carregando…</p>
      </div>
    );
  }

  if (processos.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 pt-10 sm:pt-12">
        <h1 className="font-serif text-3xl font-semibold mb-4">Dashboard</h1>
        <p className="text-ink/50">
          Nenhum processo analisado ainda.{" "}
          <Link href="/" className="text-accent underline">
            Anexe o primeiro
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-7 sm:pt-9 pb-16">
      <header className="flex items-start justify-between gap-5 mb-5">
        <div>
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-accent mb-1.5">Visão operacional</p>
          <h1 className="font-serif text-3xl sm:text-[2.1rem] font-semibold leading-none">Dashboard</h1>
          <p className="text-sm text-ink/55 mt-2">Visão geral dos processos analisados.</p>
        </div>
        <div className="flex items-center gap-4 pt-1">
          <button aria-label="Notificações" className="relative p-2 text-ink/60 hover:text-accent transition-colors">
            <Bell className="w-5 h-5" strokeWidth={1.7} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent border border-paper" />
          </button>
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#eae6dc] font-serif text-sm text-ink">A</span>
        </div>
      </header>

      <section className="border border-[#dedad0] bg-[#fbfaf6] rounded-xl p-4 mb-4 shadow-[0_2px_8px_rgba(23,32,42,0.025)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_1.45fr_auto] gap-3 items-end">
          <label className="text-xs text-ink/55">Período
            <select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)} className="mt-1 w-full rounded-md border border-[#dedad0] bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent/50">
              <option value="todos">Todos</option><option value="mes">Este mês</option>
            </select>
          </label>
          <label className="text-xs text-ink/55">Status
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="mt-1 w-full rounded-md border border-[#dedad0] bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent/50">
              <option value="todos">Todos</option>
              <option value="em_andamento">Em andamento</option>
              <option value="urgente">Urgente</option>
              <option value="aguardando">Aguardando</option>
              <option value="arquivado">Arquivado</option>
            </select>
          </label>
          <label className="text-xs text-ink/55">Responsável
            <select disabled className="mt-1 w-full rounded-md border border-[#dedad0] bg-paper px-3 py-2 text-sm text-ink/50 outline-none"><option>Todos</option></select>
          </label>
          <label className="text-xs text-ink/55">Tipo
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="mt-1 w-full rounded-md border border-[#dedad0] bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent/50">
              <option value="todos">Todos</option>
              {tiposDisponiveis.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
          </label>
          <label className="relative text-xs text-ink/55">&nbsp;
            <Search className="absolute left-3 bottom-2.5 w-4 h-4 text-ink/35" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar processo" className="mt-1 w-full rounded-md border border-[#dedad0] bg-paper py-2 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-accent/50" />
          </label>
          <label className="hidden text-xs text-ink/55">Bloqueio judicial
            <select value={filtroBloqueio} onChange={(e) => setFiltroBloqueio(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="sim">Identificado</option>
              <option value="nao">Não identificado</option>
            </select>
          </label>
          <button onClick={() => { setFiltroPeriodo("todos"); setFiltroStatus("todos"); setFiltroBloqueio("todos"); setFiltroTipo("todos"); setBusca(""); }} className="h-[38px] whitespace-nowrap rounded-md border border-accent/55 px-3 text-xs font-semibold text-accent hover:bg-accent/5">Limpar filtros</button>
        </div>
      </section>

      <section className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="min-h-[124px] rounded-xl border border-[#dedad0] bg-[#fbfaf6] px-4 py-4">
          <FileCheck2 className="w-5 h-5 text-ink/50 mb-2" />
          <p className="font-serif text-3xl font-semibold leading-none">{processosAtivos}</p>
          <p className="text-xs font-semibold mt-1.5">Processos ativos</p><p className="text-[10px] text-ink/55 mt-1">Total de processos em andamento</p>
        </div>
        <div className="min-h-[124px] rounded-xl border border-accent/45 bg-[#fbfaf6] px-4 py-4">
          <AlertTriangle className="w-5 h-5 text-accent mb-2" />
          <p className="font-serif text-3xl font-semibold leading-none text-accent">{prazosVencidos}</p>
          <p className="text-xs font-semibold mt-1.5">Prazos vencidos</p><p className="text-[10px] text-ink/55 mt-1">Requer atenção imediata</p>
          <Link href="/dashboard" className="inline-flex items-center gap-1 mt-2 text-[10px] font-semibold text-accent">Ver processos <ArrowRight className="w-3 h-3" /></Link>
        </div>
        <div className="min-h-[124px] rounded-xl border border-gold/45 bg-[#fbfaf6] px-4 py-4">
          <Clock3 className="w-5 h-5 text-gold mb-2" />
          <p className="font-serif text-3xl font-semibold leading-none text-gold">{prazosProximos}</p>
          <p className="text-xs font-semibold mt-1.5">Prazos próximos (7 dias)</p><p className="text-[10px] text-ink/55 mt-1">Acompanhe os próximos prazos</p>
          <Link href="/dashboard" className="inline-flex items-center gap-1 mt-2 text-[10px] font-semibold text-gold">Ver prazos <ArrowRight className="w-3 h-3" /></Link>
        </div>
        <div className="min-h-[124px] rounded-xl border border-[#d77b55]/50 bg-[#fbfaf6] px-4 py-4">
          <AlertTriangle className="w-5 h-5 text-[#b94c26] mb-2" />
          <p className="font-serif text-3xl font-semibold leading-none text-[#b94c26]">{atencao.length}</p>
          <p className="text-xs font-semibold mt-1.5">Exigem atenção</p><p className="text-[10px] text-ink/55 mt-1">Processos que precisam de acompanhamento</p>
          <Link href="/dashboard" className="inline-flex items-center gap-1 mt-2 text-[10px] font-semibold text-[#b94c26]">Ver processos <ArrowRight className="w-3 h-3" /></Link>
        </div>
      </div>
      </section>

      <section className="mb-4 grid lg:grid-cols-[1.05fr_1.35fr_.9fr] gap-3">
        <div className="rounded-xl border border-[#dedad0] bg-[#fbfaf6] p-4">
          <h2 className="text-[10px] font-bold uppercase tracking-wide">Status dos processos</h2>
          <div className="mt-5 space-y-4">
            {dadosStatus.map((item) => {
              const percentual = totalStatus ? (item.valor / totalStatus) * 100 : 0;
              return <div key={item.status} className="grid grid-cols-[64px_1fr_auto] items-center gap-2 text-[10px]">
                <span className="text-ink/65">{LABEL_STATUS[item.status]}</span>
                <span className="h-3 rounded-sm bg-[#eeeae1] overflow-hidden"><span className="block h-full rounded-sm" style={{ width: `${percentual}%`, backgroundColor: CORES_STATUS[item.status] }} /></span>
                <span className="whitespace-nowrap text-ink/65">{item.valor} ({percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)</span>
              </div>;
            })}
          </div>
          <div className="border-t border-[#dedad0] mt-5 pt-3 flex justify-between text-[11px] font-semibold"><span>Total</span><span>{totalStatus}</span></div>
        </div>
        <div className="rounded-xl border border-[#dedad0] bg-[#fbfaf6] p-4">
          <div className="flex justify-between gap-3"><h2 className="text-[10px] font-bold uppercase tracking-wide">Prazos mais críticos</h2><span className="text-[9px] font-bold uppercase tracking-wide text-ink/50">Dias atrasados</span></div>
          <div className="mt-4 divide-y divide-[#e6e1d7]">
            {prazosCriticos.length === 0 ? (
              <p className="px-4 py-8 text-sm text-ink/45">Nenhum prazo vencido.</p>
            ) : (
              prazosCriticos.map((p) => (
                <Link
                  key={p.id}
                  href={`/processos/${p.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(70px,.75fr)_28px] items-center gap-3 py-2.5 hover:bg-ink/[0.03] transition-colors"
                >
                  <p className="text-[11px] font-medium truncate">{p.numeroProcesso ?? p.partes ?? p.nomeArquivo}</p>
                  <span className="h-2 rounded-sm bg-[#eeeae1] overflow-hidden"><span className="block h-full rounded-sm bg-accent" style={{ width: `${(Math.abs(p.dias ?? 0) / maiorAtraso) * 100}%` }} /></span>
                  <span className="text-[10px] font-semibold text-accent text-right">{Math.abs(p.dias ?? 0)}</span>
                </Link>
              ))
            )}
          </div>
        </div>
        <div className="rounded-xl border border-[#dedad0] bg-[#fbfaf6] p-3">
          <h2 className="px-1 text-[10px] font-bold uppercase tracking-wide">Atenção necessária</h2>
          <div className="mt-3 space-y-2">
            <Link href="/dashboard" className="block rounded-lg border border-[#e6e1d7] bg-paper px-3 py-2.5 hover:bg-white transition-colors"><p className="font-serif text-xl leading-none text-accent">{prazosVencidos}</p><p className="text-[10px] font-semibold mt-1">Processos com prazo vencido</p><p className="text-[9px] text-ink/55 mt-0.5">Requer atenção imediata</p><span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-semibold text-accent">Ver processos <ArrowRight className="w-3 h-3" /></span></Link>
            <Link href="/dashboard" className="block rounded-lg border border-[#e6e1d7] bg-paper px-3 py-2.5 hover:bg-white transition-colors"><p className="font-serif text-xl leading-none text-gold">{prazosProximos}</p><p className="text-[10px] font-semibold mt-1">Processos com prazo nos próximos 7 dias</p><p className="text-[9px] text-ink/55 mt-0.5">Acompanhe os próximos prazos</p><span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-semibold text-gold">Ver prazos <ArrowRight className="w-3 h-3" /></span></Link>
            <Link href="/processos?filtro=urgente" className="block rounded-lg border border-[#e6e1d7] bg-paper px-3 py-2.5 hover:bg-white transition-colors"><p className="font-serif text-xl leading-none text-[#182538]">{processosFiltrados.filter((p) => p.status === "urgente").length}</p><p className="text-[10px] font-semibold mt-1">Processos urgentes</p><p className="text-[9px] text-ink/55 mt-0.5">Requerem prioridade máxima</p><span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-semibold text-[#182538]">Ver processos <ArrowRight className="w-3 h-3" /></span></Link>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#dedad0] bg-[#fbfaf6] p-3 sm:p-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-[10px] font-bold uppercase tracking-wide">
            Processos recentes
          </h2>
          <Link
            href="/processos"
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent hover:text-accent-light"
          >
            Ver todos
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="border border-[#dedad0] rounded-lg overflow-x-auto mt-3">
          <table className="w-full min-w-[780px] text-left">
            <thead className="border-b border-[#dedad0] bg-paper">
              <tr className="text-[9px] font-bold uppercase tracking-wide text-ink/50">
                <th className="px-4 sm:px-5 py-3 font-normal">Processo</th>
                <th className="px-4 py-3 font-normal">Tipo</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">Prazo</th>
                <th className="px-4 py-3 font-normal">Responsável</th>
                <th className="px-4 py-3 font-normal">Última atualização</th>
                <th className="px-4 sm:px-5 py-3 font-normal">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
          {recentes.map((p) => (
            <tr
              key={p.id}
              className="hover:bg-paper/60 transition-colors"
            >
              <td className="px-4 sm:px-5 py-4">
                <Link href={`/processos/${p.id}`} className="font-medium hover:text-accent">{p.partes ?? p.nomeArquivo}</Link>
                <p className="text-xs text-ink/45 truncate mt-0.5">{p.numeroProcesso ?? "Número não identificado"}</p>
              </td>
              <td className="px-4 py-4 text-[11px] text-ink/55">{p.tipoAcao ?? "Não identificado"}</td>
              <td className="px-4 py-4"><StatusBadge status={p.status} /></td>
              <td className={`px-4 py-4 text-[10px] font-semibold ${p.prazoVencimento && diasAteVencimento(p.prazoVencimento)! < 0 ? "text-accent" : "text-ink/40"}`}>
                {p.prazoVencimento ?? "-"}
              </td>
              <td className="px-4 py-4 text-[11px] text-ink/40">-</td>
              <td className="px-4 py-4 text-[10px] text-ink/40">{new Date(p.criadoEm).toLocaleDateString("pt-BR")}</td>
              <td className="px-4 sm:px-5 py-4"><Link href={`/processos/${p.id}`} className="inline-flex items-center gap-2 rounded-md border border-[#dedad0] px-2.5 py-1 text-[10px] font-semibold hover:border-accent hover:text-accent">Ver</Link><MoreVertical className="inline-block ml-2 w-4 h-4 text-ink/50 align-middle" /></td>
            </tr>
          ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
