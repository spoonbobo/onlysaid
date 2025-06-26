"use client";

import React, { useState } from "react";
import { Box, Typography, Popover, useTheme } from "@mui/material";
import { motion } from "framer-motion";

const MotionBox = motion.create(Box);

interface FeatureItemProps {
    color: string;
    title: string;
    description: string;
    textColor: string;
    textColorSecondary: string;
    cardBorderColor: string;
}

export function FeatureItem({
    color,
    title,
    description,
    textColor,
    textColorSecondary,
    cardBorderColor
}: FeatureItemProps) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const theme = useTheme();

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);

    return (
        <MotionBox
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.8 }
                }}
                onClick={handleClick}
            >
                <Box
                    sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: color,
                        marginRight: 1
                    }}
                />
                <Typography variant="body2" sx={{ color: textColor, fontSize: '0.875rem' }}>
                    {title}
                </Typography>
            </Box>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                slotProps={{
                    paper: {
                        sx: {
                            maxWidth: 250,
                            p: 1,
                            border: `1px solid ${cardBorderColor}`,
                            backgroundColor: theme.palette.mode === 'dark' ? 'grey.800' : 'white'
                        }
                    }
                }}
            >
                <Typography variant="caption" sx={{ color: textColorSecondary, fontSize: '0.75rem' }}>
                    {description}
                </Typography>
            </Popover>
        </MotionBox>
    );
} 