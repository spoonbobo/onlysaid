"use client"

import React, { useState } from "react";
import {
    Box,
    Typography,
    Stack,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    InputAdornment,
    Button,
    SelectChangeEvent,
} from "@mui/material";
import { Lock as LockIcon, DarkMode, LightMode } from "@mui/icons-material";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useAppTheme } from "@/providers/theme_provider";

interface GeneralSettingsProps {
    isAuthenticated: boolean;
    currentLocale: string;
    onSettingsChange: (settings: any) => void;
    settings: {
        language?: string;
        theme?: string;
        [key: string]: any;
    };
}

export default function GeneralSettings({
    isAuthenticated,
    currentLocale,
    onSettingsChange,
    settings
}: GeneralSettingsProps) {
    const t = useTranslations("Settings");
    const { data: session } = useSession();
    const { isDark, toggleTheme } = useAppTheme();

    // Language options
    const languageOptions = [
        { label: "English", value: "en" },
        { label: "中文(繁體)", value: "zh-HK" },
        { label: "中文(简体)", value: "zh-CN" },
        { label: "한국어 (Korean)", value: "ko" },
        { label: "日本語 (Japanese)", value: "ja" },
        { label: "ไทย (Thai)", value: "th-TH" },
        { label: "Tiếng Việt (Vietnamese)", value: "vi-VN" },
    ];

    // Handle language change
    const handleLanguageChange = (event: SelectChangeEvent<string>) => {
        const value = event.target.value;
        onSettingsChange({
            ...settings,
            language: value
        });
    };

    // Handle theme change
    const handleThemeChange = () => {
        toggleTheme();
        const newTheme = isDark ? 'light' : 'dark';
        onSettingsChange({
            ...settings,
            theme: newTheme
        });
    };

    return (
        <Box>
            <Stack spacing={3}>
                {/* Only show user info if authenticated */}
                {isAuthenticated && session && (
                    <>
                        <Box>
                            <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                                {t("display_name")}
                                <LockIcon sx={{ ml: 1, fontSize: 'small', color: 'text.secondary' }} />
                            </Typography>
                            <TextField
                                placeholder={t("your_display_name")}
                                sx={{ maxWidth: 400 }}
                                defaultValue={session?.user?.name || ""}
                                disabled={true}
                                size="small"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <LockIcon sx={{ fontSize: 'small', color: 'text.secondary' }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                {t("managed_by_provider")}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                                {t("email")}
                                <LockIcon sx={{ ml: 1, fontSize: 'small', color: 'text.secondary' }} />
                            </Typography>
                            <TextField
                                placeholder={t("your_email")}
                                sx={{ maxWidth: 400 }}
                                defaultValue={session?.user?.email || ""}
                                disabled={true}
                                size="small"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <LockIcon sx={{ fontSize: 'small', color: 'text.secondary' }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                {t("managed_by_provider")}
                            </Typography>
                        </Box>
                    </>
                )}

                <Box>
                    <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                        {t("theme")}
                    </Typography>
                    <Button
                        variant="outlined"
                        onClick={handleThemeChange}
                        startIcon={isDark ? <LightMode /> : <DarkMode />}
                        sx={{ textTransform: 'none' }}
                    >
                        {isDark ? 'Light Mode' : 'Dark Mode'}
                    </Button>
                </Box>

                <Box>
                    <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                        {t("language")}
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>{t("select_language")}</InputLabel>
                        <Select
                            value={settings.language || currentLocale}
                            label={t("select_language")}
                            onChange={handleLanguageChange}
                        >
                            {languageOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </Stack>
        </Box>
    );
}