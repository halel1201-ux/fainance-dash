import type { Metadata } from "next";
import { Heebo, Playfair_Display } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700", "900"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700", "900"],
});

export const metadata: Metadata = {
  title: "פתרונות פיננסיים לישראל — ניהול משכנתאות ופיננסים",
  description:
    "פלטפורמת ניהול לידים ומימון: מאגר לקוחות משותף, מנוע יחס החזר (PTI/LTV), והצעות מימון מתחרות במקום אחד.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}