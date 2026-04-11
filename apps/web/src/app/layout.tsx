import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KinSync – Your family, in sync",
  description: "Keep your family coordinated with shared calendars, events, and more.",
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
