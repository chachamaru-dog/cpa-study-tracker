import type { Metadata } from "next";
import { Quicksand, Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";

const quicksand = Quicksand({
  variable: "--font-en",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-ja",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "公認会計士 学習トラッカー",
  description: "論点別習熟度と合格可能性を可視化する学習管理アプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${quicksand.variable} ${zenMaruGothic.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
