import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_ID || "",
            clientSecret: process.env.GITHUB_SECRET || "",
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),
    ],
    pages: {
        signIn: "/signin",
    },
    callbacks: {
        async session({ session }) {
            return session;
        },
        async redirect({ url, baseUrl }) {
            console.log('[Auth] Redirecting to:', url);
            console.log('[Auth] Base URL:', baseUrl);

            const electronDeeplinkPath = "/api/auth/generate-electron-deeplink";
            try {
                const parsedUrl = new URL(url); // Handles both relative and absolute URLs correctly with baseUrl
                if (parsedUrl.origin === baseUrl && parsedUrl.pathname === electronDeeplinkPath) {
                    console.log('[NextAuth Redirect Callback] Allowing redirect to confirmed path on correct origin.');
                    return url; // Return the original url, which might have query params
                }
            } catch (e) {
                if (url.startsWith(baseUrl + electronDeeplinkPath)) {
                    console.log('[NextAuth Redirect Callback] Allowing redirect based on startsWith for relative-like URL.');
                    return url;
                }
                if (url === electronDeeplinkPath && baseUrl === new URL(electronDeeplinkPath, baseUrl).origin) { // if url is just the path
                    console.log('[NextAuth Redirect Callback] Allowing redirect for path-only URL matching Electron deeplink path.');
                    return baseUrl + url; // Reconstruct full URL
                }
            }

            if (url.startsWith(baseUrl)) {
                return url;
            }

            if (new URL(url).origin === baseUrl) {
                return url;
            }

            return baseUrl;
        },
    },
    debug: true,
}; 