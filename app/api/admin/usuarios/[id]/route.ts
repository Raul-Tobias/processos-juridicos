import { NextRequest, NextResponse } from "next/server";
import {
  atualizarUsuario,
  COOKIE_SESSAO,
  excluirUsuario,
  usuarioDaSessao,
  type Perfil,
  type Permissoes,
  podeAdministrar,
} from "@/lib/auth";

async function eAdmin(req: NextRequest) {
  return podeAdministrar(await usuarioDaSessao(req.cookies.get(COOKIE_SESSAO)?.value));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await eAdmin(req)) return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  const { id } = await params;
  const corpo = await req.json().catch(() => null);
  const perfil = corpo?.perfil as Perfil | undefined;
  if (perfil && !["operador", "consulta"].includes(perfil)) {
    return NextResponse.json({ erro: "Perfil inválido." }, { status: 400 });
  }
  await atualizarUsuario(id, {
    perfil,
    permissoes: corpo?.permissoes as Permissoes | undefined,
    ativo: typeof corpo?.ativo === "boolean" ? corpo.ativo : undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioDaSessao(req.cookies.get(COOKIE_SESSAO)?.value);
  if (!usuario || !podeAdministrar(usuario)) return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  const { id } = await params;
  if (id === usuario.id) return NextResponse.json({ erro: "Você não pode excluir seu próprio acesso." }, { status: 400 });
  await excluirUsuario(id);
  return NextResponse.json({ ok: true });
}
