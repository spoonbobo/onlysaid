"use client";

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { refreshSessionTTL } from '@/store/features/userSlice';
import { RootState } from '@/store/store';

const ActivityTracker = () => {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);

    useEffect(() => {
        if (!isAuthenticated) return;

        // List of events to track for user activity
        const activityEvents = [
            'mousedown',
            'keydown',
            'scroll',
            'touchstart',
            'click'
        ];

        // Debounce function to prevent excessive TTL refreshes
        let timeout: NodeJS.Timeout | null = null;
        const debounceRefresh = () => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                dispatch(refreshSessionTTL());
            }, 5000); // Wait 5 seconds of inactivity before refreshing TTL
        };

        // Event handler
        const handleActivity = () => {
            debounceRefresh();
        };

        // Add event listeners
        activityEvents.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Clean up
        return () => {
            if (timeout) clearTimeout(timeout);
            activityEvents.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [dispatch, isAuthenticated]);

    return null; // This component doesn't render anything
};

export default ActivityTracker; 