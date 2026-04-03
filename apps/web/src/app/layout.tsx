import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppLayout } from "../components/app-layout";

export const metadata: Metadata = {
  title: "TripFlow - 여행 플래너",
  description:
    "월과 일정만 선택하면 최저가 항공권부터 날씨 맞춤 동선, 맛집, 준비물까지 한 번에 완성되는 올인원 여행 플래너",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0066FF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
