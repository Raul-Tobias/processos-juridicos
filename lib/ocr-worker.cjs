/* eslint-disable @typescript-eslint/no-require-imports */

async function main() {
  const partes = [];
  for await (const parte of process.stdin) partes.push(parte);
  const buffer = Buffer.concat(partes);
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { createCanvas } = require("@napi-rs/canvas");
  const { createWorker } = require("tesseract.js");
  const documento = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableAutoFetch: true,
    disableStream: true,
  }).promise;
  let worker;

  try {
    worker = await createWorker("por", 1, {
      langPath: process.cwd(),
      gzip: false,
    });
    const paginas = [];
    const total = Math.min(documento.numPages, 20);

    for (let numero = 1; numero <= total; numero += 1) {
      const pagina = await documento.getPage(numero);
      try {
        const original = pagina.getViewport({ scale: 1 });
        const maior = Math.max(original.width, original.height);
        const escala = Math.min(1.5, 1800 / maior);
        const viewport = pagina.getViewport({ scale: escala });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        await pagina.render({
          canvasContext: canvas.getContext("2d"),
          viewport,
        }).promise;
        const resultado = await worker.recognize(canvas.toBuffer("image/png"));
        paginas.push(resultado.data.text);
      } finally {
        pagina.cleanup();
      }
    }

    process.stdout.write(JSON.stringify({ texto: paginas.join("\n\n") }));
  } finally {
    if (worker) await worker.terminate();
    await documento.destroy();
  }
}

main().catch((erro) => {
  process.stderr.write(`${erro?.stack || erro}\n`);
  process.exitCode = 1;
});
