"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Paper,
  CircularProgress
} from "@mui/material";
import { GitHub, Google, Login } from "@mui/icons-material";
import { redirect, useParams, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { toaster } from "@/components/ui/toaster";

const MotionBox = motion.create(Box);
const MotionPaper = motion.create(Paper);

export default function SigninPage() {
  const t = useTranslations("Signin");
  const [error, setError] = useState("");
  const { isAuthenticated } = useSelector((state: RootState) => state.user);
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale as string;
  const [effectiveCallbackUrl, setEffectiveCallbackUrl] = useState('');

  useEffect(() => {
    const clientType = searchParams.get('client_type');
    const electronCallbackUrl = searchParams.get('electron_callback_url');

    if (clientType === 'electron' && electronCallbackUrl) {
      setEffectiveCallbackUrl(decodeURIComponent(electronCallbackUrl));
      console.log('[SignInPage] Detected Electron flow. Effective Callback URL:', decodeURIComponent(electronCallbackUrl));
    } else {
      const webCallback = `${process.env.NEXT_PUBLIC_DOMAIN || ''}/api/redirect/third_party_login?locale=${locale}`;
      setEffectiveCallbackUrl(webCallback);
      console.log('[SignInPage] Standard web flow. Effective Callback URL:', webCallback);
    }
  }, [searchParams, locale]);

  const handleSignIn = (provider: 'google' | 'github') => {
    if (!effectiveCallbackUrl) {
      console.error("Callback URL not set yet! Cannot sign in.");
      toaster.create({
        title: "Error",
        description: "Authentication system not ready. Please try again in a moment.",
        type: "error"
      });
      return;
    }
    try {
      signIn(provider, {
        callbackUrl: effectiveCallbackUrl,
        redirect: true,
      });
    } catch (err) {
      console.error(`Error signing in with ${provider}:`, err);
      toaster.create({
        title: `Sign-in Error (${provider})`,
        description: (err as Error).message,
        type: "error"
      });
    }
  };

  if (isAuthenticated) {
    redirect(`/${locale}/dashboard`);
    return null;
  }

  if (!effectiveCallbackUrl && !searchParams.get('client_type')) {
    return (
      <Box sx={{ textAlign: 'center', mt: 10 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading authentication options...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: '600px',
        width: '100%',
        mx: 'auto',
        mt: 12,
        px: 4
      }}
    >
      <MotionPaper
        elevation={3}
        sx={{
          p: 8,
          borderRadius: 2,
          bgcolor: 'background.paper'
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Stack spacing={4} alignItems="center">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Login color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h4" component="h1" fontWeight="bold">
              {t("signin")}
            </Typography>
          </Box>

          <Typography
            variant="body1"
            color="text.secondary"
            textAlign="center"
          >
            {t("use_third_party_login")}
          </Typography>

          <Stack direction="row" spacing={3}>
            <IconButton
              size="large"
              onClick={(e) => {
                e.preventDefault();
                handleSignIn('google');
              }}
              disabled={!effectiveCallbackUrl}
              sx={{
                border: '2px solid',
                borderColor: 'divider',
                p: 2,
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover'
                }
              }}
            >
              <Google sx={{ fontSize: 32 }} />
            </IconButton>

            <IconButton
              size="large"
              onClick={(e) => {
                e.preventDefault();
                handleSignIn('github');
              }}
              disabled={!effectiveCallbackUrl}
              sx={{
                border: '2px solid',
                borderColor: 'divider',
                p: 2,
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover'
                }
              }}
            >
              <GitHub sx={{ fontSize: 32 }} />
            </IconButton>
          </Stack>

          {error && (
            <Typography color="error" textAlign="center">
              {error}
            </Typography>
          )}
        </Stack>
      </MotionPaper>
    </Box>
  );
}
