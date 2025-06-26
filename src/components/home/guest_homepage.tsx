"use client";

import React from "react";
import {
    Box,
    Container,
    Typography,
    Stack,
    Button,
    useTheme,
    Paper
} from "@mui/material";
import { motion } from "framer-motion";
import {
    ChatBubble as MessageSquareIcon,
    Book as BookIcon,
    Task as TasksIcon,
    Build as ToolsIcon
} from "@mui/icons-material";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

const MotionBox = motion.create(Box);
const MotionPaper = motion.create(Paper);
const MotionTypography = motion.create(Typography);

interface GuestHomePageProps {
    textColor: string;
    textColorSecondary: string;
    borderColor: string;
    sectionBgColor: string;
    cardBgColor: string;
    cardBorderColor: string;
    cardHoverBorderColor: string;
    dividerColor: string;
    highlightColor: string;
}

export function GuestHomePage({
    textColor,
    textColorSecondary,
    borderColor,
    sectionBgColor,
    cardBgColor,
    cardBorderColor,
    cardHoverBorderColor,
    dividerColor,
    highlightColor
}: GuestHomePageProps) {
    const t = useTranslations("Home");
    const router = useRouter();
    const theme = useTheme();

    const featureCards = [
        {
            id: "chatroom",
            title: t("chatroom_title") || "Chatroom",
            description: t("chatroom_description") || "Chat with your team and AI agents to create executable plans",
            icon: MessageSquareIcon,
            color: theme.palette.secondary.main,
        },
        {
            id: "plans",
            title: t("plans_title") || "Plans",
            description: t("plans_description") || "Organizing and tracking tasks efficiently",
            icon: TasksIcon,
            color: theme.palette.success.main,
        },
        {
            id: "workbench",
            title: t("workbench_title") || "Workbench",
            description: t("workbench_description") || "Access tools and resources to enhance your productivity",
            icon: ToolsIcon,
            color: theme.palette.warning.main,
        },
    ];

    // Animation variants for consistent effects
    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: 0.1 * i,
                duration: 0.5,
                ease: "easeOut"
            }
        })
    };

    return (
        <Box sx={{ width: '100%', overflowX: 'hidden', overflowY: 'visible' }}>
            <Container
                maxWidth="xl"
                sx={{
                    px: { xs: 2, md: 3 },
                    py: 3,
                    position: 'relative'
                }}
            >
                <MotionBox
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    sx={{ width: '100%' }}
                >
                    {/* Hero Section */}
                    <MotionPaper
                        initial={{ opacity: 0, y: 0 }}
                        animate={{ opacity: 1, y: 0 }}
                        elevation={0}
                        sx={{
                            position: 'relative',
                            borderRadius: 4,
                            overflow: 'hidden',
                            mb: 6,
                            p: { xs: 4, md: 6 },
                            backgroundColor: 'white',
                            minHeight: { xs: 'auto', md: 400 },
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            border: `2px solid transparent`,
                            backgroundImage: 'linear-gradient(white, white), linear-gradient(45deg, rgba(138,43,226,0.5), rgba(0,191,255,0.5), rgba(138,43,226,0))',
                            backgroundOrigin: 'border-box',
                            backgroundClip: 'content-box, border-box'
                        }}
                    >
                        {/* Animated particles */}
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                opacity: 0.3,
                                zIndex: 0,
                                overflow: 'hidden'
                            }}
                        >
                            {[...Array(15)].map((_, i) => (
                                <Box
                                    key={i}
                                    component={motion.div}
                                    animate={{
                                        y: [0, -20, 0],
                                        x: [0, Math.random() * 20 - 10, 0],
                                        opacity: [0.5, 1, 0.5]
                                    }}
                                    transition={{
                                        duration: Math.random() * 5 + 3,
                                        repeat: Infinity,
                                        repeatType: "loop",
                                        delay: Math.random() * 2
                                    }}
                                    sx={{
                                        position: 'absolute',
                                        borderRadius: '50%',
                                        backgroundColor: i % 3 === 0 ? 'purple.light' : i % 3 === 1 ? 'primary.light' : 'info.light',
                                        width: `${Math.random() * 8 + 4}px`,
                                        height: `${Math.random() * 8 + 4}px`,
                                        left: `${Math.random() * 100}%`,
                                        top: `${Math.random() * 100}%`
                                    }}
                                />
                            ))}
                        </Box>

                        <Stack
                            direction="column"
                            alignItems="center"
                            sx={{
                                position: 'relative',
                                zIndex: 1,
                                maxWidth: 800
                            }}
                        >
                            <Typography
                                component={motion.h1}
                                variant="h2"
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                sx={{
                                    color: 'black',
                                    textAlign: 'center',
                                    mb: 2,
                                    letterSpacing: 'tight',
                                    fontWeight: 'bold',
                                    lineHeight: 1.2,
                                    fontSize: { xs: '2rem', md: '3rem', lg: '4rem' }
                                }}
                            >
                                {t("guest_welcome") || "Welcome to Onlysaid"}
                            </Typography>

                            <Typography
                                component={motion.div}
                                variant="h5"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                sx={{
                                    color: 'grey.700',
                                    fontSize: { xs: '1rem', md: '1.25rem', lg: '1.5rem' },
                                    maxWidth: 700,
                                    textAlign: 'center',
                                    mb: 4,
                                    fontWeight: 'medium',
                                    letterSpacing: 'wide',
                                    lineHeight: 1.6
                                }}
                            >
                                {t("guest_welcome_message") || "Intelligent team collaboration powered by AI agents and modern workflow tools"}
                            </Typography>

                            {/* Button group */}
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={2}
                                component={motion.div}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
                            >
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={() => router.push("/signin")}
                                    component={motion.button}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    sx={{
                                        px: 4,
                                        py: 1.5,
                                        borderRadius: 8,
                                        backgroundColor: 'primary.main',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '1.125rem',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                        '&:hover': {
                                            backgroundColor: 'primary.dark',
                                            boxShadow: '0 6px 15px rgba(0,0,0,0.15)'
                                        }
                                    }}
                                >
                                    {t("get_started") || "Get Started Now"}
                                </Button>

                                <Button
                                    variant="outlined"
                                    size="large"
                                    component={motion.button}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    sx={{
                                        px: 4,
                                        py: 1.5,
                                        borderRadius: 8,
                                        backgroundColor: 'transparent',
                                        color: 'grey.700',
                                        fontWeight: 'bold',
                                        fontSize: '1.125rem',
                                        border: '1px solid',
                                        borderColor: 'grey.300',
                                        '&:hover': {
                                            backgroundColor: 'grey.50',
                                            borderColor: 'grey.400'
                                        }
                                    }}
                                >
                                    {t("learn_more") || "Learn More"}
                                </Button>
                            </Stack>
                        </Stack>
                    </MotionPaper>

                    {/* Feature Cards */}
                    <Box sx={{ mb: 8 }}>
                        <Typography
                            component={motion.h2}
                            variant="h3"
                            custom={2}
                            variants={fadeInUp}
                            initial="hidden"
                            animate="visible"
                            sx={{
                                mb: 4,
                                color: 'black',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                fontSize: { xs: '1.875rem', md: '2.25rem' }
                            }}
                        >
                            {t("guest_features_title") || "Why Choose Onlysaid?"}
                        </Typography>

                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                                gap: { xs: 3.5, md: 4.5 },
                                maxWidth: 1200,
                                mx: 'auto'
                            }}
                        >
                            {featureCards.map((card, index) => {
                                const IconComponent = card.icon;
                                return (
                                    <MotionBox
                                        key={card.id}
                                        custom={index + 4}
                                        variants={fadeInUp}
                                        initial="hidden"
                                        animate="visible"
                                        whileHover={{
                                            y: -10,
                                            transition: { duration: 0.3 }
                                        }}
                                        sx={{
                                            backgroundColor: cardBgColor,
                                            p: 4,
                                            borderRadius: 3,
                                            boxShadow: 3,
                                            border: `1px solid ${cardBorderColor}`,
                                            height: '100%',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            '&:hover': {
                                                borderColor: card.color,
                                                boxShadow: 6
                                            }
                                        }}
                                    >
                                        {/* Subtle background gradient */}
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                background: `linear-gradient(to bottom right, ${card.color}15, transparent)`,
                                                opacity: 0.8,
                                                borderRadius: 3
                                            }}
                                        />

                                        <Stack direction="column" sx={{ height: '100%', position: 'relative' }}>
                                            <Stack direction="row" alignItems="center" sx={{ mb: 2.5 }}>
                                                <Box
                                                    sx={{
                                                        p: 2,
                                                        borderRadius: '50%',
                                                        backgroundColor: `${card.color}20`,
                                                        color: card.color,
                                                        mr: 2,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    <IconComponent sx={{ fontSize: '2rem' }} />
                                                </Box>
                                                <Typography variant="h6" sx={{ color: textColor, fontWeight: 'bold' }}>
                                                    {card.title}
                                                </Typography>
                                            </Stack>
                                            <Typography
                                                variant="body1"
                                                sx={{
                                                    color: textColorSecondary,
                                                    flex: 1
                                                }}
                                            >
                                                {card.description}
                                            </Typography>
                                        </Stack>
                                    </MotionBox>
                                );
                            })}
                        </Box>
                    </Box>

                    {/* Footer info */}
                    <Stack
                        direction="column"
                        alignItems="center"
                        component={motion.div}
                        custom={13}
                        variants={fadeInUp}
                        initial="hidden"
                        animate="visible"
                        sx={{ mb: 2 }}
                    >
                        <Typography
                            variant="body1"
                            sx={{
                                textAlign: 'center',
                                color: 'grey.700',
                                mt: 2,
                                fontWeight: 'medium'
                            }}
                        >
                            {t("guest_footer") || "Making team collaboration intelligent and efficient"}
                        </Typography>
                    </Stack>
                </MotionBox>
            </Container>
        </Box>
    );
} 