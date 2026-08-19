import { NextRequest, NextResponse } from "next/server";

const COOKIE_SESSAO = "autos_sessao";

export function proxy(req: NextRequest) {
  const sessao = req.cookies.get(COOKIE_SESSAO)?.value;
  if (sessao) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("retorno", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};