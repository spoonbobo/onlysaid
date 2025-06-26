import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db, { DBTABLES } from "@/lib/db";

// GET - List all devices for the authenticated user
export async function GET(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized(authenticated.error);
    }

    try {
        const devices = await db(DBTABLES.USER_DEVICES)
            .where('user_id', authenticated.user.id)
            .select('*')
            .orderBy('last_seen', 'desc');

        return NextResponse.json(
            { data: devices },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching user devices:", error);
        return NextResponse.json(
            { error: 'Failed to fetch devices' },
            { status: 500 }
        );
    }
}

// POST - Add/register a new device
export async function POST(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized(authenticated.error);
    }

    try {
        const body = await request.json();
        const { device_id, device_name } = body;

        if (!device_id) {
            return NextResponse.json(
                { error: 'device_id is required' },
                { status: 400 }
            );
        }

        // Check if device already exists for this user
        const existingDevice = await db(DBTABLES.USER_DEVICES)
            .where({ user_id: authenticated.user.id, device_id })
            .first();

        if (existingDevice) {
            // Update last_seen if device already exists
            const [updatedDevice] = await db(DBTABLES.USER_DEVICES)
                .where({ user_id: authenticated.user.id, device_id })
                .update({ 
                    last_seen: new Date(),
                    device_name: device_name || existingDevice.device_name
                })
                .returning('*');

            return NextResponse.json(
                { data: updatedDevice, message: 'Device updated' },
                { status: 200 }
            );
        }

        // Create new device
        const [newDevice] = await db(DBTABLES.USER_DEVICES)
            .insert({
                user_id: authenticated.user.id,
                device_id,
                device_name: device_name || 'Unknown Device',
                last_seen: new Date(),
                created_at: new Date()
            })
            .returning('*');

        return NextResponse.json(
            { data: newDevice, message: 'Device registered successfully' },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating device:", error);
        return NextResponse.json(
            { error: 'Failed to register device' },
            { status: 500 }
        );
    }
}

// PUT - Update device (mainly for updating device name or last_seen)
export async function PUT(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized(authenticated.error);
    }

    try {
        const body = await request.json();
        const { device_id, device_name, last_seen } = body;

        if (!device_id) {
            return NextResponse.json(
                { error: 'device_id is required' },
                { status: 400 }
            );
        }

        const updateData: any = {};
        if (device_name) updateData.device_name = device_name;
        if (last_seen) updateData.last_seen = new Date(last_seen);
        else updateData.last_seen = new Date(); // Update to current time by default

        const [updatedDevice] = await db(DBTABLES.USER_DEVICES)
            .where({ user_id: authenticated.user.id, device_id })
            .update(updateData)
            .returning('*');

        if (!updatedDevice) {
            return NextResponse.json(
                { error: 'Device not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { data: updatedDevice, message: 'Device updated successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error updating device:", error);
        return NextResponse.json(
            { error: 'Failed to update device' },
            { status: 500 }
        );
    }
}

// DELETE - Remove a device
export async function DELETE(request: Request) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized(authenticated.error);
    }

    try {
        const { searchParams } = new URL(request.url);
        const device_id = searchParams.get('device_id');

        if (!device_id) {
            return NextResponse.json(
                { error: 'device_id parameter is required' },
                { status: 400 }
            );
        }

        const deletedCount = await db(DBTABLES.USER_DEVICES)
            .where({ user_id: authenticated.user.id, device_id })
            .delete();

        if (deletedCount === 0) {
            return NextResponse.json(
                { error: 'Device not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: 'Device removed successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error deleting device:", error);
        return NextResponse.json(
            { error: 'Failed to remove device' },
            { status: 500 }
        );
    }
}
