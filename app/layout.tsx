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
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <header className="border-b border-ink/10 sticky top-0 bg-paper/92 backdrop-blur-md z-10">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 h-[4.5rem] flex items-center justify-between gap-6">
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
            <nav className="flex items-center gap-0.5 sm:gap-1 font-mono text-[11px] sm:text-[12px] uppercase tracking-wide">
              <AuthNav />
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
