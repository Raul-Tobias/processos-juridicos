"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { AlertTriangle, ArrowUpRight, Clock3, FileCheck2, Search, SlidersHorizontal } from "lucide-react";
import { Processo } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";

const CORES_STATUS: Record<string, string> = {
  em_andamento: "#1c2431",
  urgente: "#7a2e33",
  aguardando: "#a4823f",
  arquivado: "#1c243133",
};

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
    <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 pt-8 sm:pt-10 pb-16">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-2">
        Dashboard
      </p>
      <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-[-0.02em] mb-2">
        Dashboard
      </h1>
      <p className="text-ink/50 mb-7">
        Visão geral dos processos analisados.
      </p>

      <section className="border border-ink/10 bg-white/35 rounded-xl p-4 mb-7">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="w-4 h-4 text-accent" strokeWidth={1.8} />
          <h2 className="font-mono text-xs uppercase tracking-widest text-ink/50">Filtros</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="text-xs text-ink/55">Período
            <select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)} className="mt-1 w-full rounded-lg border border-ink/15 bg-paper/70 px-3 py-2 text-sm text-ink outline-none focus:border-accent/50">
              <option value="todos">Todos</option><option value="mes">Este mês</option>
            </select>
          </label>
          <label className="text-xs text-ink/55">Status
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-ink/15 bg-paper/70 px-3 py-2 text-sm text-ink outline-none focus:border-accent/50">
              <option value="todos">Todos</option>
              <option value="em_andamento">Em andamento</option>
              <option value="urgente">Urgente</option>
              <option value="aguardando">Aguardando</option>
              <option value="arquivado">Arquivado</option>
            </select>
          </label>
          <label className="text-xs text-ink/55">Responsável
            <select disabled className="mt-1 w-full rounded-lg border border-ink/15 bg-paper/70 px-3 py-2 text-sm text-ink/50 outline-none"><option>Todos</option></select>
          </label>
          <label className="text-xs text-ink/55">Tipo
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="mt-1 w-full rounded-lg border border-ink/15 bg-paper/70 px-3 py-2 text-sm text-ink outline-none focus:border-accent/50">
              <option value="todos">Todos</option>
              {tiposDisponiveis.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
          </label>
          <label className="relative text-xs text-ink/55">Buscar processo
            <Search className="absolute left-3 bottom-2.5 w-4 h-4 text-ink/35" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar processo" className="mt-1 w-full rounded-lg border border-ink/15 bg-paper/70 py-2 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-accent/50" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-xs text-ink/55">Bloqueio judicial
            <select value={filtroBloqueio} onChange={(e) => setFiltroBloqueio(e.target.value)} className="ml-2 rounded-lg border border-ink/15 bg-paper/70 px-3 py-2 text-sm text-ink outline-none focus:border-accent/50">
              <option value="todos">Todos</option>
              <option value="sim">Identificado</option>
              <option value="nao">Não identificado</option>
            </select>
          </label>
          <button onClick={() => { setFiltroPeriodo("todos"); setFiltroStatus("todos"); setFiltroBloqueio("todos"); setFiltroTipo("todos"); setBusca(""); }} className="font-mono text-[10px] uppercase tracking-wide text-accent hover:text-accent-light">Limpar filtros</button>
        </div>
      </section>

      <section className="mb-9">
        <h2 className="font-mono text-xs uppercase tracking-widest text-ink/40 mb-4">Indicadores</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-paper/70 px-4 py-4">
          <FileCheck2 className="w-5 h-5 text-ink/45 mt-0.5" />
          <div>
            <p className="font-serif text-2xl font-semibold">{processosAtivos}</p>
            <p className="text-sm text-ink/55">processos ativos</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-gold/25 bg-gold/5 px-4 py-4">
          <Clock3 className="w-5 h-5 text-gold mt-0.5" />
          <div>
            <p className="font-serif text-2xl font-semibold text-gold">{prazosProximos}</p>
            <p className="text-sm text-ink/55">prazos nos próximos 7 dias</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent/5 px-4 py-4">
          <AlertTriangle className="w-5 h-5 text-accent mt-0.5" />
          <div>
            <p className="font-serif text-2xl font-semibold text-accent">{prazosVencidos}</p>
            <p className="text-sm text-ink/55">prazos que exigem atenção</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent/5 px-4 py-4">
          <AlertTriangle className="w-5 h-5 text-accent mt-0.5" />
          <div>
            <p className="font-serif text-2xl font-semibold text-accent">{atencao.length}</p>
            <p className="text-sm text-ink/55">exigem atenção</p>
          </div>
        </div>
      </div>
      </section>

      <section className="mb-9">
        <h2 className="font-mono text-xs uppercase tracking-widest text-ink/40 mb-5">Visão operacional</h2>
        <div className="grid lg:grid-cols-3 gap-4">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-ink/40 mb-4">
            Status dos processos
          </h2>
          <div className="h-64 border border-ink/10 rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosStatus} layout="vertical" margin={{ left: 8, right: 12 }}>
                <XAxis type="number" allowDecimals={false} fontSize={11} stroke="#1c243155" />
                <YAxis
                  type="category"
                  dataKey="status"
                  width={90}
                  fontSize={11}
                  stroke="#1c243155"
                  tickFormatter={(status) => LABEL_STATUS[status]}
                />
                <Tooltip
                  formatter={(valor) => [valor, "Processos"]}
                  contentStyle={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    borderRadius: 8,
                    border: "1px solid #1c243120",
                  }}
                />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {dadosStatus.map((d) => (
                    <Cell key={d.status} fill={CORES_STATUS[d.status]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-ink/40 mb-4">
            Prazos mais críticos
          </h2>
          <div className="border border-ink/10 rounded-xl divide-y divide-ink/10 overflow-hidden">
            {prazosCriticos.length === 0 ? (
              <p className="px-4 py-8 text-sm text-ink/45">Nenhum prazo vencido.</p>
            ) : (
              prazosCriticos.map((p) => (
                <Link
                  key={p.id}
                  href={`/processos/${p.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-ink/[0.03] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {p.numeroProcesso ?? p.partes ?? p.nomeArquivo}
                    </p>
                    <p className="text-xs text-ink/45 truncate mt-0.5">
                      {p.partes ?? "Processo sem partes identificadas"}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 shrink-0 font-mono text-xs text-accent font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {Math.abs(p.dias ?? 0)} dias atrasado
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-ink/40 mb-4">
            Atenção necessária
          </h2>
          <div className="border border-ink/10 rounded-xl divide-y divide-ink/10 overflow-hidden">
            <Link href="/processos?filtro=urgente" className="flex items-center justify-between gap-3 px-4 py-4 hover:bg-ink/[0.03] transition-colors">
              <div>
                <p className="font-medium text-sm">Processos urgentes</p>
                <p className="text-xs text-ink/45 mt-1">Requerem prioridade máxima</p>
              </div>
              <span className="font-serif text-2xl text-ink/65">{processosFiltrados.filter((p) => p.status === "urgente").length}</span>
            </Link>
            <Link href="/dashboard" className="flex items-center justify-between gap-3 px-4 py-4 hover:bg-ink/[0.03] transition-colors">
              <div>
                <p className="font-medium text-sm">Processos com prazo vencido</p>
                <p className="text-xs text-ink/45 mt-1">Requerem atenção imediata</p>
              </div>
              <span className="font-serif text-2xl text-accent">{prazosVencidos}</span>
            </Link>
            <Link href="/dashboard" className="flex items-center justify-between gap-3 px-4 py-4 hover:bg-ink/[0.03] transition-colors">
              <div>
                <p className="font-medium text-sm">Prazos nos próximos 7 dias</p>
                <p className="text-xs text-ink/45 mt-1">Acompanhe os próximos prazos</p>
              </div>
              <span className="font-serif text-2xl text-gold">{prazosProximos}</span>
            </Link>
          </div>
        </div>
      </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="font-mono text-xs uppercase tracking-widest text-ink/40">
            Processos recentes
          </h2>
          <Link
            href="/processos"
            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-light"
          >
            Ver todos
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="border border-ink/10 bg-paper/70 rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead className="border-b border-ink/10 bg-ink/[0.03]">
              <tr className="font-mono text-[10px] uppercase tracking-widest text-ink/40">
                <th className="px-4 sm:px-5 py-3 font-normal">Processo</th>
                <th className="px-4 py-3 font-normal">Tipo de ação</th>
                <th className="px-4 py-3 font-normal">Prazo</th>
                <th className="px-4 py-3 font-normal">Responsável</th>
                <th className="px-4 py-3 font-normal">Atualização</th>
                <th className="px-4 sm:px-5 py-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
          {recentes.map((p) => (
            <tr
              key={p.id}
              className="hover:bg-white/40 transition-colors"
            >
              <td className="px-4 sm:px-5 py-4">
                <Link href={`/processos/${p.id}`} className="font-medium hover:text-accent">{p.partes ?? p.nomeArquivo}</Link>
                <p className="text-xs text-ink/45 truncate mt-0.5">{p.numeroProcesso ?? "Número não identificado"}</p>
              </td>
              <td className="px-4 py-4 text-sm text-ink/55">{p.tipoAcao ?? "Não identificado"}</td>
              <td className={`px-4 py-4 font-mono text-[11px] ${p.prazoVencimento && diasAteVencimento(p.prazoVencimento)! < 0 ? "text-accent" : "text-ink/40"}`}>
                {p.prazoVencimento ?? "-"}
              </td>
              <td className="px-4 py-4 text-sm text-ink/40">-</td>
              <td className="px-4 py-4 font-mono text-[11px] text-ink/40">{new Date(p.criadoEm).toLocaleDateString("pt-BR")}</td>
              <td className="px-4 sm:px-5 py-4"><StatusBadge status={p.status} /></td>
            </tr>
          ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
