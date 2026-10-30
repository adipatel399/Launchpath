import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./globals.css";
export const metadata: Metadata = {
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  title: "LaunchPath | From OAuth to ready.",
  description:
    "Evidence-backed OAuth setup guides, live provider research, and a preflight for your actual app.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
