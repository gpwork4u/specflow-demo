import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SpecFlow Demo",
  description: "Social community platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
