import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Pass the AI Screener — Resume semantic gap analysis",
  description: "See exactly how an LLM screener reads your resume. Get your semantic alignment score, gap map, and targeted rewrites for $0.99.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Parse nonce from CSP response header (set by middleware) rather than a
  // forwarded request header, so the nonce is never exposed to API route handlers.
  const csp = (await headers()).get("content-security-policy") ?? "";
  const nonceMatch = csp.match(/'nonce-([^']+)'/);
  const nonce = nonceMatch?.[1];

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      {...(nonce ? { nonce } : {})}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
