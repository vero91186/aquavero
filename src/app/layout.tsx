import type { Metadata } from "next";
import { Hanken_Grotesk, Young_Serif } from "next/font/google";
import "./globals.css";

const corps = Hanken_Grotesk({
  variable: "--font-corps",
  subsets: ["latin"],
});

const titre = Young_Serif({
  variable: "--font-titre",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "AquaTrack AI",
  description: "Le suivi de votre aquarium : paramètres, population, produits et conseils.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${corps.variable} ${titre.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
