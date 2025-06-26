"use client";

import React from "react";
import {
    Box,
    Typography,
    Stack,
    Divider,
} from "@mui/material";
import { useTranslations } from "next-intl";
import { useSelector } from 'react-redux';
import { RootState } from "@/store/store";
import DangerZone from "@/components/dashboard/danger_zone";

export default function DangerZonePage() {
    const t = useTranslations("Settings");
    const { isOwner, isAuthenticated } = useSelector((state: RootState) => state.user);

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h5" sx={{ color: 'error.main' }}>
                    {t("danger_zone")}
                </Typography>
            </Stack>
            <Divider sx={{ mb: 3 }} />

            <Box>
                <DangerZone
                    isOwner={isOwner}
                    isAuthenticated={isAuthenticated}
                />
            </Box>
        </Box>
    );
}