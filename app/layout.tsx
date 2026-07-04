import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

// Geist 是 Next.js 推荐的一款免费字体，清晰好读
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "简历评分分析器",
  description: "上传简历，匹配 JD，智能打分，精准改进",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable}`}>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
