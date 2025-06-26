"use client";

import { SessionProvider } from "next-auth/react";

export function AuthProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: any;
}) {
  return (
    <SessionProvider
      session={session}
      refetchInterval={1000 * 60 * 5}
      refetchOnWindowFocus={false} // need enable it to prevent bugs.
    >
      {children}
    </SessionProvider>
  );
}
