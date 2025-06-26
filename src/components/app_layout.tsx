"use client";

import React from "react";
import { Box, Container } from "@mui/material";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default function AppLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Navbar component */}
            <Navbar />

            {/* Main content area */}
            <Container
                maxWidth="xl"
                sx={{
                    pt: 10, // Add padding-top to account for fixed navbar
                    pb: 2,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <Box sx={{ flex: 1 }}>
                    {children}
                </Box>

                {/* Footer at the end of container */}
                <Footer />
            </Container>
        </Box>
    );
} 