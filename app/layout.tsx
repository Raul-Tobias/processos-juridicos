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
        <aside className="md:fixed md:inset-y-0 md:left-0 md:w-[228px] shrink-0 border-b md:border-b-0 md:border-r border-[#dedad0] bg-[#fbfaf6] z-10 flex flex-col">
          <div className="px-5 py-5">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-paper font-serif text-lg shadow-sm">
                A
              </span>
              <span className="font-serif text-xl font-semibold tracking-tight">
                Autos
              </span>
              <span className="hidden sm:inline text-[9px] font-mono uppercase tracking-widest text-ink/45 border border-[#dedad0] rounded-full px-2 py-0.5">
                análise
              </span>
            </Link>
          </div>
          <nav className="px-3 pb-3 font-sans text-[12px]">
              <AuthNav />
          </nav>
        </aside>
        <main className="flex-1 min-w-0 md:ml-[228px]">{children}</main>
      </body>
    </html>
  );
}
