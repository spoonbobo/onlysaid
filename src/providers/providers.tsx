// src/components/providers.tsx
"use client";

import React, { useEffect } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { ThemeProvider as NextThemesProvider } from 'next-themes';

// MUI Imports
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';

import { store, persistor } from "@/store/store";
import { AuthProvider } from "@/providers/auth_provider";
import SocketProvider from "@/providers/socket_provider";
import { AppThemeProvider, useAppTheme } from "@/providers/theme_provider";
import { ToastProvider } from "@/components/ui/mui-toaster";
import { usePathname } from 'next/navigation';
import { setCurrentRoute } from '@/store/features/assistantSlice';
import { useDispatch } from "react-redux";
import { checkSessionExpiration } from "@/store/features/userSlice";
import ActivityTracker from '@/components/ActivityTracker';
import { createMuiTheme } from "@/theme/mui-theme";

// MUI Theme Provider Component that has access to theme context
function MuiThemeProvider({ children }: { children: React.ReactNode }) {
  const { isDark } = useAppTheme();
  const muiTheme = createMuiTheme(isDark);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

// Session expiration checker component
function SessionExpirationChecker() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Check session on mount
    dispatch(checkSessionExpiration());

    // Set up periodic checks
    const interval = setInterval(() => {
      dispatch(checkSessionExpiration());
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [dispatch]);

  return null; // This component doesn't render anything
}

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: any;
}) {
  const pathname = usePathname();

  // Track route changes
  React.useEffect(() => {
    if (store) {
      store.dispatch(setCurrentRoute(pathname));
    }
  }, [pathname]);

  return (
    <AuthProvider session={session}>
      <ReduxProvider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <SessionExpirationChecker />
          <ActivityTracker />
          <SocketProvider>
            <NextThemesProvider attribute="class" defaultTheme="system">
              <AppThemeProvider>
                <AppRouterCacheProvider>
                  <MuiThemeProvider>
                    <ToastProvider>
                      {children}
                    </ToastProvider>
                  </MuiThemeProvider>
                </AppRouterCacheProvider>
              </AppThemeProvider>
            </NextThemesProvider>
          </SocketProvider>
        </PersistGate>
      </ReduxProvider>
    </AuthProvider>
  );
}