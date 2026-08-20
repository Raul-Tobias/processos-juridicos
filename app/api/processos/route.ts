import { NextRequest, NextResponse } from "next/server";
import { listarProcessos } from "@/lib/db";
import { COOKIE_SESSAO, usuarioDaSessao } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!await usuarioDaSessao(req.cookies.get(COOKIE_SESSAO)?.value)) {
    return NextResponse.json({ erro: "Faça login para acessar os processos." }, { status: 401 });
  }
  const processos = await listarProcessos();
  return NextResponse.json(processos);
}
