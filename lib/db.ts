import postgres from "postgres";
import type { BloqueioJudicial, Pedido } from "@/lib/analisarComIA";
export type { Pedido } from "@/lib/analisarComIA";

export const sql = postgres(process.env.DATABASE_URL ?? "postgres://localhost:5432/autos", {
  prepare: false,
  max: 5,
});

export interface Processo {
  id: string;
  numeroProcesso: string | null;
  partes: string | null;
  varaComarca: string | null;
  tipoAcao: string | null;
  valorCausa: string | null;
  pedidos?: Pedido[];
  objetoCausa: string | null;
  status: string;
  prazoVencimento: string | null;
  andamentoAtual: string | null;
  resumo: string | null;
  bloqueioJudicial: BloqueioJudicial | null;
  observacoes?: string | null;
  nomeArquivo: string | null;
  criadoEm: string;
}

const IDENTIFICACOES_BLOQUEIO = ["sim", "nao", "nao_identificado"] as const;

function normalizarIdentificacao(valor: unknown): BloqueioJudicial["identificado"] {
  return IDENTIFICACOES_BLOQUEIO.includes(valor as BloqueioJudicial["identificado"])
    ? (valor as BloqueioJudicial["identificado"])
    : "nao_identificado";
}

function normalizarTexto(valor: unknown) {
  return typeof valor === "string" && valor.trim() ? valor : null;
}

function normalizarBloqueioJudicial(valor: unknown): BloqueioJudicial | null {
  let bruto = valor;
  if (typeof bruto === "string") {
    try {
      bruto = JSON.parse(bruto);
    } catch {
      return null;
    }
  }
  if (!bruto || typeof bruto !== "object") return null;

  const objeto = bruto as Record<string, unknown>;
  const manifestacao =
    objeto.manifestacaoDesbloqueio && typeof objeto.manifestacaoDesbloqueio === "object"
      ? (objeto.manifestacaoDesbloqueio as Record<string, unknown>)
      : {};

  return {
    identificado: normalizarIdentificacao(objeto.identificado),
    valor: normalizarTexto(objeto.valor),
    data: normalizarTexto(objeto.data),
    contas: Array.isArray(objeto.contas)
      ? objeto.contas.filter((conta): conta is string => typeof conta === "string")
      : [],
    manifestacaoDesbloqueio: {
      identificada: normalizarIdentificacao(manifestacao.identificada),
      detalhes: normalizarTexto(manifestacao.detalhes),
      data: normalizarTexto(manifestacao.data),
    },
  };
}

export async function inicializarBanco() {
  await sql`
    CREATE TABLE IF NOT EXISTS processos (
      id TEXT PRIMARY KEY,
      numero_processo TEXT,
      partes TEXT,
      vara_comarca TEXT,
      tipo_acao TEXT,
      valor_causa TEXT,
      objeto_causa TEXT,
          pedidos JSONB,
      status TEXT NOT NULL DEFAULT 'em_andamento',
      prazo_vencimento TEXT,
      andamento_atual TEXT,
      resumo TEXT,
      observacoes TEXT,
      bloqueio_judicial JSONB,
      nome_arquivo TEXT,
      criado_em TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`ALTER TABLE processos ADD COLUMN IF NOT EXISTS objeto_causa TEXT`;
  await sql`ALTER TABLE processos ADD COLUMN IF NOT EXISTS pedidos JSONB`;
  await sql`ALTER TABLE processos ADD COLUMN IF NOT EXISTS bloqueio_judicial JSONB`;
  await sql`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      perfil TEXT NOT NULL DEFAULT 'consulta',
      permissoes JSONB NOT NULL,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMPTZ NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sessoes (
      token TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      expira_em TIMESTAMPTZ NOT NULL
    )
  `;
}

export const bancoPronto = process.env.DATABASE_URL ? inicializarBanco() : null;

export async function garantirBanco() {
  if (!bancoPronto) throw new Error("DATABASE_URL não configurada.");
  await bancoPronto;
}

export async function inserirProcesso(processo: Processo) {
  await garantirBanco();
  await sql`
    INSERT INTO processos ${sql({
      id: processo.id,
      numero_processo: processo.numeroProcesso,
      partes: processo.partes,
      vara_comarca: processo.varaComarca,
      tipo_acao: processo.tipoAcao,
      valor_causa: processo.valorCausa,
      pedidos: processo.pedidos?.length ? JSON.stringify(processo.pedidos) : null,
      status: processo.status,
      prazo_vencimento: processo.prazoVencimento,
      andamento_atual: processo.andamentoAtual,
      resumo: processo.resumo,
      bloqueio_judicial: processo.bloqueioJudicial
        ? JSON.stringify(processo.bloqueioJudicial)
        : null,
      observacoes: processo.observacoes ?? null,
      nome_arquivo: processo.nomeArquivo,
      criado_em: processo.criadoEm,
    })}
  `;
}

function mapearProcesso(linha: Record<string, unknown>): Processo {
  return {
    id: String(linha.id),
    numeroProcesso: linha.numero_processo as string | null,
    partes: linha.partes as string | null,
    varaComarca: linha.vara_comarca as string | null,
    tipoAcao: linha.tipo_acao as string | null,
    valorCausa: linha.valor_causa as string | null,
    objetoCausa: linha.objeto_causa as string | null,
    pedidos: normalizarPedidos(linha.pedidos),
    status: String(linha.status),
    prazoVencimento: linha.prazo_vencimento as string | null,
    andamentoAtual: linha.andamento_atual as string | null,
    resumo: linha.resumo as string | null,
    bloqueioJudicial: normalizarBloqueioJudicial(linha.bloqueio_judicial),
    observacoes: linha.observacoes as string | null,
    nomeArquivo: linha.nome_arquivo as string | null,
    criadoEm: new Date(String(linha.criado_em)).toISOString(),
  };
}

function normalizarPedidos(valor: unknown): Pedido[] {
  let bruto = valor;
  if (typeof bruto === "string") {
    try {
      bruto = JSON.parse(bruto);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(bruto)) return [];
  return bruto.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const pedido = item as Record<string, unknown>;
    if (typeof pedido.descricao !== "string" || !pedido.descricao.trim()) return [];
    const tipo = ["fechado", "minimo", "a_apurar"].includes(String(pedido.tipo))
      ? (pedido.tipo as Pedido["tipo"])
      : "a_apurar";
    return [{
      descricao: pedido.descricao.trim(),
      valor: typeof pedido.valor === "number" && Number.isFinite(pedido.valor) ? pedido.valor : 0,
      tipo,
      destaque: pedido.destaque === true,
    }];
  });
}

export async function listarProcessos() {
  await garantirBanco();
  const linhas = await sql`SELECT * FROM processos ORDER BY criado_em DESC`;
  return linhas.map((linha) => mapearProcesso(linha));
}

export async function buscarProcessoPorId(id: string) {
  await garantirBanco();
  const [linha] = await sql`SELECT * FROM processos WHERE id = ${id}`;
  return linha ? mapearProcesso(linha) : undefined;
}

export async function atualizarStatusProcesso(id: string, status: string) {
  await garantirBanco();
  await sql`UPDATE processos SET status = ${status} WHERE id = ${id}`;
}

export async function atualizarDadosProcesso(id: string, dados: Partial<Pick<Processo, keyof Processo>>) {
  await garantirBanco();
  const permitidos = {
    numeroProcesso: "numero_processo",
    partes: "partes",
    varaComarca: "vara_comarca",
    tipoAcao: "tipo_acao",
    valorCausa: "valor_causa",
    objetoCausa: "objeto_causa",
    prazoVencimento: "prazo_vencimento",
    andamentoAtual: "andamento_atual",
    resumo: "resumo",
    observacoes: "observacoes",
  } as const;
  const presentes = Object.keys(permitidos).filter((campo) => campo in dados) as (keyof typeof permitidos)[];
  for (const campo of presentes) {
    const coluna = permitidos[campo];
    const valor = dados[campo] ?? null;
    await sql`UPDATE processos SET ${sql.unsafe(coluna)} = ${valor} WHERE id = ${id}`;
  }
}

export async function deletarProcesso(id: string) {
  await garantirBanco();
  await sql`DELETE FROM processos WHERE id = ${id}`;
}