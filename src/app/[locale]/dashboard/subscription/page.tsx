"use client";

import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    LinearProgress,
    Alert,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Pagination
} from "@mui/material";
import { useTranslations } from "next-intl";
import { useSelector } from 'react-redux';
import { RootState } from "@/store/store";
import { CreditCard as CreditCardIcon, ManageAccounts as ManageAccountsIcon, Refresh as RefreshIcon } from "@mui/icons-material";

interface UsageLog {
    id: string;
    user_id: string;
    kind: string;
    max_mode: boolean;
    model: string;
    cost_requests: number;
    date: string;
}

interface UsageData {
    plan: {
        id: string;
        user_id: string;
        plan_type: string;
        monthly_limit: number;
        current_usage: number;
        reset_date: string;
        created_at: string;
    } | null;
    analytics: {
        summary: {
            total_requests: number;
            models_used: number;
        };
        daily: Array<{
            day: string;
            requests: number;
        }>;
        models: Array<{
            model: string;
            requests: number;
        }>;
    } | null;
    logs: UsageLog[];
    logsLoading: boolean;
    loading: boolean;
    error: string | null;
}

export default function PaymentPage() {
    const t = useTranslations("Payment");
    const { currentUser, isAuthenticated } = useSelector((state: RootState) => state.user);

    const [page, setPage] = useState(1);
    const logsPerPage = 10;

    const [usageData, setUsageData] = useState<UsageData>({
        plan: null,
        analytics: null,
        logs: [],
        logsLoading: false,
        loading: true,
        error: null,
    });

    const fetchUsageData = async () => {
        if (!isAuthenticated) {
            setUsageData(prev => ({ ...prev, loading: false, error: 'Not authenticated' }));
            return;
        }

        try {
            setUsageData(prev => ({ ...prev, loading: true, error: null }));

            // Use fetch API to call Next.js API routes
            const [planResponse, analyticsResponse] = await Promise.all([
                fetch('/api/v2/user/usage/plan', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                }),
                fetch('/api/v2/user/usage', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
            ]);

            if (!planResponse.ok || !analyticsResponse.ok) {
                throw new Error('Failed to fetch data');
            }

            const planData = await planResponse.json();
            const analyticsData = await analyticsResponse.json();

            setUsageData(prev => ({
                ...prev,
                plan: planData.data || null,
                analytics: analyticsData.data || null,
                loading: false,
                error: null,
            }));

        } catch (error: any) {
            console.error('Error fetching usage data:', error);
            setUsageData(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Failed to fetch usage data'
            }));
        }
    };

    const fetchUsageLogs = async (pageNum: number = 1) => {
        if (!isAuthenticated) return;

        try {
            setUsageData(prev => ({ ...prev, logsLoading: true }));

            const offset = (pageNum - 1) * logsPerPage;
            const response = await fetch(`/api/v2/user/usage/log?limit=${logsPerPage}&offset=${offset}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch logs');
            }

            const logsData = await response.json();
            setUsageData(prev => ({
                ...prev,
                logs: logsData.data || [],
                logsLoading: false,
            }));

        } catch (error: any) {
            console.error('Error fetching usage logs:', error);
            setUsageData(prev => ({
                ...prev,
                logsLoading: false,
            }));
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchUsageData();
            fetchUsageLogs(1);
        }
    }, [isAuthenticated]);

    const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
        fetchUsageLogs(value);
    };

    const handleManageSubscription = async () => {
        try {
            // First, create or get customer
            const customerResponse = await fetch('/api/v2/stripe/customer', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: currentUser?.email,
                    name: currentUser?.username,
                    userId: currentUser?.id,
                })
            });

            if (!customerResponse.ok) {
                throw new Error('Failed to create customer');
            }

            const customerData = await customerResponse.json();

            // Create portal session
            const portalResponse = await fetch('/api/v2/stripe/portal', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customerId: customerData.data.id,
                    returnUrl: window.location.origin + '/dashboard/payment'
                })
            });

            if (!portalResponse.ok) {
                throw new Error('Failed to create portal session');
            }

            const portalData = await portalResponse.json();
            window.open(portalData.data.url, '_blank');
        } catch (error) {
            console.error('Error opening subscription portal:', error);
        }
    };

    const handleUpgradePlan = async () => {
        try {
            // First, create or get customer
            const customerResponse = await fetch('/api/v2/stripe/customer', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: currentUser?.email,
                    name: currentUser?.username,
                    userId: currentUser?.id,
                })
            });

            if (!customerResponse.ok) {
                throw new Error('Failed to create customer');
            }

            const customerData = await customerResponse.json();

            // Create checkout session
            const checkoutResponse = await fetch('/api/v2/stripe/checkout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    priceId: 'price_pro_plan', // Replace with actual price ID
                    customerId: customerData.data.id,
                    successUrl: window.location.origin + '/dashboard/payment?success=true',
                    cancelUrl: window.location.origin + '/dashboard/payment?canceled=true'
                })
            });

            if (!checkoutResponse.ok) {
                throw new Error('Failed to create checkout session');
            }

            const checkoutData = await checkoutResponse.json();
            window.open(checkoutData.data.url, '_blank');
        } catch (error) {
            console.error('Error opening checkout:', error);
        }
    };

    if (!isAuthenticated) {
        return (
            <Box sx={{ py: 2 }}>
                <Typography variant="body1" color="text.secondary">
                    {t("signInRequired")}
                </Typography>
            </Box>
        );
    }

    if (usageData.loading) {
        return (
            <Box sx={{ py: 2 }}>
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Skeleton variant="text" width="60%" height={40} />
                        <Skeleton variant="text" width="40%" height={30} sx={{ mb: 2 }} />
                        <Skeleton variant="rectangular" width="100%" height={8} sx={{ mb: 2 }} />
                        <Skeleton variant="text" width="50%" height={20} />
                    </CardContent>
                </Card>
            </Box>
        );
    }

    if (usageData.error) {
        return (
            <Box sx={{ py: 2 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {t("errorLoadingData")}: {usageData.error}
                </Alert>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={fetchUsageData}
                >
                    {t("retry")}
                </Button>
            </Box>
        );
    }

    // Calculate usage statistics
    const totalRequests = usageData.analytics?.summary?.total_requests || 0;
    const monthlyLimit = usageData.plan?.monthly_limit || 0;
    const usagePercentage = monthlyLimit > 0 ? (totalRequests / monthlyLimit) * 100 : 0;

    const getMonthlyAmount = (planType: string) => {
        switch (planType) {
            case 'Pro': return 20;
            case 'Enterprise': return 40;
            default: return 0;
        }
    };

    const monthlyAmount = getMonthlyAmount(usageData.plan?.plan_type || 'Free');

    return (
        <Box sx={{ py: 2 }}>
            {/* Current Plan Card */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {t("currentPlan")}
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h5" component="span" sx={{ fontWeight: 'bold' }}>
                            {usageData.plan?.plan_type || 'Free'}
                        </Typography>
                        {monthlyAmount > 0 && (
                            <Typography variant="body1" component="span" sx={{ ml: 2, color: 'text.secondary' }}>
                                ${monthlyAmount}/{t("month")}
                            </Typography>
                        )}
                    </Box>

                    <Typography variant="body2" sx={{ mb: 1 }}>
                        {t("requestsUsed")}: {totalRequests} / {monthlyLimit}
                    </Typography>

                    <LinearProgress
                        variant="determinate"
                        value={Math.min(usagePercentage, 100)}
                        sx={{
                            mb: 2,
                            height: 8,
                            borderRadius: 4,
                            '& .MuiLinearProgress-bar': {
                                backgroundColor: usagePercentage > 90 ? 'error.main' : usagePercentage > 70 ? 'warning.main' : 'primary.main'
                            }
                        }}
                    />

                    {usagePercentage > 90 && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            {t("nearLimit")}
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <Button
                    variant="contained"
                    startIcon={<ManageAccountsIcon />}
                    onClick={handleManageSubscription}
                >
                    {t("manageSubscription")}
                </Button>

                <Button
                    variant="outlined"
                    startIcon={<CreditCardIcon />}
                    onClick={handleUpgradePlan}
                >
                    {t("upgradePlan")}
                </Button>
            </Stack>

            {/* Usage Statistics */}
            {usageData.analytics && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            {t("usageStatistics")}
                        </Typography>
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="h4" color="primary">
                                    {totalRequests}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {t("totalRequests")}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="h4" color="primary">
                                    {usageData.analytics.summary.models_used}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {t("modelsUsed")}
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {/* Usage Logs Table */}
            <Card>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {t("usageLogs")}
                    </Typography>

                    {usageData.logsLoading ? (
                        <Box sx={{ py: 2 }}>
                            <Skeleton variant="rectangular" width="100%" height={300} />
                        </Box>
                    ) : (
                        <>
                            <TableContainer component={Paper} variant="outlined">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{t("date")}</TableCell>
                                            <TableCell>{t("model")}</TableCell>
                                            <TableCell>{t("kind")}</TableCell>
                                            <TableCell>{t("maxMode")}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {usageData.logs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell>
                                                    {new Date(log.date).toLocaleString()}
                                                </TableCell>
                                                <TableCell>{log.model}</TableCell>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            px: 1,
                                                            py: 0.5,
                                                            borderRadius: 1,
                                                            bgcolor: 'primary.light',
                                                            color: 'primary.contrastText',
                                                            display: 'inline-block'
                                                        }}
                                                    >
                                                        {log.kind}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {log.max_mode ? (
                                                        <Typography variant="body2" color="warning.main">
                                                            {t("yes")}
                                                        </Typography>
                                                    ) : (
                                                        <Typography variant="body2" color="text.secondary">
                                                            {t("no")}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {usageData.logs.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center">
                                                    <Typography variant="body2" color="text.secondary">
                                                        {t("noUsageData")}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {usageData.logs.length > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                    <Pagination
                                        count={Math.ceil(usageData.logs.length / logsPerPage)}
                                        page={page}
                                        onChange={handlePageChange}
                                        color="primary"
                                    />
                                </Box>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
} 