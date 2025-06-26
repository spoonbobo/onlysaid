"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import Loading from "@/components/loading";
import { toaster } from "@/components/ui/toaster";

export default function SignOutPage() {
    const router = useRouter();
    const t = useTranslations("Auth");
    const params = useParams();
    const locale = params.locale as string;

    useEffect(() => {
        const handleSignOut = async () => {
            try {
                // Import store and actions
                const { store } = await import('@/store/store');
                const { clearUser, setSigningOut } = require('@/store/features/userSlice');

                // Set signing out state first
                store.dispatch(setSigningOut(true));

                // Clear user in Redux
                store.dispatch(clearUser());

                // Sign out from NextAuth
                await signOut({ redirect: false });

                // Show success toast
                toaster.create({
                    title: t("signout_success"),
                    description: t("signout_success_description"),
                });

                // Finally redirect to home page
                router.push(`/${locale}`);
            } catch (error) {
                toaster.create({
                    title: t("signout_error"),
                    description: t("signout_error_description"),
                });
                router.push(`/${locale}`);
            }
        };

        handleSignOut();
    }, [router, t, locale]);

    return (
        <Loading
            message={t("signing_out")}
            description={t("please_wait_while_we_sign_you_out")}
        />
    );
} 