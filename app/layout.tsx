import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vocal Studio - 练歌房",
  description: "你的个人随身录音棚",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body className="bg-black antialiased text-white">
        {children}
      </body>
    </html>
  );
}
