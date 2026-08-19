"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, Loader2 } from "lucide-react";

const TAMANHO_MAXIMO = 25 * 1024 * 1024;
const ETAPAS = ["Enviando documento", "Lendo o processo", "Organizando informações"];

export default function PaginaInicial() {
  const router = useRouter();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [etapa, setEtapa] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function selecionarArquivo(f: File | undefined | null) {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setErro("Selecione um arquivo PDF para continuar.");
      return;
    }
    if (f.size > TAMANHO_MAXIMO) {
      setErro("O PDF deve ter no máximo 25 MB.");
      return;
    }
    setErro(null);
    setArquivo(f);
  }

  async function enviarParaAnalise() {
    if (!arquivo) return;
    setCarregando(true);
    setEtapa(0);
    setErro(null);

    const formData = new FormData();
    formData.append("arquivo", arquivo);

    try {
      const resp = await fetch("/api/analisar", {
        method: "POST",
        body: formData,
      });
      setEtapa(1);
      const dados = await resp.json();

      if (!resp.ok) {
        setErro(
          dados.erro ??
            "Não foi possível concluir a análise. Verifique o PDF e tente novamente."
        );
        setCarregando(false);
        return;
      }

      setEtapa(2);
      router.push(`/processos/${dados.id}`);
    } catch {
      setErro("Não foi possível conectar ao servidor. Tente novamente em instantes.");
      setCarregando(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-6 pt-14 sm:pt-20 pb-24">
      <div className="max-w-2xl mb-12 sm:mb-14">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
          Autuação automática
        </span>
        <h1 className="font-serif text-[2.65rem] sm:text-5xl font-semibold mt-3 leading-[1.08] tracking-[-0.02em]">
          Anexe um processo.
          <br />
          Extraia o essencial.
        </h1>
        <p className="text-[1.05rem] text-ink/60 mt-5 max-w-xl leading-relaxed">
          Envie o PDF de um processo judicial e a análise identifica número,
          partes, vara, prazos e status automaticamente — pronto para entrar
          no seu painel de acompanhamento.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          selecionarArquivo(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all shadow-[0_10px_30px_#1c243108] ${
          arrastando
            ? "border-accent bg-accent/5"
            : "border-ink/20 bg-paper/70 hover:border-accent/50 hover:bg-white/30"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => selecionarArquivo(e.target.files?.[0])}
        />

        {arquivo ? (
          <div className="flex flex-col items-center gap-3">
            <FileText className="w-9 h-9 text-accent" strokeWidth={1.5} />
            <div>
              <p className="font-medium">{arquivo.name}</p>
              <p className="text-sm text-ink/50 font-mono">
                {(arquivo.size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <UploadCloud
              className="w-9 h-9 text-ink/30"
              strokeWidth={1.5}
            />
            <p className="text-ink/70">
              Arraste um PDF aqui, ou clique para selecionar
            </p>
            <p className="text-xs text-ink/40 font-mono">
              PDFs com texto selecionável ou páginas escaneadas legíveis
            </p>
          </div>
        )}
      </div>

      {erro && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-accent font-medium"
        >
          {erro}
        </div>
      )}

      {carregando && (
        <div
          className="mt-6 rounded-xl border border-ink/10 bg-paper/70 px-4 py-4"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="font-medium text-sm">{ETAPAS[etapa]}</span>
            <span className="font-mono text-[11px] text-ink/40">
              {etapa + 1}/{ETAPAS.length}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${((etapa + 1) / ETAPAS.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-ink/50 mt-3">
            A análise pode levar alguns instantes em documentos maiores.
          </p>
        </div>
      )}

      <button
        onClick={enviarParaAnalise}
        disabled={!arquivo || carregando}
        className="mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent text-paper font-medium px-6 py-3 rounded-lg shadow-[0_8px_18px_#7a2e3330] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent-light hover:-translate-y-0.5 transition-all"
      >
        {carregando ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analisando processo…
          </>
        ) : (
          "Analisar processo"
        )}
      </button>
    </div>
  );
}
