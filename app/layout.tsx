import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import "./pdf-viewer.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "arma",
  description: "Educational Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={playfair.variable}>{children}</body>
    </html>
  );
}

