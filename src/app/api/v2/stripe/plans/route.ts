import { NextResponse } from "next/server";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-05-28.basil',
});

export async function GET() {
    try {
        const prices = await stripe.prices.list({
            active: true,
            type: 'recurring',
            expand: ['data.product'],
        });

        // Filter and format your specific plans
        const plans = prices.data
            .filter(price => {
                const product = price.product as Stripe.Product;
                return product.metadata?.plan_type; // Only include products marked as plans
            })
            .map(price => {
                const product = price.product as Stripe.Product;
                return {
                    id: price.id,
                    product_id: product.id,
                    name: product.name,
                    description: product.description,
                    amount: price.unit_amount,
                    currency: price.currency,
                    interval: price.recurring?.interval,
                    requests: parseInt(product.metadata?.requests || '0'),
                    plan_type: product.metadata?.plan_type,
                };
            });

        return NextResponse.json({ data: plans }, { status: 200 });
    } catch (error: any) {
        console.error('Error fetching pricing plans:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
} 