import { spawn } from "node:child_process";
import path from "node:path";

export async function extrairTextoDoPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const resultado = await parser.getText();
    if (resultado.text.trim().length >= 30) {
      return resultado.text;
    }
  } finally {
    await parser.destroy();
  }
  return extrairTextoComOcr(buffer);
}

function extrairTextoComOcr(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const processo = spawn(process.execPath, [path.join(process.cwd(), "lib", "ocr-worker.cjs")], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    const saida: Buffer[] = [];
    const erros: Buffer[] = [];
    const timeout = setTimeout(() => {
      processo.kill();
      reject(new Error("OCR excedeu o tempo limite."));
    }, 180_000);

    processo.stdout.on("data", (parte: Buffer) => saida.push(parte));
    processo.stderr.on("data", (parte: Buffer) => erros.push(parte));
    processo.once("error", (erro) => {
      clearTimeout(timeout);
      reject(erro);
    });
    processo.once("close", (codigo) => {
      clearTimeout(timeout);
      if (codigo !== 0) {
        reject(new Error(`OCR falhou (${codigo}): ${Buffer.concat(erros).toString()}`));
        return;
      }
      try {
        const resultado = JSON.parse(Buffer.concat(saida).toString()) as { texto?: string };
        resolve(resultado.texto ?? "");
      } catch (erro) {
        reject(erro);
      }
    });
    processo.stdin.end(buffer);
  });
}
