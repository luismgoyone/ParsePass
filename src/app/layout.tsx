import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";

import { SessionProvider } from "@/components/session/session-provider";
import { aiInfo } from "@/lib/extraction/provider";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Parser output, scores, rule IDs and file metadata are always monospace.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ParsePass: see what the ATS actually reads",
  description:
    "Turn any resume into a clean, ATS-friendly version and see exactly what an applicant tracking system reads, before and after.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col selection:bg-primary selection:text-primary-foreground">
        <SessionProvider ai={aiInfo()}>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter privacy={aiInfo().privacy} />
        </SessionProvider>
      </body>
    </html>
  );
}
