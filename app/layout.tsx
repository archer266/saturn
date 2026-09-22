import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saturn — Plan your day. Find your calm.",
  description:
    "A weather-aware daily planner with mood check-ins, focus tools, breathing resets, and a positive Magic 8 Ball.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
