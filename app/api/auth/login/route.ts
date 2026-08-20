import { NextRequest, NextResponse } from "next/server";
import { autenticar, criarSessao, COOKIE_SESSAO } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const corpo = await req.json().catch(() => null);
  const email = typeof corpo?.email === "string" ? corpo.email : "";
  const senha = typeof corpo?.senha === "string" ? corpo.senha : "";
  const usuario = await autenticar(email, senha);

  if (!usuario) {
    return NextResponse.json({ erro: "E-mail ou senha inválidos." }, { status: 401 });
  }

  const sessao = await criarSessao(usuario.id);
  const resposta = NextResponse.json({ usuario });
  resposta.cookies.set(COOKIE_SESSAO, sessao.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(sessao.expiraEm),
    path: "/",
  });
  return resposta;
}
