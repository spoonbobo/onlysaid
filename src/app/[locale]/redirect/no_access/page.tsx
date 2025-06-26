"use client";

import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Box,
    Typography,
    Container,
    Paper,
    Stack,
    IconButton
} from "@mui/material";
import { Warning as WarningIcon, Home as HomeIcon } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

const MotionBox = motion.create(Box);

export default function NoAccessPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations("Errors");
    const reason = searchParams.get("reason") || t("default_no_access");
    const [countdown, setCountdown] = useState(5);

    const { currentUser, isAuthenticated, isLoading, isOwner } = useSelector((state: RootState) => state.user);

    // Countdown and redirect
    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timer) clearInterval(timer);
        };
    }, [countdown]);

    // Separate effect for navigation
    useEffect(() => {
        if (countdown === 0) {
            const redirectTimeout = setTimeout(() => {
                router.push(`/${currentUser?.lastOpenedTeam || ""}`);
            }, 100);

            return () => clearTimeout(redirectTimeout);
        }
    }, [countdown, router]);

    return (
        <Container
            maxWidth="lg"
            sx={{
                px: { xs: 2, md: 3, lg: 4 },
                py: 2,
                height: '100%',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <MotionBox
                sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    position: 'relative'
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <Typography
                    variant="h4"
                    sx={{
                        mb: 3,
                        display: 'flex',
                        alignItems: 'center',
                        color: 'text.primary'
                    }}
                >
                    <WarningIcon sx={{ mr: 1.5, color: 'warning.main' }} />
                    {t("access_denied")}
                </Typography>

                <Paper
                    elevation={1}
                    sx={{
                        p: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 'calc(100vh - 200px)',
                        bgcolor: 'background.paper'
                    }}
                >
                    <Stack spacing={3} alignItems="center" textAlign="center">
                        <WarningIcon sx={{ fontSize: 96, color: 'warning.main' }} />

                        <Typography variant="h4" fontWeight="bold" color="text.primary">
                            {t("no_permission")}
                        </Typography>

                        <Typography
                            color="text.secondary"
                            sx={{ maxWidth: 400 }}
                        >
                            {reason}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                            {t("redirecting_in")} {countdown} {t("seconds")} {t("to_home")}...
                        </Typography>

                        <IconButton
                            size="small"
                            onClick={() => router.push("/")}
                            aria-label="Go to home"
                            sx={{
                                '&:hover': {
                                    bgcolor: 'action.hover'
                                }
                            }}
                        >
                            <HomeIcon />
                        </IconButton>
                    </Stack>
                </Paper>
            </MotionBox>
        </Container>
    );
}
