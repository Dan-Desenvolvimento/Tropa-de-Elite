import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const configuredMetaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const metaPixelId =
  configuredMetaPixelId && /^\d{5,20}$/.test(configuredMetaPixelId)
    ? configuredMetaPixelId
    : "1760053031291739";

const metaPixelBootstrap = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,
'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');
fbq('track','PageView');`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Tropa de Elite | Liderança e Gestão",
    template: "%s | Tropa de Elite",
  },
  description:
    "Treinamento prático para líderes, gerentes e empresários que querem construir equipes focadas em processos, autonomia e resultados.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          id="meta-pixel"
          dangerouslySetInnerHTML={{ __html: metaPixelBootstrap }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1" alt="" />`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
