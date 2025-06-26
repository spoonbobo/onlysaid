"use client";

import React from "react";
import { Box, Typography, Stack } from "@mui/material";
import { motion } from "framer-motion";
import { IconType } from "react-icons";

const MotionBox = motion.create(Box);

interface NavigationCardProps {
    card: {
        id: string;
        title: string;
        description: string;
        icon: IconType;
        color: string;
        path: string;
    };
    index: number;
    onClick: () => void;
    bgColor: string;
    borderColor: string;
    hoverBorderColor: string;
    textColor: string;
    textColorSecondary: string;
}

export function NavigationCard({
    card,
    index,
    onClick,
    bgColor,
    borderColor,
    hoverBorderColor,
    textColor,
    textColorSecondary
}: NavigationCardProps) {
    const IconComponent = card.icon;

    return (
        <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (index + 1), duration: 0.3 }}
            onClick={onClick}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: bgColor,
                p: 3,
                borderRadius: 3,
                boxShadow: 1,
                border: `1px solid ${borderColor}`,
                cursor: 'pointer',
                height: '100%',
                transition: 'all 0.2s ease',
                '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: 4,
                    borderColor: hoverBorderColor,
                }
            }}
        >
            <Stack direction="row" alignItems="flex-start" spacing={1.5} sx={{ mb: 2 }}>
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: `${card.color}15`,
                        color: card.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <IconComponent size={24} />
                </Box>
                <Typography variant="h6" sx={{ color: textColor, fontWeight: 'medium' }}>
                    {card.title}
                </Typography>
            </Stack>
            <Typography
                variant="body2"
                sx={{
                    color: textColorSecondary,
                    fontSize: '0.875rem',
                    flex: 1
                }}
            >
                {card.description}
            </Typography>
        </MotionBox>
    );
} 