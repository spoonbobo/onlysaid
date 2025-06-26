import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db, { DBTABLES } from "@/lib/db";
import { IWorkspace } from "@/../../types/Workspace/Workspace";
import fs from 'fs';
import path from 'path';

interface IUpdateWorkspacePayload {
    name?: string;
    image?: string;
    settings?: Record<string, any>;
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated || !authenticated.user) {
        return unauthorized();
    }

    const { workspaceId } = await params;
    if (!workspaceId) {
        return NextResponse.json({ message: "Workspace ID parameter is missing" }, { status: 400 });
    }

    try {
        const body: IUpdateWorkspacePayload = await request.json();

        if (Object.keys(body).length === 0) {
            return NextResponse.json({ message: "No update data provided" }, { status: 400 });
        }

        const updatePayload: Partial<IWorkspace> = {
            ...body,
            updated_at: new Date().toISOString(),
        };

        if ('workspaceId' in updatePayload) {
            delete (updatePayload as any).workspaceId;
        }
        if ('id' in updatePayload) {
            delete (updatePayload as any).id;
        }

        const updatedWorkspaces = await db(DBTABLES.WORKSPACES)
            .where({ id: workspaceId })
            .update(updatePayload)
            .returning('*');

        if (!updatedWorkspaces || updatedWorkspaces.length === 0) {
            return NextResponse.json({ message: "Workspace not found or update failed" }, { status: 404 });
        }

        return NextResponse.json(
            { message: "Workspace updated successfully", data: updatedWorkspaces[0] },
            { status: 200 }
        );

    } catch (error) {
        console.error(`Error updating workspace ${workspaceId}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { message: `Failed to update workspace: ${errorMessage}` },
            { status: 500 }
        );
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }
    const { workspaceId } = await params;
    try {
        const workspace = await db(DBTABLES.WORKSPACES).where({ id: workspaceId }).first();
        if (!workspace) {
            return NextResponse.json({ message: "Workspace not found" }, { status: 404 });
        }
        return NextResponse.json({ message: "Workspace fetched", data: workspace }, { status: 200 });
    } catch (error) {
        console.error(`Error fetching workspace ${workspaceId}:`, error);
        return NextResponse.json({ message: "Failed to fetch workspace" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated || !authenticated.user) {
        return unauthorized();
    }
    const { workspaceId } = await params;

    try {
        const storageDir = path.join(process.cwd(), 'storage', workspaceId);
        if (fs.existsSync(storageDir)) {
            await fs.promises.rm(storageDir, { recursive: true, force: true });
        }

        await db(DBTABLES.WORKSPACE_USERS).where({ workspace_id: workspaceId }).delete();
        await db(DBTABLES.FILES).where({ workspace_id: workspaceId }).delete();

        const deletedCount = await db(DBTABLES.WORKSPACES).where({ id: workspaceId }).delete();

        if (deletedCount === 0) {
            return NextResponse.json({ message: "Workspace not found" }, { status: 404 });
        }
        return NextResponse.json({ message: "Workspace deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error(`Error deleting workspace ${workspaceId}:`, error);
        return NextResponse.json({ message: "Failed to delete workspace" }, { status: 500 });
    }
}