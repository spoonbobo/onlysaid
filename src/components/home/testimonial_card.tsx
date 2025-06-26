"use client";

import React from "react";
import { Box, Typography, Stack, Avatar } from "@mui/material";
import { motion } from "framer-motion";
import { FaQuoteLeft } from "react-icons/fa";

const MotionBox = motion.create(Box);

interface TestimonialProps {
    id: string;
    name: string;
    role: string;
    company: string;
    content: string;
    avatar: string;
}

interface TestimonialCardProps {
    testimonial: TestimonialProps;
    index: number;
    bgColor: string;
    borderColor: string;
    textColor: string;
    textColorSecondary: string;
}

export function TestimonialCard({
    testimonial,
    index,
    bgColor,
    borderColor,
    textColor,
    textColorSecondary
}: TestimonialCardProps) {
    return (
        <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (index + 1), duration: 0.3 }}
            sx={{
                backgroundColor: bgColor,
                p: 2.5,
                borderRadius: 2,
                boxShadow: 1,
                border: `1px solid ${borderColor}`,
                minWidth: { xs: '100%', md: 300 },
                maxWidth: { xs: '100%', md: 350 },
                flex: 1,
                position: 'relative',
                transition: 'all 0.2s ease',
                '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: 4,
                }
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    color: 'grey.200'
                }}
            >
                <FaQuoteLeft size={20} />
            </Box>

            <Typography
                variant="body1"
                sx={{
                    color: textColor,
                    fontStyle: 'italic',
                    mb: 2,
                    lineHeight: 1.6
                }}
            >
                "{testimonial.content}"
            </Typography>

            <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    sx={{ width: 32, height: 32 }}
                />
                <Box>
                    <Typography
                        variant="body2"
                        sx={{
                            color: textColor,
                            fontWeight: 'medium'
                        }}
                    >
                        {testimonial.name}
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{
                            color: textColorSecondary
                        }}
                    >
                        {testimonial.role}, {testimonial.company}
                    </Typography>
                </Box>
            </Stack>
        </MotionBox>
    );
} 