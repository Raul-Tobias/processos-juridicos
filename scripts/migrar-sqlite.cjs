/* eslint-disable @typescript-eslint/no-require-imports */
const { DatabaseSync } = require("node:sqlite");
const postgres = require("postgres");

if (!process.env.DATABASE_URL) {
  throw new Error("Defina DATABASE_URL antes de executar a migração.");
}

const origem = new DatabaseSync("data/processos.db");
const sql = postgres(process.env.DATABASE_URL, { prepare: false });

async function main() {
  await sql.begin(async (tx) => {
    await tx.unsafe(`
      CREATE TABLE IF NOT EXISTS processos (
        id TEXT PRIMARY KEY, numero_processo TEXT, partes TEXT, vara_comarca TEXT,
        tipo_acao TEXT, valor_causa TEXT, objeto_causa TEXT, pedidos JSONB, status TEXT NOT NULL DEFAULT 'em_andamento',
        prazo_vencimento TEXT, andamento_atual TEXT, resumo TEXT, observacoes TEXT,
        bloqueio_judicial JSONB,
        nome_arquivo TEXT, criado_em TIMESTAMPTZ NOT NULL
      );
      ALTER TABLE processos ADD COLUMN IF NOT EXISTS objeto_causa TEXT;
      ALTER TABLE processos ADD COLUMN IF NOT EXISTS pedidos JSONB;
      ALTER TABLE processos ADD COLUMN IF NOT EXISTS bloqueio_judicial JSONB;
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY, nome TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL, perfil TEXT NOT NULL DEFAULT 'consulta',
        permissoes JSONB NOT NULL, ativo BOOLEAN NOT NULL DEFAULT TRUE,
        criado_em TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessoes (
        token TEXT PRIMARY KEY, usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        expira_em TIMESTAMPTZ NOT NULL
      );
    `);

    const processos = origem.prepare("SELECT * FROM processos").all();
    for (const p of processos) {
      await tx`INSERT INTO processos ${tx({
        id: p.id, numero_processo: p.numeroProcesso, partes: p.partes,
        vara_comarca: p.varaComarca, tipo_acao: p.tipoAcao, valor_causa: p.valorCausa,
        status: p.status, prazo_vencimento: p.prazoVencimento,
        andamento_atual: p.andamentoAtual, resumo: p.resumo,
        observacoes: p.observacoes ?? null, nome_arquivo: p.nomeArquivo,
        objeto_causa: p.objetoCausa ?? null,
        pedidos: p.pedidos ? (typeof p.pedidos === "string" ? p.pedidos : JSON.stringify(p.pedidos)) : null,
        bloqueio_judicial: p.bloqueioJudicial ? JSON.parse(p.bloqueioJudicial) : null,
        criado_em: p.criadoEm,
      })} ON CONFLICT (id) DO NOTHING`;
    }

    const usuarios = origem.prepare("SELECT * FROM usuarios").all();
    for (const u of usuarios) {
      await tx`INSERT INTO usuarios ${tx({
        id: u.id, nome: u.nome, email: u.email, senha_hash: u.senhaHash,
        perfil: u.perfil, permissoes: JSON.parse(u.permissoes), ativo: Boolean(u.ativo),
        criado_em: u.criadoEm,
      })} ON CONFLICT (id) DO NOTHING`;
    }

    const sessoes = origem.prepare("SELECT * FROM sessoes").all();
    for (const s of sessoes) {
      await tx`INSERT INTO sessoes ${tx({ token: s.token, usuario_id: s.usuarioId, expira_em: s.expiraEm })} ON CONFLICT (token) DO NOTHING`;
    }

    console.log(`Migrados: ${processos.length} processos, ${usuarios.length} usuários, ${sessoes.length} sessões.`);
  });
  await sql.end();
}

main().catch(async (erro) => {
  console.error(erro);
  await sql.end();
  process.exitCode = 1;
});
