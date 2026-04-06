import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"], 
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Konsultasi Pakar Anak", // Mengubah judul tab browser
  description: "Sistem pakar diagnosis awal kesehatan anak berbasis AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id" // Mengubah bahasa default ke Indonesia
      className={`${nunito.variable} h-full antialiased`}
    >
      {/* Menerapkan font Nunito ke seluruh body aplikasi */}
      <body className={`${nunito.className} min-h-full flex flex-col`}>
        {children}
      </body>
    </html>
  );
}