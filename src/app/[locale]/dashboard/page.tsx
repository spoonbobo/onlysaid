"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Skeleton,
  Alert,
  Button,
  ButtonGroup,
  TextField,
  Stack
} from "@mui/material";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useSelector } from 'react-redux';
import { RootState } from "@/store/store";
import { Refresh as RefreshIcon, DateRange as DateRangeIcon } from "@mui/icons-material";

interface UsageAnalytics {
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
}

type DateRange = '1d' | '7d' | '30d' | 'custom';

export default function DashboardPage() {
  const { isAuthenticated } = useSelector((state: RootState) => state.user);
  const [analytics, setAnalytics] = useState<UsageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range state
  const [selectedRange, setSelectedRange] = useState<DateRange>('7d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);

    switch (selectedRange) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        } else {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  };

  const fetchAnalytics = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setError('Not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { startDate, endDate } = getDateRange();

      // Add date range parameters to the API call
      const params = new URLSearchParams({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

      const response = await fetch(`/api/v2/user/usage?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      setAnalytics(data.data);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      setError(error.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [isAuthenticated, selectedRange, customStartDate, customEndDate]);

  // Initialize custom dates with current week
  useEffect(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    setCustomStartDate(weekAgo.toISOString().split('T')[0]);
    setCustomEndDate(now.toISOString().split('T')[0]);
  }, []);

  // Prepare chart data
  const chartData = analytics?.daily
    ?.sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())
    ?.map(item => ({
      date: new Date(item.day).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      requests: item.requests,
      fullDate: item.day
    })) || [];

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 2,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 2
          }}
        >
          <Typography variant="body2" fontWeight="medium">
            {label}
          </Typography>
          <Typography variant="body2" color="primary.main">
            Requests: {payload[0].value}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  const handleRangeChange = (range: DateRange) => {
    setSelectedRange(range);
  };

  const formatDateRangeDisplay = () => {
    const { startDate, endDate } = getDateRange();
    const formatOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric'
    };

    if (startDate.getFullYear() !== endDate.getFullYear()) {
      formatOptions.year = 'numeric';
    }

    return `${startDate.toLocaleDateString('en-US', formatOptions)} - ${endDate.toLocaleDateString('en-US', formatOptions)}`;
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="body1" color="text.secondary">
          Please sign in to view your dashboard.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ py: 2 }}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={300} />
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading dashboard data: {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchAnalytics}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 2 }}>
      {/* Header with Date Range Controls */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" color="text.primary" sx={{ mb: 1 }}>
              Usage Overview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track your API usage and trends over time
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DateRangeIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            <Typography variant="body2" color="text.secondary">
              {formatDateRangeDisplay()}
            </Typography>
          </Box>
        </Stack>

        {/* Date Range Selection */}
        <Box sx={{ mb: 2 }}>
          <ButtonGroup size="small" sx={{ mb: 2 }}>
            <Button
              variant={selectedRange === '1d' ? 'contained' : 'outlined'}
              onClick={() => handleRangeChange('1d')}
            >
              1d
            </Button>
            <Button
              variant={selectedRange === '7d' ? 'contained' : 'outlined'}
              onClick={() => handleRangeChange('7d')}
            >
              7d
            </Button>
            <Button
              variant={selectedRange === '30d' ? 'contained' : 'outlined'}
              onClick={() => handleRangeChange('30d')}
            >
              30d
            </Button>
            <Button
              variant={selectedRange === 'custom' ? 'contained' : 'outlined'}
              onClick={() => handleRangeChange('custom')}
            >
              Custom
            </Button>
          </ButtonGroup>

          {/* Custom Date Range Inputs */}
          {selectedRange === 'custom' && (
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                size="small"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{ width: 200 }}
              />
              <TextField
                label="End Date"
                type="date"
                size="small"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{ width: 200 }}
              />
            </Stack>
          )}
        </Box>
      </Box>

      {/* Usage Statistics Cards */}
      {analytics && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
                {analytics.summary.total_requests}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Requests
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h4" color="secondary.main" sx={{ fontWeight: 'bold' }}>
                {analytics.summary.models_used}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Models Used
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Usage Time Series Chart */}
      {analytics && chartData.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Daily Usage Trend
            </Typography>
            <Box sx={{ width: '100%', height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1976d2" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                    angle={selectedRange === '30d' ? -45 : 0}
                    textAnchor={selectedRange === '30d' ? "end" : "middle"}
                    height={selectedRange === '30d' ? 60 : 40}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="#1976d2"
                    strokeWidth={2}
                    fill="url(#colorRequests)"
                    dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#1976d2', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* No data state */}
      {analytics && chartData.length === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Daily Usage Trend
            </Typography>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No usage data available for the selected date range.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}