import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AnaliseProcesso {
  numeroProcesso: string | null;
  partes: string | null;
  varaComarca: string | null;
  tipoAcao: string | null;
  valorCausa: string | null;
  status: "em_andamento" | "urgente" | "aguardando" | "arquivado";
  prazoVencimento: string | null; // formato YYYY-MM-DD ou null
  andamentoAtual: string | null;
  resumo: string | null;
}

const PROMPT_SISTEMA = `Você é um assistente especializado em análise de processos jurídicos brasileiros.
Você receberá o texto extraído de um documento de processo judicial e deve retornar APENAS um JSON
(sem markdown, sem texto adicional, sem \`\`\`) com os seguintes campos:

{
  "numeroProcesso": string ou null,
  "partes": string ou null (ex: "João Silva x Empresa XYZ Ltda"),
  "varaComarca": string ou null,
  "tipoAcao": string ou null,
  "valorCausa": string ou null (ex: "R$ 15.000,00"),
  "status": um de "em_andamento" | "urgente" | "aguardando" | "arquivado",
  "prazoVencimento": string no formato YYYY-MM-DD ou null (próximo prazo relevante, se houver),
  "andamentoAtual": string ou null (breve descrição do último andamento),
  "resumo": string ou null (resumo de até 3 frases do processo)
}

Use "urgente" quando houver prazo em até 5 dias corridos a partir de hoje ou termos como "urgente", "liminar".
Se não conseguir identificar um campo com confiança, retorne null para ele. Nunca invente números de processo ou datas.`;

export async function analisarProcessoComIA(
  textoDocumento: string
): Promise<AnaliseProcesso> {
  const textoTruncado = textoDocumento.slice(0, 50000); // proteção contra documentos gigantes

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: PROMPT_SISTEMA,
    messages: [
      {
        role: "user",
        content: `Data de hoje: ${new Date().toISOString().slice(0, 10)}\n\nTexto do processo:\n\n${textoTruncado}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Resposta da IA não retornou texto.");
  }

  const limpo = textBlock.text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(limpo) as AnaliseProcesso;
  } catch {
    throw new Error("Não foi possível interpretar a resposta da IA como JSON.");
  }
}

export async function analisarPdfComIA(
  buffer: Buffer
): Promise<AnaliseProcesso> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: PROMPT_SISTEMA,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: buffer.toString("base64"),
            },
          },
          {
            type: "text",
            text: `Data de hoje: ${new Date().toISOString().slice(0, 10)}\n\nAnalise este processo e retorne o JSON solicitado.`,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Resposta da IA não retornou texto.");
  }

  const limpo = textBlock.text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(limpo) as AnaliseProcesso;
  } catch {
    throw new Error("Não foi possível interpretar a resposta da IA como JSON.");
  }
}
