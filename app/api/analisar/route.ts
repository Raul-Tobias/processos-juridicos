import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { extrairTextoDoPdf } from "@/lib/extrairTexto";
import { analisarPdfComIA } from "@/lib/analisarComIA";
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

    let texto = "";
    try {
      texto = await extrairTextoDoPdf(buffer);
    } catch (erroOcr) {
      console.warn("OCR auxiliar não concluído; seguindo com leitura visual:", erroOcr);
    }
    console.info("Texto extraído do documento:", texto.trim().length, "caracteres");
    const analise =
      texto.trim().length >= 30
        ? await analisarPdfComIA(buffer, texto)
        : await analisarPdfComIA(buffer);

    const camposIdentificados = [
      analise.numeroProcesso,
      analise.partes,
      analise.varaComarca,
      analise.tipoAcao,
      analise.valorCausa,
      analise.objetoCausa,
      analise.pedidos?.length ? analise.pedidos : null,
      analise.prazoVencimento,
      analise.andamentoAtual,
      analise.resumo,
      analise.bloqueioJudicial,
    ].filter(Boolean).length;
    console.info("Campos identificados pela IA:", camposIdentificados);

    if (camposIdentificados === 0) {
      return NextResponse.json(
        { erro: "Não foi possível identificar informações neste documento. Tente um PDF mais nítido." },
        { status: 422 }
      );
    }

    const id = randomUUID();
    const criadoEm = new Date().toISOString();

    await inserirProcesso({
      id,
      numeroProcesso: analise.numeroProcesso,
      partes: analise.partes,
      varaComarca: analise.varaComarca,
      tipoAcao: analise.tipoAcao,
      valorCausa: analise.valorCausa,
      objetoCausa: analise.objetoCausa,
      pedidos: analise.pedidos,
      status: analise.status ?? "em_andamento",
      prazoVencimento: analise.prazoVencimento,
      andamentoAtual: analise.andamentoAtual,
      resumo: analise.resumo,
      bloqueioJudicial: analise.bloqueioJudicial,
      nomeArquivo: arquivo.name,
      criadoEm,
    });

    return NextResponse.json({ id, ...analise });
  } catch (erro) {
    console.error("Erro ao analisar processo:", erro);
    const mensagem = erro instanceof Error ? erro.message : "";
    const indisponibilidadeIA = /anthropic|pdf|document|model|api/i.test(mensagem);
    return NextResponse.json(
      {
        erro: indisponibilidadeIA
          ? "A leitura visual do PDF não foi concluída. Verifique a chave da Anthropic e tente novamente."
          : "Erro interno ao processar o documento.",
      },
      { status: indisponibilidadeIA ? 502 : 500 }
    );
  }
}
