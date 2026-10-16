import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";
import { catalog } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Road to Ride — Путь к своей машине",
    template: "%s · Road to Ride",
  },
  description: "Какую надёжную машину на автомате можно купить за свою сумму, сколько накопить до лучшего варианта и как не нарваться на проблемы.",
  applicationName: "Road to Ride",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("rtr:theme");if(!t){t=localStorage.getItem("fm:theme");if(t)localStorage.setItem("rtr:theme",t);}if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
        <Providers>
          <Shell items={catalog}>{children}</Shell>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
