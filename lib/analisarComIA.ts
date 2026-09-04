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
  objetoCausa: string | null;
  pedidos: Pedido[];
  status: "em_andamento" | "urgente" | "aguardando" | "arquivado";
  prazoVencimento: string | null; // formato YYYY-MM-DD ou null
  andamentoAtual: string | null;
  resumo: string | null;
  bloqueioJudicial: BloqueioJudicial | null;
}

export interface Pedido {
  descricao: string;
  valor: number;
  tipo: "fechado" | "minimo" | "a_apurar";
  destaque: boolean;
}

export interface BloqueioJudicial {
  identificado: "sim" | "nao" | "nao_identificado";
  valor: string | null;
  data: string | null;
  contas: string[];
  manifestacaoDesbloqueio: {
    identificada: "sim" | "nao" | "nao_identificado";
    detalhes: string | null;
    data: string | null;
  };
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
  "objetoCausa": string ou null (síntese objetiva do que é pedido na ação e do direito ou bem discutido),
  "pedidos": array de objetos com todos os pedidos e verbas identificados na seção "DOS PEDIDOS" ou equivalente, em ordem de aparição, cada um com:
    {
      "descricao": string curta e específica do pedido,
      "valor": número em reais sem símbolo ou separador de milhar (0 quando não houver valor informado),
      "tipo": "fechado" quando houver valor definido, "minimo" quando o texto disser "não inferior a" ou equivalente, "a_apurar" quando depender de liquidação ou não tiver valor,
      "destaque": boolean (true para dano moral, pedidos de maior valor ou verbas expressamente quantificadas)
    },
  "status": um de "em_andamento" | "urgente" | "aguardando" | "arquivado",
  "prazoVencimento": string no formato YYYY-MM-DD ou null (próximo prazo relevante, se houver),
  "andamentoAtual": string ou null (breve descrição do último andamento),
  "resumo": string ou null (resumo de até 3 frases do processo),
  "bloqueioJudicial": objeto ou null, com:
    {
      "identificado": "sim" | "nao" | "nao_identificado",
      "valor": string ou null (valor bloqueado, como aparece no documento),
      "data": string ou null (data do bloqueio no formato YYYY-MM-DD quando possível),
      "contas": array de strings (banco, agência, conta ou instituição identificados),
      "manifestacaoDesbloqueio": {
        "identificada": "sim" | "nao" | "nao_identificado",
        "detalhes": string ou null (síntese do pedido de desbloqueio),
        "data": string ou null (data da manifestação no formato YYYY-MM-DD quando possível)
      }
    }
}

Extraia também pedidos descritos por letras (a., b., c. etc.) e os itens do bloco "Das verbas", mesmo quando aparecem em páginas seguintes. Não descarte pedidos sem valor: use valor 0 e tipo "a_apurar". Converta valores como "R$ 4.025,93" para 4025.93. Evite duplicar um pedido geral e sua verba detalhada, mas mantenha as verbas detalhadas quando trouxerem valores individuais.
Use "urgente" quando houver prazo em até 5 dias corridos a partir de hoje ou termos como "urgente", "liminar".
Se não conseguir identificar um campo com confiança, retorne null para ele. Nunca invente números de processo ou datas.`;

export async function analisarProcessoComIA(
  textoDocumento: string
): Promise<AnaliseProcesso> {
  const textoTruncado = textoDocumento.slice(0, 50000); // proteção contra documentos gigantes

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3072,
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
  buffer: Buffer,
  textoOcr = ""
): Promise<AnaliseProcesso> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3072,
    system: `${PROMPT_SISTEMA}

  Este é um PDF escaneado. Examine visualmente todas as páginas e leia os textos impressos nas imagens, incluindo cabeçalhos, números, datas, partes, prazos e autos de infração. Não responda que o PDF não possui texto: use a informação visual das páginas.`,
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
            text: `Data de hoje: ${new Date().toISOString().slice(0, 10)}

          Leia visualmente todas as páginas deste PDF escaneado. Extraia os dados identificáveis mesmo que estejam em imagens. Para este documento, dê prioridade a número do processo, partes, órgão/vara, tipo de procedimento, objeto da causa, valor da causa, seção DOS PEDIDOS e bloco DAS VERBAS. Capture pedidos com e sem valores, inclusive os itens que continuam nas páginas seguintes. Retorne somente o JSON solicitado; não use null para todos os campos se houver texto legível.

Transcrição auxiliar produzida por OCR. Use-a para conferir números e nomes, mas sempre valide contra a imagem do PDF:
${textoOcr.slice(0, 50000)}`,
          },
        ],
      },
    ],
  }, {
    headers: {
      "anthropic-beta": "pdfs-2024-09-25",
    },
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
