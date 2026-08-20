This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Produção

O projeto usa PostgreSQL no Neon para manter processos, usuários e sessões persistentes, e pode ser hospedado como Web Service no Render.

No Render, crie um Web Service apontando para o repositório GitHub e use:

```text
Build Command: npm ci && npm run build
Start Command: npm run start
Health Check Path: /
```

Configure `DATABASE_URL` e `ANTHROPIC_API_KEY` no painel do Render. O arquivo `render.yaml` já contém essa configuração como Blueprint.

Para preservar os dados do SQLite local, configure temporariamente a URL do Neon e execute:

```bash
npm run migrar:sqlite
```

O comando lê `data/processos.db` e não duplica registros já migrados.
