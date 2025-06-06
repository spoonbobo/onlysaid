"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface Toast {
    id: string;
    title?: string;
    description?: string;
    message?: string;
    type: AlertColor;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: AlertColor, duration?: number) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: AlertColor = 'info', duration = 4000) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast: Toast = { id, message, type, duration };

        setToasts(prev => [...prev, newToast]);

        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, duration);
    }, []);

    const success = useCallback((message: string, duration?: number) => {
        showToast(message, 'success', duration);
    }, [showToast]);

    const error = useCallback((message: string, duration?: number) => {
        showToast(message, 'error', duration);
    }, [showToast]);

    const warning = useCallback((message: string, duration?: number) => {
        showToast(message, 'warning', duration);
    }, [showToast]);

    const info = useCallback((message: string, duration?: number) => {
        showToast(message, 'info', duration);
    }, [showToast]);

    const handleClose = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
            {children}
            {toasts.map((toast, index) => (
                <Snackbar
                    key={toast.id}
                    open={true}
                    autoHideDuration={toast.duration}
                    onClose={() => handleClose(toast.id)}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    sx={{
                        top: { xs: 16 + (index * 60), sm: 24 + (index * 60) },
                        zIndex: 9999
                    }}
                >
                    <Alert
                        onClose={() => handleClose(toast.id)}
                        severity={toast.type}
                        variant="filled"
                        sx={{ width: '100%' }}
                    >
                        {toast.message}
                    </Alert>
                </Snackbar>
            ))}
        </ToastContext.Provider>
    );
};

// Create a toaster object that mimics the Chakra UI toaster interface
export const toaster = {
    create: (options: {
        title?: string;
        description?: string;
        status?: 'success' | 'error' | 'warning' | 'info';
        type?: 'success' | 'error' | 'warning' | 'info';
        duration?: number;
    }) => {
        // Map Chakra status to MUI severity
        const type = options.status || options.type || 'info';
        const message = options.description || options.title || '';

        // This needs to be called within the context, but we'll create a global handler
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mui-toast', {
                detail: { message, type, duration: options.duration }
            }));
        }
    }
};

// Global toast handler for the toaster.create interface
if (typeof window !== 'undefined') {
    let globalToastHandler: ((message: string, type: AlertColor, duration?: number) => void) | null = null;

    export const setGlobalToastHandler = (handler: (message: string, type: AlertColor, duration?: number) => void) => {
        globalToastHandler = handler;
    };

    window.addEventListener('mui-toast', (event: any) => {
        if (globalToastHandler) {
            const { message, type, duration } = event.detail;
            globalToastHandler(message, type as AlertColor, duration);
        }
    });
} 