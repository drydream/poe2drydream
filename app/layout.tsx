import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PoE2 Passive Skill Tree",
  description: "Interactive Path of Exile 2 passive skill tree planner.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
