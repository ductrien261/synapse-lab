import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/marketing";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Synapse Lab — Nền tảng học tập trực quan tích hợp AI",
    template: "%s | Synapse Lab",
  },
  description: SITE.description,
  applicationName: "Synapse Lab",
  keywords: [
    "học tập trực quan",
    "nền tảng học tập tương tác",
    "mô hình 3D",
    "mô phỏng giải thuật",
    "trợ lý AI học tập",
    "giải phẫu 3D",
    "ôn tập lặp lại ngắt quãng",
  ],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Synapse Lab",
    title: "Synapse Lab — Nền tảng học tập trực quan tích hợp AI",
    description: SITE.description,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
