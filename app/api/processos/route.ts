import { NextRequest, NextResponse } from "next/server";
import { listarProcessos } from "@/lib/db";
import { COOKIE_SESSAO, podeAdministrar, usuarioDaSessao } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const usuario = await usuarioDaSessao(req.cookies.get(COOKIE_SESSAO)?.value);
  if (!usuario) {
    return NextResponse.json({ erro: "Faça login para acessar os processos." }, { status: 401 });
  }
  const processos = await listarProcessos(podeAdministrar(usuario) ? undefined : usuario.id);
  return NextResponse.json(processos);
}
