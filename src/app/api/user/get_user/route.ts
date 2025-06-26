import { NextResponse } from "next/server";
import db from '@/lib/db';

export async function GET(request: Request) {
    try {
        // Get email from URL params
        const url = new URL(request.url);
        const email = url.searchParams.get('email');

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await db('users').where({ email }).first();

        if (!user) {
            return NextResponse.json({ exists: false }, { status: 404 });
        }

        return NextResponse.json({ exists: true, user }, { status: 200 });
    } catch (error) {
        console.error("Error fetching user:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (!body.email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await db('users').where({ email: body.email }).first();

        if (!user) {
            return NextResponse.json({ exists: false }, { status: 404 });
        }

        return NextResponse.json({ exists: true, user }, { status: 200 });
    } catch (error) {
        console.error("Error fetching user:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}