/*
Map 3rd party login to App Login.
*/

"use client"

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { setUser } from '@/store/features/userSlice'; // Adjust import path as needed
import { useTranslations } from 'next-intl'; // If you're using next-intl for translations
import { useParams } from 'next/navigation';
import { toaster } from '@/components/ui/toaster';
import Loading from '@/components/loading';
import { Box, Typography, Button, Stack } from '@mui/material';
import { Error as ErrorIcon } from '@mui/icons-material';

export default function ThirdPartyLoginRedirect() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();
    const t = useTranslations('Auth'); // Adjust namespace as needed
    const params = useParams();
    const locale = params.locale as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const email = searchParams.get('email');
    const avatarUrl = searchParams.get('avatarUrl');

    useEffect(() => {
        async function handleAuthRedirect() {
            try {
                if (!email) {
                    throw new Error('Email not provided in redirect');
                }

                // Fetch user data from your API
                const response = await fetch(`/api/user/get_user?email=${encodeURIComponent(email)}`);
                const data = await response.json();

                if (!response.ok) {
                    if (response.status === 404) {
                        // Create new user if doesn't exist, then redirect to dashboard
                        const createResponse = await fetch('/api/user/create_user', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                email,
                                avatarUrl,
                                settings: {
                                    general: {
                                        language: locale,
                                        theme: 'light'
                                    }
                                }
                            }),
                        });

                        if (!createResponse.ok) {
                            throw new Error('Failed to create user account');
                        }

                        const newUserData = await createResponse.json();
                        dispatch(setUser(newUserData.user));

                        toaster.create({
                            title: t('signin_success'),
                            description: t('signin_success_description'),
                            type: "info"
                        });

                        router.push(`/${locale}/dashboard`);
                        return;
                    }
                    // Other errors
                    throw new Error(data.error || 'Failed to fetch user data');
                }

                if (data.exists && data.user) {
                    // Store user in Redux
                    dispatch(setUser(data.user));
                    const user_locale = data.user.settings?.general?.language || locale;

                    // Show success toast
                    toaster.create({
                        title: t('signin_success'),
                        description: t('signin_success_description'),
                        type: "info"
                    });

                    // Redirect straight to dashboard
                    router.push(`/${user_locale || locale}/dashboard`);
                } else {
                    // Create new user and redirect to dashboard
                    const createResponse = await fetch('/api/user/create_user', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            email,
                            avatarUrl,
                            settings: {
                                general: {
                                    language: locale,
                                    theme: 'light'
                                }
                            }
                        }),
                    });

                    if (!createResponse.ok) {
                        throw new Error('Failed to create user account');
                    }

                    const newUserData = await createResponse.json();
                    dispatch(setUser(newUserData.user));

                    toaster.create({
                        title: t('signin_success'),
                        description: t('signin_success_description'),
                        type: "info"
                    });

                    router.push(`/${locale}/dashboard`);
                }
            } catch (err) {
                setError((err as Error).message);

                toaster.create({
                    title: 'Authentication Error.',
                    description: (err as Error).message
                });
            } finally {
                setLoading(false);
            }
        }

        handleAuthRedirect();
    }, [dispatch, router, searchParams, t, locale, email, avatarUrl]);

    // Loading state
    if (loading) {
        return <Loading
            message={t('loading_authentication')}
            description={t('please_wait_while_we_verify_your_account')}
        />;
    }

    // Error state
    if (error) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100vh'
                }}
            >
                <Stack spacing={2} alignItems="center" textAlign="center">
                    <ErrorIcon sx={{ fontSize: 48, color: 'error.main' }} />

                    <Typography variant="h5" fontWeight="bold">
                        {t('authentication_error')}
                    </Typography>

                    <Typography color="error" sx={{ mb: 2 }}>
                        {error}
                    </Typography>

                    <Button
                        variant="contained"
                        onClick={() => router.push(`/${locale}/signin`)}
                        sx={{ mt: 2 }}
                    >
                        {t('back_to_signin')}
                    </Button>
                </Stack>
            </Box>
        );
    }

    // This should rarely be seen as we redirect on success
    return null;
}