import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import db, { DBTABLES } from "@/lib/db";
import { IFile } from '@/../../types/File/File';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const { workspaceId } = await params;
    let fileIds: string[];

    try {
        const body = await request.json();
        if (!body.fileIds || !Array.isArray(body.fileIds) || body.fileIds.some((id: any) => typeof id !== 'string')) {
            return NextResponse.json(
                { error: "Invalid request body: 'fileIds' must be an array of strings." },
                { status: 400 }
            );
        }
        fileIds = body.fileIds;
    } catch (e) {
        return NextResponse.json(
            { error: "Invalid JSON in request body." },
            { status: 400 }
        );
    }

    if (fileIds.length === 0) {
        return NextResponse.json(
            { message: "No file IDs provided, returning empty list.", data: [] },
            { status: 200 }
        );
    }

    try {
        const filesMetadata: IFile[] = await db(DBTABLES.FILES)
            .where('workspace_id', workspaceId)
            .whereIn('id', fileIds)
            .select('*');

        if (filesMetadata.length === 0 && fileIds.length > 0) {
            return NextResponse.json(
                { error: "No files found for the provided IDs in this workspace." },
                { status: 404 }
            );
        }

        const responseData = filesMetadata.map(fm => ({
            ...fm,
            logicalPath: fm.metadata?.targetPath || fm.name,
        }));

        return NextResponse.json(
            { message: "File metadata retrieved successfully", data: responseData },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error retrieving files metadata:", error);
        return NextResponse.json(
            { error: "Failed to retrieve files metadata" },
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
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
        return NextResponse.json(
            { error: "File ID is required" },
            { status: 400 }
        );
    }

    try {
        const fileMetadata: IFile | undefined = await db(DBTABLES.FILES)
            .where({
                id: fileId,
                workspace_id: workspaceId
            })
            .first();

        if (!fileMetadata) {
            return NextResponse.json(
                { error: "File not found or access denied" },
                { status: 404 }
            );
        }

        // The IFile type already includes the metadata property.
        // We can also augment it with logicalPath if needed, like in the main file route.
        const responseData: IFile = {
            ...fileMetadata,
            logicalPath: fileMetadata.metadata?.targetPath || fileMetadata.name,
        };


        return NextResponse.json(
            { message: "File metadata retrieved successfully", data: responseData },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error retrieving file metadata:", error);
        return NextResponse.json(
            { error: "Failed to retrieve file metadata" },
            { status: 500 }
        );
    }
}
