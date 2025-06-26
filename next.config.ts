import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
    reactStrictMode: false,
    serverRuntimeConfig: {
        maxRequestSize: '100mb'
    }
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);