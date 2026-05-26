import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://poe2drydream.vercel.app";
const TITLE = "PoE2 Passive Skill Tree";
const DESCRIPTION =
  "Interactive Path of Exile 2 passive skill tree planner. Pick a class, choose an ascendancy, allocate passives, and share builds via URL.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    siteName: TITLE,
    images: [
      {
        url: "/og.jpg",
        width: 1024,
        height: 541,
        alt: TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.jpg"],
  },
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
