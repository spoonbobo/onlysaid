import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db, { DBTABLES } from "@/lib/db";
import { IKnowledgeBase } from "@/../../types/KnowledgeBase/KnowledgeBase";

interface RouteParams {
    workspaceId: string;
    kbId: string;
}

// GET handler for a single Knowledge Base
export async function GET(
    request: Request,
    { params }: { params: Promise<RouteParams> }
) {
    const { workspaceId, kbId } = await params;
    console.log(`GET request for KB ID: ${kbId} in workspace: ${workspaceId}`);

    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated || !authenticated.user?.id) {
        return unauthorized();
    }

    if (!workspaceId || !kbId) {
        return NextResponse.json({ error: "Workspace ID and Knowledge Base ID are required" }, { status: 400 });
    }

    try {
        const knowledgeBase: IKnowledgeBase | undefined = await db(DBTABLES.KNOWLEDGE_BASES)
            .where({ id: kbId, workspace_id: workspaceId })
            .first();

        if (!knowledgeBase) {
            return NextResponse.json({ error: "Knowledge Base not found" }, { status: 404 });
        }

        return NextResponse.json(knowledgeBase, { status: 200 });
    } catch (error) {
        console.error(`Error fetching knowledge base ${kbId}:`, error);
        return NextResponse.json({ error: "Failed to fetch knowledge base" }, { status: 500 });
    }
}


// PUT handler for updating a Knowledge Base
export async function PUT(
    request: Request,
    { params }: { params: Promise<RouteParams> }
) {
    const { workspaceId, kbId } = await params;
    console.log(`PUT request for KB ID: ${kbId} in workspace: ${workspaceId}`);

    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated || !authenticated.user?.id) {
        return unauthorized();
    }

    if (!workspaceId || !kbId) {
        return NextResponse.json({ error: "Workspace ID and Knowledge Base ID are required" }, { status: 400 });
    }

    try {
        const body = await request.json();
        // Make sure to only allow updatable fields and not 'id' or 'workspace_id' from body
        const { id, workspace_id, ...updateData } = body;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No update data provided" }, { status: 400 });
        }

        // Ensure 'updated_at' is set by the database trigger or manually if needed.
        // For example: updateData.updated_at = new Date();

        const [updatedKb] = await db(DBTABLES.KNOWLEDGE_BASES)
            .where({ id: kbId, workspace_id: workspaceId })
            .update(updateData)
            .returning('*');

        if (!updatedKb) {
            return NextResponse.json({ error: "Knowledge Base not found or update failed" }, { status: 404 });
        }

        return NextResponse.json(updatedKb as IKnowledgeBase, { status: 200 });

    } catch (error) {
        console.error(`Error updating knowledge base ${kbId}:`, error);
        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to update knowledge base" }, { status: 500 });
    }
}

// DELETE handler for a single Knowledge Base
export async function DELETE(
    request: Request,
    { params }: { params: Promise<RouteParams> }
) {
    const { workspaceId, kbId } = await params;
    console.log(`DELETE request for KB ID: ${kbId} in workspace: ${workspaceId}`);

    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated || !authenticated.user?.id) {
        return unauthorized();
    }

    if (!workspaceId || !kbId) {
        return NextResponse.json({ error: "Workspace ID and Knowledge Base ID are required" }, { status: 400 });
    }

    try {
        const numDeleted = await db(DBTABLES.KNOWLEDGE_BASES)
            .where({ id: kbId, workspace_id: workspaceId })
            .del();

        if (numDeleted === 0) {
            return NextResponse.json({ error: "Knowledge Base not found or already deleted" }, { status: 404 });
        }

        return NextResponse.json({ success: true, id: kbId, message: `Knowledge base ${kbId} deleted successfully.` }, { status: 200 });
    } catch (error) {
        console.error(`Error deleting knowledge base ${kbId}:`, error);
        return NextResponse.json({ error: "Failed to delete knowledge base" }, { status: 500 });
    }
}