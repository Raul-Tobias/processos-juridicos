import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESSAO, podeAdministrar, usuarioDaSessao } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const usuario = await usuarioDaSessao(req.cookies.get(COOKIE_SESSAO)?.value);
  if (!usuario) return NextResponse.json({ usuario: null }, { status: 401 });
  return NextResponse.json({ usuario, podeAdministrar: podeAdministrar(usuario) });
}
