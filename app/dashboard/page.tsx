"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { AlertTriangle, ArrowUpRight, Clock3, FileCheck2 } from "lucide-react";
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

  const dadosStatus = useMemo(() => {
    const contagem: Record<string, number> = {};
    processos.forEach((p) => {
      contagem[p.status] = (contagem[p.status] ?? 0) + 1;
    });
    return Object.entries(contagem).map(([status, valor]) => ({
      status,
      valor,
    }));
  }, [processos]);

  const dadosPrazos = useMemo(() => {
    return processos
      .filter((p) => p.prazoVencimento)
      .map((p) => ({
        nome:
          (p.numeroProcesso ?? p.nomeArquivo ?? "Processo").slice(0, 18) +
          "…",
        dias: diasAteVencimento(p.prazoVencimento),
        id: p.id,
      }))
      .filter((p) => p.dias !== null)
      .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0))
      .slice(0, 8);
  }, [processos]);

  const urgentesProximos = useMemo(() => {
    return processos
      .map((p) => ({ ...p, dias: diasAteVencimento(p.prazoVencimento) }))
      .filter(
        (p) =>
          p.status !== "arquivado" &&
          p.dias !== null &&
          p.dias >= 0 &&
          p.dias <= 7
      )
      .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0));
  }, [processos]);

  const prazosVencidos = useMemo(
    () =>
      processos.filter((p) => {
        const dias = diasAteVencimento(p.prazoVencimento);
        return dias !== null && dias < 0 && p.status !== "arquivado";
      }).length,
    [processos]
  );

  const prazosProximos = urgentesProximos.length;
  const processosAtivos = processos.filter(
    (p) => p.status !== "arquivado"
  ).length;
  const recentes = useMemo(
    () =>
      [...processos]
        .sort(
          (a, b) =>
            new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
        )
        .slice(0, 5),
    [processos]
  );

  if (carregando) {
    return (
      <div className="max-w-5xl mx-auto px-5 sm:px-6 pt-12 sm:pt-14">
        <p className="text-ink/40 font-mono text-sm">Carregando…</p>
      </div>
    );
  }

  if (processos.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-5 sm:px-6 pt-12 sm:pt-14">
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
    <div className="max-w-5xl mx-auto px-5 sm:px-6 pt-12 sm:pt-14 pb-24">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-2">
        Visão operacional
      </p>
      <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-[-0.02em] mb-2">
        Dashboard
      </h1>
      <p className="text-ink/50 mb-10">
        Visão geral dos {processos.length}{" "}
        {processos.length === 1 ? "processo" : "processos"} analisados.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
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
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
        {(["em_andamento", "urgente", "aguardando", "arquivado"] as const).map(
          (status) => {
            const total = processos.filter((p) => p.status === status).length;
            return (
              <div
                key={status}
                className="border border-ink/10 bg-paper/70 rounded-2xl px-4 py-5 shadow-[0_8px_24px_#1c243106]"
              >
                <p className="font-serif text-3xl font-semibold">{total}</p>
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink/40 mt-1">
                  {LABEL_STATUS[status]}
                </p>
              </div>
            );
          }
        )}
        <div className="border border-accent/20 bg-accent/5 rounded-2xl px-4 py-5 shadow-[0_8px_24px_#7a2e3310]">
          <p className="font-serif text-3xl font-semibold text-accent">
            {prazosVencidos}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-wide text-accent/70 mt-1">
            Prazos vencidos
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-8 mb-12">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-ink/40 mb-4">
            Distribuição por status
          </h2>
          <div className="h-64 border border-ink/10 rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosStatus}
                  dataKey="valor"
                  nameKey="status"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {dadosStatus.map((d) => (
                    <Cell key={d.status} fill={CORES_STATUS[d.status]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(valor, _nome, item) => [
                    valor,
                    LABEL_STATUS[item.payload.status as string],
                  ]}
                  contentStyle={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    borderRadius: 8,
                    border: "1px solid #1c243120",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {dadosStatus.map((d) => (
              <div key={d.status} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: CORES_STATUS[d.status] }}
                />
                <span className="text-xs text-ink/60">
                  {LABEL_STATUS[d.status]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-ink/40 mb-4">
            Dias até o prazo vencer
          </h2>
          <div className="h-64 border border-ink/10 rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosPrazos} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" fontSize={11} stroke="#1c243155" />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={110}
                  fontSize={11}
                  stroke="#1c243155"
                />
                <Tooltip
                  formatter={(v) => [`${v} dias`, "Prazo"]}
                  contentStyle={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    borderRadius: 8,
                    border: "1px solid #1c243120",
                  }}
                />
                <Bar dataKey="dias" radius={[0, 4, 4, 0]}>
                  {dadosPrazos.map((d) => (
                    <Cell
                      key={d.id}
                      fill={(d.dias ?? 99) <= 5 ? "#7a2e33" : "#1c2431"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {urgentesProximos.length > 0 && (
        <div className="mb-12">
          <h2 className="font-mono text-xs uppercase tracking-widest text-ink/40 mb-4">
            Vencendo em até 7 dias
          </h2>
          <div className="border border-ink/10 rounded-xl divide-y divide-ink/10 overflow-hidden">
            {urgentesProximos.map((p) => (
              <Link
                key={p.id}
                href={`/processos/${p.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-ink/[0.03] transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {p.partes ?? p.nomeArquivo}
                  </p>
                  <p className="font-mono text-xs text-ink/45 truncate mt-0.5">
                    {p.numeroProcesso ?? "Número não identificado"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`font-mono text-xs ${
                      (p.dias ?? 0) <= 2 ? "text-accent font-medium" : "text-ink/50"
                    }`}
                  >
                    {p.dias === 0 ? "vence hoje" : `${p.dias} dias`}
                  </span>
                  <StatusBadge status={p.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="font-mono text-xs uppercase tracking-widest text-ink/40">
            Analisados recentemente
          </h2>
          <Link
            href="/processos"
            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-light"
          >
            Ver todos
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="border border-ink/10 bg-paper/70 rounded-2xl divide-y divide-ink/10 overflow-hidden">
          {recentes.map((p) => (
            <Link
              key={p.id}
              href={`/processos/${p.id}`}
              className="flex items-center justify-between gap-4 px-4 sm:px-5 py-4 hover:bg-white/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{p.partes ?? p.nomeArquivo}</p>
                <p className="text-xs text-ink/45 truncate mt-0.5">
                  {p.tipoAcao ?? "Tipo de ação não identificado"}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="hidden sm:inline font-mono text-[11px] text-ink/40">
                  {new Date(p.criadoEm).toLocaleDateString("pt-BR")}
                </span>
                <StatusBadge status={p.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
