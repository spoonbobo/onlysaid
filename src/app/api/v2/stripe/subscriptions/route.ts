import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-05-28.basil',
});

export async function GET(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized(authenticated.error);
    }

    try {
        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get('customerId');

        if (!customerId) {
            return NextResponse.json(
                { error: 'Customer ID is required' },
                { status: 400 }
            );
        }

        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'all',
            expand: ['data.default_payment_method'],
        });

        return NextResponse.json({ data: subscriptions }, { status: 200 });
    } catch (error: any) {
        console.error('Error fetching subscriptions:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
} 