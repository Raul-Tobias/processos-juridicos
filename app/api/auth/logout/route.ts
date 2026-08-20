import { NextRequest, NextResponse } from "next/server";
import { removerSessao, COOKIE_SESSAO } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await removerSessao(req.cookies.get(COOKIE_SESSAO)?.value);
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(COOKIE_SESSAO, "", { expires: new Date(0), path: "/" });
  return resposta;
}
