"use client"

import React, { useState } from "react";
import {
    Box,
    Typography,
    Stack,
    Button,
    Alert,
    Chip,
} from "@mui/material";
import { Info as InfoIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/mui-toaster";

interface DangerZoneProps {
    isOwner: boolean;
    isAuthenticated: boolean;
}

export default function DangerZone({ isOwner, isAuthenticated }: DangerZoneProps) {
    const t = useTranslations("Settings");
    const { data: session } = useSession();
    const { showToast } = useToast();

    const [isDeletingAllRooms, setIsDeletingAllRooms] = useState(false);
    const [isDeletingAllUsers, setIsDeletingAllUsers] = useState(false);
    const [isDeletingAllTasks, setIsDeletingAllTasks] = useState(false);
    const [isResettingAllData, setIsResettingAllData] = useState(false);

    // Only render if user is authenticated and owner
    if (!isAuthenticated || !isOwner) {
        return null;
    }

    const handleDeleteAllRooms = async () => {
        if (!session) return;

        setIsDeletingAllRooms(true);
        try {
            const response = await fetch('/api/chat/delete_room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ all: true }),
            });

            const data = await response.json();

            if (response.ok) {
                showToast(data.message, 'success', 5000);
            } else {
                throw new Error(data.error || "Failed to delete rooms");
            }
        } catch (error) {
            console.error("Error deleting rooms:", error);
            showToast(error instanceof Error ? error.message : "An unknown error occurred", 'error', 5000);
        } finally {
            setIsDeletingAllRooms(false);
        }
    };

    const handleDeleteAllUsers = async () => {
        if (!session) return;

        // Add confirmation dialog
        if (!confirm(t("delete_all_users_confirm"))) {
            return;
        }

        setIsDeletingAllUsers(true);
        try {
            const response = await fetch('/api/user/delete_user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ all: true }),
            });

            const data = await response.json();

            if (response.ok) {
                showToast(data.message, 'success', 5000);
            } else {
                throw new Error(data.error || "Failed to delete users");
            }
        } catch (error) {
            console.error("Error deleting users:", error);
            showToast(error instanceof Error ? error.message : "An unknown error occurred", 'error', 5000);
        } finally {
            setIsDeletingAllUsers(false);
        }
    };

    const handleDeleteAllTasks = async () => {
        if (!session) return;

        setIsDeletingAllTasks(true);
        try {
            const response = await fetch('/api/task/delete_task?deleteAll=true', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (response.ok) {
                showToast(data.message, 'success', 5000);
            } else {
                throw new Error(data.error || "Failed to delete tasks");
            }
        } catch (error) {
            console.error("Error deleting tasks:", error);
            showToast(error instanceof Error ? error.message : "An unknown error occurred", 'error', 5000);
        } finally {
            setIsDeletingAllTasks(false);
        }
    };

    const handleResetAllData = async () => {
        if (!session) return;

        // Add confirmation dialog with a more serious warning
        if (!confirm(t("reset_all_data_confirm"))) {
            return;
        }

        // Double confirmation for destructive action
        if (!confirm(t("reset_all_data_confirm_final"))) {
            return;
        }

        setIsResettingAllData(true);
        try {
            // Delete all messages
            const messagesResponse = await fetch('/api/chat/delete_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ all: true }),
            });

            if (!messagesResponse.ok) {
                const messagesData = await messagesResponse.json();
                throw new Error(messagesData.error || "Failed to delete messages");
            }

            // Delete all plans (which also deletes associated tasks)
            const plansResponse = await fetch('/api/plan/delete_plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ all: true }),
            });

            if (!plansResponse.ok) {
                const plansData = await plansResponse.json();
                throw new Error(plansData.error || "Failed to delete plans");
            }

            // Delete all rooms
            const roomsResponse = await fetch('/api/chat/delete_room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ all: true }),
            });

            if (!roomsResponse.ok) {
                const roomsData = await roomsResponse.json();
                throw new Error(roomsData.error || "Failed to delete rooms");
            }

            // Delete all users (except current admin)
            const usersResponse = await fetch('/api/user/delete_user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ all: true }),
            });

            if (!usersResponse.ok) {
                const usersData = await usersResponse.json();
                throw new Error(usersData.error || "Failed to delete users");
            }

            showToast(t("all_data_reset_success"), 'success', 5000);

            // Redirect to sign-out page after successful reset with locale parameter
            setTimeout(() => {
                const locale = window.location.pathname.split('/')[1]; // Extract locale from current URL
                window.location.href = `/${locale}/signout`;
            }, 2000);
        } catch (error) {
            console.error("Error resetting database:", error);
            showToast(error instanceof Error ? error.message : "An unknown error occurred", 'error', 5000);
        } finally {
            setIsResettingAllData(false);
        }
    };

    return (
        <Box>
            <Stack spacing={3}>
                {/* Delete All Rooms */}
                <Alert
                    severity="error"
                    icon={<InfoIcon />}
                    sx={{
                        bgcolor: 'error.light',
                        '& .MuiAlert-message': { width: '100%' }
                    }}
                >
                    <Stack spacing={2}>
                        <Typography variant="h6" color="error.dark">
                            {t("delete_all_rooms")}
                        </Typography>
                        <Typography variant="body2" color="error.dark">
                            {t("delete_all_rooms_warning")}
                        </Typography>
                        <Button
                            variant="contained"
                            color="error"
                            disabled={isDeletingAllRooms}
                            onClick={handleDeleteAllRooms}
                            startIcon={<DeleteIcon />}
                            sx={{ alignSelf: 'flex-start' }}
                        >
                            {isDeletingAllRooms ? t("deleting") : t("delete_all_rooms")}
                        </Button>
                    </Stack>
                </Alert>

                {/* Delete All Users */}
                <Alert
                    severity="error"
                    icon={<InfoIcon />}
                    sx={{
                        bgcolor: 'error.light',
                        '& .MuiAlert-message': { width: '100%' }
                    }}
                >
                    <Stack spacing={2}>
                        <Typography variant="h6" color="error.dark">
                            {t("delete_all_users")}
                        </Typography>
                        <Typography variant="body2" color="error.dark">
                            {t("delete_all_users_warning")}
                        </Typography>
                        <Button
                            variant="contained"
                            color="error"
                            disabled={isDeletingAllUsers}
                            onClick={handleDeleteAllUsers}
                            startIcon={<DeleteIcon />}
                            sx={{ alignSelf: 'flex-start' }}
                        >
                            {isDeletingAllUsers ? t("deleting") : t("delete_all_users")}
                        </Button>
                    </Stack>
                </Alert>

                {/* Reset All Data */}
                <Alert
                    severity="error"
                    icon={<InfoIcon />}
                    sx={{
                        bgcolor: 'error.light',
                        '& .MuiAlert-message': { width: '100%' }
                    }}
                >
                    <Stack spacing={2}>
                        <Typography variant="h6" color="error.dark">
                            {t("reset_all_data")}
                        </Typography>
                        <Typography variant="body2" color="error.dark">
                            {t("reset_all_data_warning")}
                        </Typography>
                        <Chip
                            label={t("extremely_destructive")}
                            color="error"
                            variant="filled"
                            size="small"
                        />
                        <Button
                            variant="contained"
                            color="error"
                            disabled={isResettingAllData}
                            onClick={handleResetAllData}
                            startIcon={<DeleteIcon />}
                            sx={{
                                alignSelf: 'flex-start',
                                bgcolor: 'error.dark',
                                '&:hover': { bgcolor: 'error.main' }
                            }}
                        >
                            {isResettingAllData ? t("resetting") : t("reset_all_data")}
                        </Button>
                    </Stack>
                </Alert>
            </Stack>
        </Box>
    );
}