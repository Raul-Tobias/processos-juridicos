import crypto from "node:crypto";
import { garantirBanco, sql } from "@/lib/db";
import { EMAIL_ADMIN } from "@/lib/auth-constants";

export type Perfil = "admin" | "operador" | "consulta";
export type Permissoes = { analisar: boolean; editar: boolean; excluir: boolean };
export interface Usuario { id: string; nome: string; email: string; perfil: Perfil; permissoes: Permissoes; ativo: boolean; criadoEm: string; }

const COOKIE_SESSAO = "autos_sessao";
const DURACAO_SESSAO_MS = 1000 * 60 * 60 * 12;
export { COOKIE_SESSAO, DURACAO_SESSAO_MS, EMAIL_ADMIN };

const PERMISSOES_PADRAO: Record<Perfil, Permissoes> = {
  admin: { analisar: true, editar: true, excluir: true },
  operador: { analisar: true, editar: true, excluir: false },
  consulta: { analisar: false, editar: false, excluir: false },
};

function hashSenha(senha: string, salt = crypto.randomBytes(16).toString("hex")) {
  return `${salt}:${crypto.scryptSync(senha, salt, 64).toString("hex")}`;
}

function validarSenha(senha: string, armazenada: string) {
  const [salt, hash] = armazenada.split(":");
  if (!salt || !hash) return false;
  const atual = crypto.scryptSync(senha, salt, 64);
  const esperado = Buffer.from(hash, "hex");
  return atual.length === esperado.length && crypto.timingSafeEqual(atual, esperado);
}

function linhaParaUsuario(linha: Record<string, unknown>): Usuario {
  return {
    id: String(linha.id), nome: String(linha.nome), email: String(linha.email),
    perfil: linha.perfil as Perfil, permissoes: linha.permissoes as Permissoes,
    ativo: Boolean(linha.ativo), criadoEm: new Date(String(linha.criado_em)).toISOString(),
  };
}

export async function contarUsuarios() {
  await garantirBanco();
  const [linha] = await sql`SELECT COUNT(*)::int AS total FROM usuarios`;
  return Number(linha?.total ?? 0);
}

export async function criarUsuario(nome: string, email: string, senha: string, perfil: Perfil, permissoes = PERMISSOES_PADRAO[perfil]) {
  await garantirBanco();
  const id = crypto.randomUUID();
  const criadoEm = new Date().toISOString();
  await sql`INSERT INTO usuarios ${sql({ id, nome: nome.trim(), email: email.trim().toLowerCase(), senha_hash: hashSenha(senha), perfil, permissoes, criado_em: criadoEm })}`;
  return buscarUsuario(id);
}

export async function buscarUsuario(id: string) {
  await garantirBanco();
  const [linha] = await sql`SELECT * FROM usuarios WHERE id = ${id}`;
  return linha ? linhaParaUsuario(linha) : undefined;
}

export async function listarUsuarios() {
  await garantirBanco();
  const linhas = await sql`SELECT id, nome, email, perfil, permissoes, ativo, criado_em FROM usuarios ORDER BY criado_em DESC`;
  return linhas.map((linha) => linhaParaUsuario(linha));
}

export async function autenticar(email: string, senha: string) {
  await garantirBanco();
  const [linha] = await sql`SELECT * FROM usuarios WHERE email = ${email.trim().toLowerCase()} AND ativo = TRUE`;
  if (!linha || !validarSenha(senha, String(linha.senha_hash))) return null;
  return linhaParaUsuario(linha);
}

export async function criarSessao(usuarioId: string) {
  await garantirBanco();
  const token = crypto.randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + DURACAO_SESSAO_MS).toISOString();
  await sql`INSERT INTO sessoes ${sql({ token, usuario_id: usuarioId, expira_em: expiraEm })}`;
  return { token, expiraEm };
}

export async function usuarioDaSessao(token: string | undefined) {
  await garantirBanco();
  if (!token) return undefined;
  const [linha] = await sql`SELECT u.* FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token = ${token} AND s.expira_em > NOW() AND u.ativo = TRUE`;
  return linha ? linhaParaUsuario(linha) : undefined;
}

export async function removerSessao(token: string | undefined) {
  await garantirBanco();
  if (token) await sql`DELETE FROM sessoes WHERE token = ${token}`;
}

export async function atualizarUsuario(id: string, dados: { perfil?: Perfil; permissoes?: Permissoes; ativo?: boolean }) {
  await garantirBanco();
  if (dados.perfil !== undefined) await sql`UPDATE usuarios SET perfil = ${dados.perfil} WHERE id = ${id}`;
  if (dados.permissoes !== undefined) await sql`UPDATE usuarios SET permissoes = ${JSON.stringify(dados.permissoes)}::jsonb WHERE id = ${id}`;
  if (dados.ativo !== undefined) await sql`UPDATE usuarios SET ativo = ${dados.ativo} WHERE id = ${id}`;
}

export function podeAdministrar(usuario: Usuario | undefined) { return usuario?.perfil === "admin" && usuario.email === EMAIL_ADMIN; }
export async function excluirUsuario(id: string) { await garantirBanco(); await sql`DELETE FROM usuarios WHERE id = ${id}`; }
export function permissoesDoPerfil(perfil: Perfil) { return { ...PERMISSOES_PADRAO[perfil] }; }
