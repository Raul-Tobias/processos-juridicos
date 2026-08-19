import { NextResponse } from "next/server";
import { contarUsuarios, criarUsuario, EMAIL_ADMIN } from "@/lib/auth";

export async function POST(req: Request) {
  if (contarUsuarios() > 0) {
    return NextResponse.json({ erro: "A configuração inicial já foi concluída." }, { status: 409 });
  }
  const corpo = await req.json().catch(() => null);
  const nome = typeof corpo?.nome === "string" ? corpo.nome.trim() : "";
  const email = typeof corpo?.email === "string" ? corpo.email.trim() : "";
  const senha = typeof corpo?.senha === "string" ? corpo.senha : "";
  if (!nome || email.toLowerCase() !== EMAIL_ADMIN || senha.length < 8) {
    return NextResponse.json({ erro: "Informe nome, e-mail e uma senha com pelo menos 8 caracteres." }, { status: 400 });
  }
  try {
    const usuario = criarUsuario(nome, email, senha, "admin");
    return NextResponse.json({ usuario }, { status: 201 });
  } catch {
    return NextResponse.json({ erro: "Não foi possível criar o administrador." }, { status: 400 });
  }
}
