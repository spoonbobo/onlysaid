"use client"

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Box, Typography, Button, Stack, Paper, Link } from '@mui/material';
import { CheckCircle, Error as ErrorIcon, Close, Launch } from '@mui/icons-material';

export default function CloseWindowPage() {
    const searchParams = useSearchParams();
    const t = useTranslations('Auth');
    
    const message = searchParams.get('message');
    const type = searchParams.get('type') || 'success'; // 'success' or 'error'
    const deeplinkUrl = searchParams.get('deeplink'); // The deeplink to trigger
    
    useEffect(() => {
        // If there's a deeplink, trigger it immediately
        if (deeplinkUrl) {
            console.log('[CloseWindow] Triggering deeplink:', deeplinkUrl);
            try {
                // Create a hidden iframe to trigger the deeplink
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = deeplinkUrl;
                document.body.appendChild(iframe);
                
                // Clean up iframe after a short delay
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 2000);
            } catch (error) {
                console.error('[CloseWindow] Error triggering deeplink:', error);
            }
        }
    }, [deeplinkUrl]);

    const handleManualClose = () => {
        // Try a simple window.close() first
        if (typeof window !== 'undefined') {
            try {
                window.close();
            } catch (error) {
                console.log('Window close failed (expected in some browsers):', error);
            }
        }
    };

    const handleDeeplinkClick = () => {
        if (deeplinkUrl) {
            window.location.href = deeplinkUrl;
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                bgcolor: 'background.default',
                p: 2
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    p: 4,
                    maxWidth: 500,
                    width: '100%',
                    textAlign: 'center'
                }}
            >
                <Stack spacing={3} alignItems="center">
                    {type === 'error' ? (
                        <ErrorIcon sx={{ fontSize: 64, color: 'error.main' }} />
                    ) : (
                        <CheckCircle sx={{ fontSize: 64, color: 'success.main' }} />
                    )}

                    <Typography variant="h4" fontWeight="bold">
                        {type === 'error' 
                            ? (t('authentication_error') || 'Authentication Error')
                            : (t('authentication_complete') || 'Authentication Complete')
                        }
                    </Typography>

                    <Box sx={{ 
                        bgcolor: type === 'error' ? 'error.light' : 'success.light', 
                        p: 2, 
                        borderRadius: 2,
                        width: '100%'
                    }}>
                        <Typography variant="body2" color="text.secondary">
                            {type === 'error' 
                                ? 'Authentication failed. Please close this browser window and try signing in again.'
                                : 'You can now close this browser window and return to the app.'
                            }
                        </Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                        {type === 'error' 
                            ? (t('if_window_does_not_close_manually') || 'Please close this browser tab/window manually.')
                            : deeplinkUrl 
                                ? (
                                    <>
                                        {t('if_window_does_not_close_manually_with_link_prefix') || 'Please close this browser tab/window manually or click'}{' '}
                                        <Link
                                            href={deeplinkUrl}
                                            sx={{
                                                color: 'primary.main',
                                                textDecoration: 'underline'
                                            }}
                                        >
                                            {t('this_link') || 'this link'}
                                        </Link>{' '}
                                        {t('to_open_app') || 'to open the app.'}
                                    </>
                                )
                                : (t('if_window_does_not_close_manually') || 'Please close this browser tab/window manually.')
                        }
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
} 