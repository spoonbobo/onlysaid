import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db, { DBTABLES } from "@/lib/db";

// GET - Retrieve workspace settings
export async function GET(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await params;

    if (!workspaceId) {
        return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    try {
        // Check if user has access to this workspace
        const workspaceUser = await db(DBTABLES.WORKSPACE_USERS)
            .where('workspace_id', workspaceId)
            .where('user_id', authenticated.user.id)
            .first();

        if (!workspaceUser) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const settings = await db(DBTABLES.WORKSPACE_SETTINGS)
            .where('workspace_id', workspaceId)
            .first();

        if (!settings) {
            return NextResponse.json({ 
                message: "No settings found for this workspace",
                data: null 
            }, { status: 200 });
        }

        return NextResponse.json({
            message: "Settings retrieved successfully",
            data: settings
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching workspace settings:", error);
        return NextResponse.json(
            { error: "Failed to fetch workspace settings" },
            { status: 500 }
        );
    }
}

// POST - Create workspace settings
export async function POST(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await params;
    const { moodle_course_id, moodle_api_token } = await request.json();

    if (!workspaceId) {
        return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    try {
        // Check if user is admin or super_admin of this workspace
        const workspaceUser = await db(DBTABLES.WORKSPACE_USERS)
            .where('workspace_id', workspaceId)
            .where('user_id', authenticated.user.id)
            .whereIn('role', ['admin', 'super_admin'])
            .first();

        if (!workspaceUser) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        // Check if settings already exist
        const existingSettings = await db(DBTABLES.WORKSPACE_SETTINGS)
            .where('workspace_id', workspaceId)
            .first();

        if (existingSettings) {
            return NextResponse.json({ 
                error: "Settings already exist for this workspace. Use PUT to update." 
            }, { status: 409 });
        }

        const newSettings = await db(DBTABLES.WORKSPACE_SETTINGS)
            .insert({
                workspace_id: workspaceId,
                moodle_course_id,
                moodle_api_token
            })
            .returning('*');

        return NextResponse.json({
            message: "Settings created successfully",
            data: newSettings[0]
        }, { status: 201 });

    } catch (error) {
        console.error("Error creating workspace settings:", error);
        return NextResponse.json(
            { error: "Failed to create workspace settings" },
            { status: 500 }
        );
    }
}

// PUT - Update workspace settings
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await params;
    const { moodle_course_id, moodle_api_token } = await request.json();

    if (!workspaceId) {
        return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    try {
        // Check if user is admin or super_admin of this workspace
        const workspaceUser = await db(DBTABLES.WORKSPACE_USERS)
            .where('workspace_id', workspaceId)
            .where('user_id', authenticated.user.id)
            .whereIn('role', ['admin', 'super_admin'])
            .first();

        if (!workspaceUser) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        // Try to update existing settings
        const updatedSettings = await db(DBTABLES.WORKSPACE_SETTINGS)
            .where('workspace_id', workspaceId)
            .update({
                moodle_course_id,
                moodle_api_token,
                updated_at: db.fn.now()
            })
            .returning('*');

        if (updatedSettings.length === 0) {
            // If no settings exist, create them
            const newSettings = await db(DBTABLES.WORKSPACE_SETTINGS)
                .insert({
                    workspace_id: workspaceId,
                    moodle_course_id,
                    moodle_api_token
                })
                .returning('*');

            return NextResponse.json({
                message: "Settings created successfully",
                data: newSettings[0]
            }, { status: 201 });
        }

        return NextResponse.json({
            message: "Settings updated successfully",
            data: updatedSettings[0]
        }, { status: 200 });

    } catch (error) {
        console.error("Error updating workspace settings:", error);
        return NextResponse.json(
            { error: "Failed to update workspace settings" },
            { status: 500 }
        );
    }
}

// DELETE - Delete workspace settings
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await params;

    if (!workspaceId) {
        return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    try {
        // Check if user is super_admin of this workspace (only super_admin can delete settings)
        const workspaceUser = await db(DBTABLES.WORKSPACE_USERS)
            .where('workspace_id', workspaceId)
            .where('user_id', authenticated.user.id)
            .where('role', 'super_admin')
            .first();

        if (!workspaceUser) {
            return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
        }

        const deletedSettings = await db(DBTABLES.WORKSPACE_SETTINGS)
            .where('workspace_id', workspaceId)
            .delete()
            .returning('*');

        if (deletedSettings.length === 0) {
            return NextResponse.json({ 
                error: "No settings found to delete" 
            }, { status: 404 });
        }

        return NextResponse.json({
            message: "Settings deleted successfully",
            data: deletedSettings[0]
        }, { status: 200 });

    } catch (error) {
        console.error("Error deleting workspace settings:", error);
        return NextResponse.json(
            { error: "Failed to delete workspace settings" },
            { status: 500 }
        );
    }
}
