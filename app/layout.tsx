import type { Metadata } from "next";
import Link from "next/link";
import AuthNav from "@/components/AuthNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Autos | Análise de processos",
  description: "Análise e acompanhamento de processos jurídicos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col md:flex-row bg-paper text-ink">
        <aside className="md:sticky md:top-0 md:h-screen md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-ink/10 bg-paper/92 backdrop-blur-md z-10">
          <div className="px-5 sm:px-6 md:px-5 py-5 md:py-7">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-paper font-serif text-lg">
                A
              </span>
              <span className="font-serif text-xl font-semibold tracking-tight">
                Autos
              </span>
              <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-widest text-ink/40 border border-ink/15 rounded-full px-2 py-0.5">
                análise
              </span>
            </Link>
          </div>
          <nav className="px-3 pb-3 md:px-4 md:pb-0 font-mono text-[11px] uppercase tracking-wide">
              <AuthNav />
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </body>
    </html>
  );
}
