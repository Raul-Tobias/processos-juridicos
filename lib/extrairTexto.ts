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
  return "";
}
