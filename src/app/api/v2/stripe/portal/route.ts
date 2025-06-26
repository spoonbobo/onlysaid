import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-05-28.basil',
});

export async function POST(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized(authenticated.error);
    }

    try {
        const body = await request.json();
        const { customerId, returnUrl } = body;

        // Check if customer portal is configured
        try {
            const configurations = await stripe.billingPortal.configurations.list({
                limit: 1,
            });

            if (configurations.data.length === 0) {
                throw new Error('Customer portal not configured. Please set up your customer portal at https://dashboard.stripe.com/test/settings/billing/portal');
            }
        } catch (configError) {
            console.error('Portal configuration error:', configError);
            return NextResponse.json(
                { error: 'Customer portal not configured. Please contact support.' },
                { status: 500 }
            );
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl || process.env.NEXT_PUBLIC_APP_URL + '/dashboard/payment',
        });

        return NextResponse.json({ data: portalSession }, { status: 200 });
    } catch (error: any) {
        console.error('Error creating portal session:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
} 