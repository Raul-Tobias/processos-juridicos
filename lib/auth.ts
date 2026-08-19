import crypto from "node:crypto";
import { db } from "@/lib/db";
import { EMAIL_ADMIN } from "@/lib/auth-constants";

export type Perfil = "admin" | "operador" | "consulta";
export type Permissoes = {
  analisar: boolean;
  editar: boolean;
  excluir: boolean;
};

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  permissoes: Permissoes;
  ativo: boolean;
  criadoEm: string;
}

const COOKIE_SESSAO = "autos_sessao";
const DURACAO_SESSAO_MS = 1000 * 60 * 60 * 12;

export { COOKIE_SESSAO, DURACAO_SESSAO_MS, EMAIL_ADMIN };

const authDb = db;

const PERMISSOES_PADRAO: Record<Perfil, Permissoes> = {
  admin: { analisar: true, editar: true, excluir: true },
  operador: { analisar: true, editar: true, excluir: false },
  consulta: { analisar: false, editar: false, excluir: false },
};

function hashSenha(senha: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(senha, salt, 64).toString("hex");
  return `${salt}:${hash}`;
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
    id: String(linha.id),
    nome: String(linha.nome),
    email: String(linha.email),
    perfil: linha.perfil as Perfil,
    permissoes: JSON.parse(String(linha.permissoes)) as Permissoes,
    ativo: Boolean(linha.ativo),
    criadoEm: String(linha.criadoEm),
  };
}

export function contarUsuarios() {
  return Number(authDb.prepare("SELECT COUNT(*) AS total FROM usuarios").get()?.total ?? 0);
}

export function criarUsuario(
  nome: string,
  email: string,
  senha: string,
  perfil: Perfil,
  permissoes = PERMISSOES_PADRAO[perfil]
) {
  const id = crypto.randomUUID();
  const criadoEm = new Date().toISOString();
  authDb
    .prepare(
      "INSERT INTO usuarios (id, nome, email, senhaHash, perfil, permissoes, criadoEm) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(id, nome.trim(), email.trim().toLowerCase(), hashSenha(senha), perfil, JSON.stringify(permissoes), criadoEm);
  return buscarUsuario(id);
}

export function buscarUsuario(id: string): Usuario | undefined {
  const linha = authDb.prepare("SELECT * FROM usuarios WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return linha ? linhaParaUsuario(linha) : undefined;
}

export function listarUsuarios(): Usuario[] {
  return authDb
    .prepare("SELECT id, nome, email, perfil, permissoes, ativo, criadoEm FROM usuarios ORDER BY criadoEm DESC")
    .all()
    .map((linha) => linhaParaUsuario(linha as Record<string, unknown>));
}

export function autenticar(email: string, senha: string) {
  const linha = authDb.prepare("SELECT * FROM usuarios WHERE email = ? AND ativo = 1").get(email.trim().toLowerCase()) as Record<string, unknown> | undefined;
  if (!linha || !validarSenha(senha, String(linha.senhaHash))) return null;
  return linhaParaUsuario(linha);
}

export function criarSessao(usuarioId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + DURACAO_SESSAO_MS).toISOString();
  authDb.prepare("INSERT INTO sessoes (token, usuarioId, expiraEm) VALUES (?, ?, ?)").run(token, usuarioId, expiraEm);
  return { token, expiraEm };
}

export function usuarioDaSessao(token: string | undefined) {
  if (!token) return undefined;
  const linha = authDb
    .prepare("SELECT u.* FROM sessoes s JOIN usuarios u ON u.id = s.usuarioId WHERE s.token = ? AND s.expiraEm > ? AND u.ativo = 1")
    .get(token, new Date().toISOString()) as Record<string, unknown> | undefined;
  return linha ? linhaParaUsuario(linha) : undefined;
}

export function removerSessao(token: string | undefined) {
  if (token) authDb.prepare("DELETE FROM sessoes WHERE token = ?").run(token);
}

export function atualizarUsuario(id: string, dados: { perfil?: Perfil; permissoes?: Permissoes; ativo?: boolean }) {
  const campos: string[] = [];
  const valores: (string | number)[] = [];
  if (dados.perfil) { campos.push("perfil = ?"); valores.push(dados.perfil); }
  if (dados.permissoes) { campos.push("permissoes = ?"); valores.push(JSON.stringify(dados.permissoes)); }
  if (dados.ativo !== undefined) { campos.push("ativo = ?"); valores.push(dados.ativo ? 1 : 0); }
  if (campos.length) authDb.prepare(`UPDATE usuarios SET ${campos.join(", ")} WHERE id = ?`).run(...valores, id);
}

export function podeAdministrar(usuario: Usuario | undefined) {
  return usuario?.perfil === "admin" && usuario.email === EMAIL_ADMIN;
}

export function excluirUsuario(id: string) {
  authDb.prepare("DELETE FROM usuarios WHERE id = ?").run(id);
}

export function permissoesDoPerfil(perfil: Perfil): Permissoes {
  return { ...PERMISSOES_PADRAO[perfil] };
}
