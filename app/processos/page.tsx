"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Processo } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";
import { FolderOpen, Search } from "lucide-react";

const FILTROS = [
  { valor: "todos", label: "Todos" },
  { valor: "urgente", label: "Urgentes" },
  { valor: "em_andamento", label: "Em andamento" },
  { valor: "aguardando", label: "Aguardando" },
  { valor: "arquivado", label: "Arquivados" },
];

export default function ListaProcessos() {
  const router = useRouter();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState("recentes");

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

  const termo = busca.trim().toLocaleLowerCase();
  const filtrados = processos.filter((p) => {
    const correspondeStatus = filtro === "todos" || p.status === filtro;
    const texto = [
      p.numeroProcesso,
      p.partes,
      p.nomeArquivo,
      p.tipoAcao,
      p.varaComarca,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return correspondeStatus && (!termo || texto.includes(termo));
  }).sort((a, b) => {
    if (ordenacao === "prazo") {
      return (a.prazoVencimento ?? "9999-12-31").localeCompare(
        b.prazoVencimento ?? "9999-12-31"
      );
    }
    if (ordenacao === "nome") {
      return (a.partes ?? a.nomeArquivo ?? "").localeCompare(
        b.partes ?? b.nomeArquivo ?? "",
        "pt-BR"
      );
    }
    return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
  });

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-6 pt-12 sm:pt-14 pb-24">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-2">
            Acompanhamento
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-[-0.02em]">
            Processos
          </h1>
        </div>
        <span className="font-mono text-xs text-ink/40 text-right">
          {processos.length} {processos.length === 1 ? "registro" : "registros"}
        </span>
      </div>

      <div className="flex gap-2 mb-7 flex-wrap border-b border-ink/10 pb-5">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            className={`font-mono text-[12px] uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors ${
              filtro === f.valor
                ? "bg-ink text-paper border-ink"
                : "border-ink/15 text-ink/60 hover:border-accent/40 hover:text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <label className="relative block mb-6 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/35" />
        <span className="sr-only">Buscar processo</span>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por número, parte, tipo ou comarca"
          className="w-full rounded-xl border border-ink/15 bg-paper/70 py-3 pl-10 pr-4 text-sm outline-none placeholder:text-ink/35 focus:border-accent/50"
        />
      </label>

      <div className="flex items-center gap-3 mb-6">
        <label className="font-mono text-[10px] uppercase tracking-wide text-ink/40">
          Ordenar por
        </label>
        <select
          value={ordenacao}
          onChange={(e) => setOrdenacao(e.target.value)}
          className="rounded-lg border border-ink/15 bg-paper/70 px-3 py-2 text-sm outline-none focus:border-accent/50"
        >
          <option value="recentes">Mais recentes</option>
          <option value="prazo">Próximo prazo</option>
          <option value="nome">Nome das partes</option>
        </select>
      </div>

      {carregando ? (
        <p className="text-ink/40 font-mono text-sm">Carregando…</p>
      ) : filtrados.length === 0 ? (
        <div className="border border-dashed border-ink/20 rounded-2xl py-16 text-center">
          <FolderOpen
            className="w-8 h-8 text-ink/25 mx-auto mb-3"
            strokeWidth={1.5}
          />
          <p className="text-ink/50">
            {busca || filtro !== "todos"
              ? "Nenhum processo corresponde aos filtros."
              : "Nenhum processo encontrado."}{" "}
            <Link href="/" className="text-accent underline">
              Anexe o primeiro
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="border border-ink/10 bg-paper/70 rounded-2xl overflow-hidden divide-y divide-ink/10 shadow-[0_12px_30px_#1c243108]">
          {filtrados.map((p) => (
            <Link
              key={p.id}
              href={`/processos/${p.id}`}
              className="flex items-center justify-between gap-4 px-4 sm:px-5 py-5 hover:bg-white/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-mono text-sm text-ink/50 truncate">
                  {p.numeroProcesso ?? "Número não identificado"}
                </p>
                <p className="font-medium truncate mt-0.5">
                  {p.partes ?? p.nomeArquivo}
                </p>
                <p className="text-sm text-ink/50 truncate mt-0.5">
                  {p.tipoAcao ?? "Tipo não identificado"} ·{" "}
                  {p.varaComarca ?? "Vara não identificada"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <StatusBadge status={p.status} />
                {p.prazoVencimento && (
                  <span className="font-mono text-xs text-ink/40">
                    prazo {p.prazoVencimento}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
