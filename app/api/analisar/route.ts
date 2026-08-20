import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { extrairTextoDoPdf } from "@/lib/extrairTexto";
import { analisarPdfComIA, analisarProcessoComIA } from "@/lib/analisarComIA";
import { inserirProcesso } from "@/lib/db";
import { COOKIE_SESSAO, usuarioDaSessao } from "@/lib/auth";

const TAMANHO_MAXIMO_ARQUIVO = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const usuario = await usuarioDaSessao(req.cookies.get(COOKIE_SESSAO)?.value);
    if (!usuario) {
      return NextResponse.json({ erro: "Faça login para analisar um processo." }, { status: 401 });
    }
    if (!usuario.permissoes.analisar) {
      return NextResponse.json({ erro: "Seu perfil não pode analisar processos." }, { status: 403 });
    }
    const formData = await req.formData();
    const arquivo = formData.get("arquivo") as File | null;

    if (!arquivo || typeof arquivo.arrayBuffer !== "function") {
      return NextResponse.json(
        { erro: "Nenhum arquivo enviado." },
        { status: 400 }
      );
    }

    if (
      arquivo.type &&
      arquivo.type !== "application/pdf" &&
      arquivo.type !== "application/octet-stream"
    ) {
      return NextResponse.json(
        { erro: "Apenas arquivos PDF são aceitos por enquanto." },
        { status: 400 }
      );
    }

    if (arquivo.size === 0 || arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
      return NextResponse.json(
        { erro: "O PDF deve ter entre 1 byte e 25 MB." },
        { status: 413 }
      );
    }

    const arrayBuffer = await arquivo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return NextResponse.json(
        { erro: "O arquivo selecionado não parece ser um PDF válido." },
        { status: 415 }
      );
    }

    const texto = await extrairTextoDoPdf(buffer);
    const analise =
      texto.trim().length >= 30
        ? await analisarProcessoComIA(texto)
        : await analisarPdfComIA(buffer);

    const id = randomUUID();
    const criadoEm = new Date().toISOString();

    await inserirProcesso({
      id,
      numeroProcesso: analise.numeroProcesso,
      partes: analise.partes,
      varaComarca: analise.varaComarca,
      tipoAcao: analise.tipoAcao,
      valorCausa: analise.valorCausa,
      status: analise.status ?? "em_andamento",
      prazoVencimento: analise.prazoVencimento,
      andamentoAtual: analise.andamentoAtual,
      resumo: analise.resumo,
      nomeArquivo: arquivo.name,
      criadoEm,
    });

    return NextResponse.json({ id, ...analise });
  } catch (erro) {
    console.error("Erro ao analisar processo:", erro);
    return NextResponse.json(
      { erro: "Erro interno ao processar o documento." },
      { status: 500 }
    );
  }
}
