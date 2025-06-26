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
        const { email, name, userId } = body;

        // First, try to find existing customer
        const existingCustomers = await stripe.customers.list({
            email: email,
            limit: 1,
        });

        if (existingCustomers.data.length > 0) {
            return NextResponse.json({ data: existingCustomers.data[0] }, { status: 200 });
        }

        // Create new customer if not found
        const customer = await stripe.customers.create({
            email: email,
            name: name,
            metadata: {
                userId: userId,
            },
        });

        return NextResponse.json({ data: customer }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating/getting customer:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
} 