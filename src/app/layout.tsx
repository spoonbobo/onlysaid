import type { Metadata } from "next";
import { Roboto, Space_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/providers/providers";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import localFont from 'next/font/local'
import AppLayout from "@/components/app_layout";

const roboto = Roboto({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: "onlysaid",
  description: "onlysaid",
};

export default function RootLayout({
  children,
  session,
}: Readonly<{
  children: React.ReactNode;
  session: any;
}>) {
  return (
    <html suppressHydrationWarning>
      <body
        className={`antialiased ${roboto.className}`}
      >
        <NextIntlClientProvider>
          <Providers session={session}>
            <AppLayout>
              {children}
            </AppLayout>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
