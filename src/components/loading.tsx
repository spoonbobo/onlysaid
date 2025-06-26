"use client";

import { Box, Typography, Stack, CircularProgress } from "@mui/material";
import { useTranslations } from "next-intl";

interface LoadingProps {
  message?: string;
  description?: string;
  fullHeight?: boolean;
}

export default function Loading({
  message,
  description,
  fullHeight = true
}: LoadingProps) {
  const t = useTranslations("Loading");

  return (
    <Box
      sx={{
        height: fullHeight ? "100vh" : "100%",
        position: "relative"
      }}
    >
      <CircularProgress
        size={40}
        sx={{
          position: "absolute",
          top: 16,
          left: 16,
          color: "primary.main"
        }}
      />

      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Typography variant="h5" sx={{ mt: 2, color: "text.primary" }}>
            {message || t("load")}
          </Typography>
          {description && (
            <Typography color="text.secondary">
              {description}
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
