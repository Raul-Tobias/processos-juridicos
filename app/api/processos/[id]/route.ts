import { NextRequest, NextResponse } from "next/server";
import {
  buscarProcessoPorId,
  atualizarStatusProcesso,
  atualizarDadosProcesso,
  deletarProcesso,
} from "@/lib/db";
import { COOKIE_SESSAO, usuarioDaSessao } from "@/lib/auth";

const STATUS_VALIDOS = ["em_andamento", "urgente", "aguardando", "arquivado"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await usuarioDaSessao(req.cookies.get(COOKIE_SESSAO)?.value)) {
    return NextResponse.json({ erro: "Faça login para acessar os processos." }, { status: 401 });
  }
  const { id } = await params;
  const processo = await buscarProcessoPorId(id);

  if (!processo) {
    return NextResponse.json(
      { erro: "Processo não encontrado." },
      { status: 404 }
    );
  }

  return NextResponse.json(processo);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const usuario = await usuarioDaSessao(req.cookies.get(COOKIE_SESSAO)?.value);
  if (!usuario) return NextResponse.json({ erro: "Faça login para editar processos." }, { status: 401 });
  if (!usuario.permissoes.editar) return NextResponse.json({ erro: "Seu perfil não pode editar processos." }, { status: 403 });
  const { id } = await params;
  const processo = await buscarProcessoPorId(id);

  if (!processo) {
    return NextResponse.json(
      { erro: "Processo não encontrado." },
      { status: 404 }
    );
  }

  const corpo = await req.json().catch(() => null);
  const status = corpo?.status;

  if (status !== undefined && !STATUS_VALIDOS.includes(status)) {
    return NextResponse.json(
      { erro: "Status inválido." },
      { status: 400 }
    );
  }

  if (status !== undefined) {
    await atualizarStatusProcesso(id, status);
  }

  const campos = [
    "numeroProcesso",
    "partes",
    "varaComarca",
    "tipoAcao",
    "valorCausa",
    "objetoCausa",
    "prazoVencimento",
    "andamentoAtual",
    "resumo",
    "observacoes",
  ] as const;
  const dados = Object.fromEntries(
    campos
      .filter((campo) => corpo?.[campo] === null || typeof corpo?.[campo] === "string")
      .map((campo) => [campo, corpo[campo]])
  );
  await atualizarDadosProcesso(id, dados);
  return NextResponse.json({ id, ...dados, ...(status ? { status } : {}) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const usuario = await usuarioDaSessao(req.cookies.get(COOKIE_SESSAO)?.value);
  if (!usuario) return NextResponse.json({ erro: "Faça login para excluir processos." }, { status: 401 });
  if (!usuario.permissoes.excluir) return NextResponse.json({ erro: "Seu perfil não pode excluir processos." }, { status: 403 });
  const { id } = await params;
  const processo = await buscarProcessoPorId(id);

  if (!processo) {
    return NextResponse.json(
      { erro: "Processo não encontrado." },
      { status: 404 }
    );
  }

  await deletarProcesso(id);
  return NextResponse.json({ id, deletado: true });
}