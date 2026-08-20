import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_SESSAO,
  criarUsuario,
  listarUsuarios,
  permissoesDoPerfil,
  usuarioDaSessao,
  type Perfil,
  podeAdministrar,
} from "@/lib/auth";

async function admin(req: NextRequest) {
  const usuario = await usuarioDaSessao(req.cookies.get(COOKIE_SESSAO)?.value);
  return podeAdministrar(usuario) ? usuario : null;
}

export async function GET(req: NextRequest) {
  if (!await admin(req)) return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  return NextResponse.json({ usuarios: await listarUsuarios() });
}

export async function POST(req: NextRequest) {
  if (!await admin(req)) return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  const corpo = await req.json().catch(() => null);
  const nome = typeof corpo?.nome === "string" ? corpo.nome.trim() : "";
  const email = typeof corpo?.email === "string" ? corpo.email.trim() : "";
  const senha = typeof corpo?.senha === "string" ? corpo.senha : "";
  const perfil = corpo?.perfil as Perfil;
  if (!nome || !email || senha.length < 8 || !["operador", "consulta"].includes(perfil)) {
    return NextResponse.json({ erro: "Dados inválidos. A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
  }
  try {
    const usuario = await criarUsuario(nome, email, senha, perfil, corpo?.permissoes ?? permissoesDoPerfil(perfil));
    return NextResponse.json({ usuario }, { status: 201 });
  } catch {
    return NextResponse.json({ erro: "Não foi possível criar o usuário. O e-mail pode já estar em uso." }, { status: 409 });
  }
}
