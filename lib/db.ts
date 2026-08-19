import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "processos.db");
const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS processos (
    id TEXT PRIMARY KEY,
    numeroProcesso TEXT,
    partes TEXT,
    varaComarca TEXT,
    tipoAcao TEXT,
    valorCausa TEXT,
    status TEXT NOT NULL DEFAULT 'em_andamento',
    prazoVencimento TEXT,
    andamentoAtual TEXT,
    resumo TEXT,
    observacoes TEXT,
    nomeArquivo TEXT,
    criadoEm TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senhaHash TEXT NOT NULL,
    perfil TEXT NOT NULL DEFAULT 'consulta',
    permissoes TEXT NOT NULL,
    ativo INTEGER NOT NULL DEFAULT 1,
    criadoEm TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessoes (
    token TEXT PRIMARY KEY,
    usuarioId TEXT NOT NULL,
    expiraEm TEXT NOT NULL,
    FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE
  );
`);

try {
  db.exec("ALTER TABLE processos ADD COLUMN observacoes TEXT");
} catch {
  // Column already exists in databases created after this field was added.
}

export interface Processo {
  id: string;
  numeroProcesso: string | null;
  partes: string | null;
  varaComarca: string | null;
  tipoAcao: string | null;
  valorCausa: string | null;
  status: string;
  prazoVencimento: string | null;
  andamentoAtual: string | null;
  resumo: string | null;
  observacoes?: string | null;
  nomeArquivo: string | null;
  criadoEm: string;
}

export function inserirProcesso(processo: Processo) {
  const stmt = db.prepare(`
    INSERT INTO processos (
      id, numeroProcesso, partes, varaComarca, tipoAcao, valorCausa,
      status, prazoVencimento, andamentoAtual, resumo, nomeArquivo, criadoEm
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  stmt.run(
    processo.id,
    processo.numeroProcesso,
    processo.partes,
    processo.varaComarca,
    processo.tipoAcao,
    processo.valorCausa,
    processo.status,
    processo.prazoVencimento,
    processo.andamentoAtual,
    processo.resumo,
    processo.nomeArquivo,
    processo.criadoEm
  );
}

export function listarProcessos(): Processo[] {
  return db
    .prepare("SELECT * FROM processos ORDER BY criadoEm DESC")
    .all() as unknown as Processo[];
}

export function buscarProcessoPorId(id: string): Processo | undefined {
  const resultado = db
    .prepare("SELECT * FROM processos WHERE id = ?")
    .get(id);
  return resultado as unknown as Processo | undefined;
}

export function atualizarStatusProcesso(id: string, status: string) {
  db.prepare("UPDATE processos SET status = ? WHERE id = ?").run(status, id);
}

export function atualizarDadosProcesso(
  id: string,
  dados: Partial<Pick<Processo, keyof Processo>>
) {
  const campos = [
    "numeroProcesso",
    "partes",
    "varaComarca",
    "tipoAcao",
    "valorCausa",
    "prazoVencimento",
    "andamentoAtual",
    "resumo",
    "observacoes",
  ] as const;
  const presentes = campos.filter((campo) => campo in dados);
  if (presentes.length === 0) return;

  const valores = presentes.map((campo) => dados[campo] ?? null);
  db.prepare(
    `UPDATE processos SET ${presentes.map((campo) => `${campo} = ?`).join(", ")} WHERE id = ?`
  ).run(...valores, id);
}

export function deletarProcesso(id: string) {
  db.prepare("DELETE FROM processos WHERE id = ?").run(id);
}

export { db };
export default db;