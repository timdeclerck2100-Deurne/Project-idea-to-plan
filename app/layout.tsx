import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Fraunces } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { buildThemeStyleString, themes, THEME_STORAGE_KEY } from "@/lib/themes";

export const metadata: Metadata = {
  title: "AI Project Planner",
  description: "Generate comprehensive project briefs with AI",
};

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const themeStylesById = Object.fromEntries(
  themes.map((theme) => [theme.id, buildThemeStyleString(theme)])
);

const themeInitScript = `
(() => {
  try {
    const styles = ${JSON.stringify(themeStylesById)};
    const themeId = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) || ${JSON.stringify(themes[0].id)};
    const cssText = styles[themeId] || styles[${JSON.stringify(themes[0].id)}];
    let styleEl = document.getElementById("theme-styles");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "theme-styles";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = cssText;
  } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${ibmPlexSans.variable} ${fraunces.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
