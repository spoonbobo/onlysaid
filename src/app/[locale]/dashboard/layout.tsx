"use client";

import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Stack,
    Paper,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Chip,
} from "@mui/material";
import { useTranslations } from "next-intl";
import { Person as PersonIcon, Payment as PaymentIcon, Delete as DeleteIcon, AccountBox as AccountBoxIcon } from "@mui/icons-material";
import { motion } from "framer-motion";
import { useSelector } from 'react-redux';
import { RootState } from "@/store/store";
import { usePathname } from "next/navigation";
import Link from "next/link";

// Create motion components
const MotionBox = motion.create(Box);
const MotionStack = motion.create(Stack);

interface UserPlan {
    plan_type: 'Pro' | 'Free' | 'Enterprise';
    monthly_limit: number;
    current_usage: number;
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const t = useTranslations("Settings");
    const { isOwner, isAuthenticated, currentUser } = useSelector((state: RootState) => state.user);
    const pathname = usePathname();

    const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
    const [planLoading, setPlanLoading] = useState(false);

    // Fetch user plan information
    useEffect(() => {
        const fetchUserPlan = async () => {
            if (!isAuthenticated) return;

            setPlanLoading(true);
            try {
                const response = await fetch('/api/v2/user/usage/plan', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setUserPlan(data.data);
                }
            } catch (error) {
                console.error('Error fetching user plan:', error);
            } finally {
                setPlanLoading(false);
            }
        };

        fetchUserPlan();
    }, [isAuthenticated]);

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                duration: 0.4,
                when: "beforeChildren",
                staggerChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    };

    // Navigation items
    const navItems = [
        {
            icon: PersonIcon,
            label: t("overview"),
            path: "/dashboard/",
            visible: true,
            color: undefined
        },
        {
            icon: PaymentIcon,
            label: t("subscription"),
            path: "/dashboard/subscription",
            visible: isAuthenticated,
            color: undefined
        },
        {
            icon: DeleteIcon,
            label: t("danger_zone"),
            path: "/dashboard/danger_zone",
            visible: isAuthenticated && isOwner,
            color: "error"
        }
    ];

    const isPro = userPlan?.plan_type === 'Pro' || userPlan?.plan_type === 'Enterprise';

    return (
        <MotionBox
            sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
            }}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <MotionStack
                direction={{ xs: "column", md: "row" }}
                spacing={3}
                variants={itemVariants}
                sx={{
                    height: '100%',
                    overflow: 'hidden'
                }}
            >
                {/* Left sidebar with title above */}
                <Box
                    sx={{
                        width: { xs: '100%', md: 250 },
                        height: 'fit-content'
                    }}
                >
                    {/* Title Section - Above sidebar only */}
                    <Box sx={{ mb: 3 }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <AccountBoxIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                            <Box>
                                <Typography
                                    variant="h5"
                                    sx={{
                                        color: 'text.primary',
                                        fontWeight: 600,
                                        mb: 0.5
                                    }}
                                >
                                    {currentUser?.username || "User"}
                                </Typography>
                                {userPlan && (
                                    <Chip
                                        label={isPro ? "Pro" : "Free"}
                                        color={isPro ? 'primary' : 'default'}
                                        size="small"
                                        variant="outlined"
                                    />
                                )}
                            </Box>
                        </Stack>
                    </Box>

                    <Paper
                        elevation={1}
                        sx={{
                            overflow: 'hidden',
                            bgcolor: 'background.paper'
                        }}
                    >
                        <List dense>
                            {navItems.filter(item => item.visible).map((item) => (
                                <Link key={item.path} href={item.path} passHref style={{ textDecoration: 'none' }}>
                                    <ListItemButton
                                        selected={pathname === item.path}
                                        sx={{
                                            borderLeft: pathname === item.path ? 3 : 0,
                                            borderLeftColor: 'primary.main',
                                            '&.Mui-selected': {
                                                bgcolor: 'action.selected',
                                                '&:hover': {
                                                    bgcolor: 'action.selected',
                                                },
                                            },
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            <item.icon
                                                sx={{
                                                    color: item.color === 'error' ? 'error.main' :
                                                        pathname === item.path ? 'primary.main' : 'text.secondary'
                                                }}
                                            />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={item.label}
                                            sx={{
                                                '& .MuiTypography-root': {
                                                    color: item.color === 'error' ? 'error.main' :
                                                        pathname === item.path ? 'primary.main' : 'text.primary',
                                                    fontWeight: pathname === item.path ? 600 : 400
                                                }
                                            }}
                                        />
                                    </ListItemButton>
                                </Link>
                            ))}
                        </List>
                    </Paper>
                </Box>

                {/* Main content */}
                <Box sx={{ flex: 1 }}>
                    <Paper
                        elevation={1}
                        sx={{
                            p: 3,
                            height: '100%',
                            overflow: 'auto',
                            bgcolor: 'background.paper'
                        }}
                    >
                        {children}
                    </Paper>
                </Box>
            </MotionStack>
        </MotionBox>
    );
}