"use client";

import React from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Paper,
} from "@mui/material";
import { motion } from "framer-motion";
import {
  Chat as ChatIcon,
  Language as LanguageIcon,
  Security as SecurityIcon,
  Extension as ExtensionIcon,
  Download as DownloadIcon,
  MenuBook as DocsIcon,
} from "@mui/icons-material";
import { useTranslations } from "next-intl";

const MotionBox = motion.create(Box);
const MotionPaper = motion.create(Paper);

export default function HomePage() {
  const t = useTranslations("Home");

  const features = [
    {
      icon: ChatIcon,
      title: t("natural_language_collaboration"),
      description: t("natural_language_collaboration_description")
    },
    {
      icon: ExtensionIcon,
      title: t("agentic_stack"),
      description: t("agentic_stack_description")
    },
    {
      icon: LanguageIcon,
      title: t("intelligent_planning"),
      description: t("intelligent_planning_description")
    },
    {
      icon: SecurityIcon,
      title: t("privacy_preserved"),
      description: t("privacy_preserved_description")
    }
  ];

  return (
    <Box
      sx={{
        width: "100%",
        background: "linear-gradient(135deg, rgba(138,43,226,0.05) 0%, rgba(0,191,255,0.05) 100%)"
      }}
    >
      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* Hero Section */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          textAlign="center"
          sx={{ mb: 8 }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "2.5rem", md: "3.5rem" },
              fontWeight: "bold",
              mb: 3,
              background: "linear-gradient(135deg, #8A2BE2, #00BFFF)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            Onlysaid
          </Typography>

          <Typography
            variant="h4"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: "800px", mx: "auto", lineHeight: 1.5 }}
          >
            {t("hero_subtitle")}
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
          >
            <Button
              variant="contained"
              size="large"
              href="https://github.com/spoonbobo/onlysaid/releases"
              target="_blank"
              startIcon={<DownloadIcon />}
              sx={{ px: 4, py: 1.5 }}
            >
              {t("download")}
            </Button>
            <Button
              variant="outlined"
              size="large"
              href="https://onlysaid.com/docs/#/"
              target="_blank"
              startIcon={<DocsIcon />}
              sx={{ px: 4, py: 1.5 }}
            >
              {t("docs")}
            </Button>
          </Stack>
        </MotionBox>

        {/* Features Section */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          sx={{ mb: 8 }}
        >
          <Typography
            variant="h3"
            textAlign="center"
            sx={{ mb: 6, fontWeight: "bold" }}
          >
            {t("features")}
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
              gap: 3
            }}
          >
            {features.map((feature, index) => (
              <MotionPaper
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                elevation={2}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  border: 1,
                  borderColor: "divider",
                  height: "100%"
                }}
              >
                <Stack direction="row" alignItems="flex-start" spacing={2}>
                  <Box
                    sx={{
                      p: 1.5,
                      backgroundColor: "primary.light",
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <feature.icon sx={{ fontSize: "1.5rem", color: "primary.main" }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                      {feature.title}
                    </Typography>
                    <Typography color="text.secondary">
                      {feature.description}
                    </Typography>
                  </Box>
                </Stack>
              </MotionPaper>
            ))}
          </Box>
        </MotionBox>
      </Container>
    </Box>
  );
}
