"use client";

import React from "react";
import { AppBar, Toolbar, Typography, Button, Box, Container } from "@mui/material";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";
import { useParams } from "next/navigation";
import { RootState } from "@/store/store";

const NavBar = () => {
  const t = useTranslations("Navbar");
  const { currentUser, isAuthenticated } = useSelector(
    (state: RootState) => state.user
  );
  const params = useParams();
  const isLoggedIn = isAuthenticated;
  const locale = currentUser?.settings?.general?.language || params.locale as string;

  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundColor: 'transparent',
        backgroundImage: 'none',
        color: 'inherit',
        boxShadow: 'none',
        border: 'none',
        '&::before': {
          display: 'none'
        }
      }}
      elevation={0}
    >
      <Container maxWidth="xl">
        <Toolbar sx={{
          justifyContent: 'space-between',
          px: 0,
          py: 1,
          backgroundColor: 'transparent'
        }}>
          {/* Left side - Logo/Title */}
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 'bold',
              color: 'inherit',
              cursor: 'pointer',
              textDecoration: 'none'
            }}
            onClick={() => window.location.href = `/${locale}`}
          >
            {process.env.NEXT_PUBLIC_APP_NAME || 'STP Demo1'}
          </Typography>

          {/* Center - Empty for now */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {/* No navigation links shown */}
          </Box>

          {/* Right side - Action buttons */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Download button - moved to the left */}
            <Button
              color="inherit"
              onClick={() => {
                // Add download functionality here
                console.log('Download clicked');
              }}
              sx={{ textTransform: 'none' }}
            >
              {t("download")}
            </Button>

            {/* Login/Logout button */}
            <Button
              color="inherit"
              href={isLoggedIn ? "/signout" : "/signin"}
              sx={{ textTransform: 'none' }}
            >
              {isLoggedIn ? t("signout") : t("signin")}
            </Button>

            {/* Dashboard button - only shown when logged in */}
            {isLoggedIn && (
              <Button
                color="inherit"
                href={`/${locale}/dashboard`}
                sx={{ textTransform: 'none' }}
              >
                {t("dashboard")}
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default NavBar;
