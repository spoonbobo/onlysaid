import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import db, { DBTABLES } from "@/lib/db";
import { createReadStream } from 'fs';
import { IFile } from '@/../../types/File/File';
import { backendSocketClient } from '@/lib/socketClient';

// Real progress tracking
class FileUploadProgress {
    private operationId: string;
    private userId: string;
    private totalOperations: number = 0;
    private completedOperations: number = 0;
    private currentStage: string = '';

    constructor(operationId: string, userId: string) {
        this.operationId = operationId;
        this.userId = userId;
    }

    setTotalOperations(total: number) {
        this.totalOperations = total;
    }

    completeOperation(stageName: string) {
        this.completedOperations++;
        this.currentStage = stageName;
        this.broadcast();
    }

    updateFileWriteProgress(bytesWritten: number, totalBytes: number, stageName: string) {
        // Map server processing to 50-100% range
        const baseProgress = Math.floor((this.completedOperations / this.totalOperations) * 50);
        const writeProgress = Math.floor((bytesWritten / totalBytes) * (50 / this.totalOperations));
        const serverProgress = baseProgress + writeProgress;
        // Final progress = 50% (network complete) + server progress
        const totalProgress = Math.min(99, 50 + serverProgress);

        this.currentStage = stageName;
        this.broadcastCustom(totalProgress);
    }

    complete() {
        this.completedOperations = this.totalOperations;
        this.currentStage = 'complete';
        this.broadcastCustom(100);
    }

    private broadcast() {
        // Map server operations to 50-100% range
        const serverProgress = Math.floor((this.completedOperations / this.totalOperations) * 50);
        const totalProgress = 50 + serverProgress; // 50% network + 50% server
        this.broadcastCustom(totalProgress);
    }

    private broadcastCustom(progress: number) {
        console.log(`📊 Upload ${this.operationId}: ${this.currentStage} - ${progress}% (${this.completedOperations}/${this.totalOperations})`);

        backendSocketClient.emit('broadcast:file:progress', {
            operationId: this.operationId,
            progress,
            stage: this.currentStage,
            userId: this.userId
        });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const operationId = request.headers.get('x-operation-id') || uuidv4();
    const authenticated = await authenticateRequest(request);

    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const userId = authenticated.user?.id;
    const progress = new FileUploadProgress(operationId, userId);

    // Define total operations for real progress
    progress.setTotalOperations(8); // 8 main operations

    // Check content length first
    const contentLength = request.headers.get('content-length');
    const maxSize = 100 * 1024 * 1024; // 100MB

    if (contentLength && parseInt(contentLength) > maxSize) {
        return NextResponse.json(
            { error: "File too large. Maximum size is 100MB." },
            { status: 413 }
        );
    }

    try {
        // Operation 1: Parse form data
        let formData;
        try {
            formData = await request.formData();
            progress.completeOperation('parsing');
        } catch (error) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 100MB." },
                { status: 413 }
            );
        }

        console.log("formData", formData);
        const file = formData.get('file') as File;
        const metadataStr = formData.get('metadata') as string;
        const frontendMetadata = metadataStr ? JSON.parse(metadataStr) : {};

        // Operation 2: Validate file exists
        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }
        progress.completeOperation('validating');

        // Operation 3: Validate file size
        if (file && file.size > maxSize) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 100MB." },
                { status: 413 }
            );
        }
        progress.completeOperation('validating');

        // Operation 4: Prepare storage paths
        const { workspaceId } = await params;
        const baseStorageDir = path.join(process.cwd(), 'storage', workspaceId);
        const logicalTargetPath = frontendMetadata.targetPath || file.name;
        const logicalTargetDir = path.dirname(logicalTargetPath);
        const fullTargetDir = logicalTargetDir === '.' ? baseStorageDir : path.join(baseStorageDir, logicalTargetDir);
        progress.completeOperation('preparing');

        // Operation 5: Create directories
        await fs.mkdir(fullTargetDir, { recursive: true });
        const fileId = uuidv4();
        const originalFileExtension = path.extname(file.name);
        const physicalFileNameWithExtension = fileId + originalFileExtension;
        const physicalStoragePath = path.join(fullTargetDir, physicalFileNameWithExtension);
        progress.completeOperation('preparing');

        // Operation 6: Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        progress.completeOperation('writing');

        // Operation 7: Write file with real progress
        const totalBytes = buffer.length;
        const chunkSize = Math.max(1024 * 1024, Math.floor(totalBytes / 10)); // 1MB chunks or 10% chunks
        let bytesWritten = 0;

        // Write file in chunks to track real progress
        const fileHandle = await fs.open(physicalStoragePath, 'w');
        try {
            for (let i = 0; i < totalBytes; i += chunkSize) {
                const chunk = buffer.slice(i, Math.min(i + chunkSize, totalBytes));
                await fileHandle.write(chunk, 0, chunk.length, i);
                bytesWritten += chunk.length;

                // Update progress based on actual bytes written
                progress.updateFileWriteProgress(bytesWritten, totalBytes, 'writing');
            }
        } finally {
            await fileHandle.close();
        }
        progress.completeOperation('writing');

        // Operation 8: Database insertion
        const fileRecord = await db(DBTABLES.FILES).insert({
            id: fileId,
            workspace_id: workspaceId,
            name: file.name,
            size: file.size,
            mime_type: file.type,
            path: physicalStoragePath,
            user_id: userId,
            metadata: frontendMetadata
        }).returning('*');

        // Complete
        progress.complete();

        // Clean up after completion
        backendSocketClient.emit('broadcast:file:completed', {
            operationId,
            userId
        });

        return NextResponse.json({
            message: "File uploaded successfully",
            data: fileRecord[0] as IFile,
            operationId
        });
    } catch (error) {
        console.error("Error uploading file:", error);

        backendSocketClient.emit('broadcast:file:error', {
            operationId,
            error: (error as Error).message,
            userId
        });

        return NextResponse.json(
            { error: "Failed to upload file" },
            { status: 500 }
        );
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const { searchParams } = new URL(request.url);
    const operationId = searchParams.get('operationId');

    const authenticated = await authenticateRequest(request);
    if (!authenticated.isAuthenticated) {
        return unauthorized();
    }

    const fileId = searchParams.get('fileId');
    const { workspaceId } = await params;

    if (!fileId) {
        const files: IFile[] = await db(DBTABLES.FILES)
            .where('workspace_id', workspaceId)
            .select('*');

        const filesWithLogicalPath = files.map(f => ({
            ...f,
            logicalPath: f.metadata?.targetPath || null
        }));

        return NextResponse.json(
            { message: "Files retrieved", data: filesWithLogicalPath },
            { status: 200 }
        );
    } else {
        const file: IFile | undefined = await db(DBTABLES.FILES)
            .where({
                id: fileId,
                workspace_id: workspaceId
            })
            .first();

        if (!file) {
            return NextResponse.json(
                { error: "File not found" },
                { status: 404 }
            );
        }

        try {
            // Check if file exists
            await fs.access(file.path);

            // Read the file as a buffer for smaller files, or use streaming for larger files
            const stats = await fs.stat(file.path);

            if (stats.size < 10 * 1024 * 1024) { // Less than 10MB, read into memory
                const fileBuffer = await fs.readFile(file.path);

                return new Response(new Uint8Array(fileBuffer), {
                    headers: {
                        'Content-Type': file.mime_type,
                        'Content-Disposition': `attachment; filename="${file.name}"`,
                        'Content-Length': String(file.size)
                    }
                });
            } else { // Larger files, use streaming
                const nodeStream = createReadStream(file.path);

                // Convert Node.js ReadStream to Web ReadableStream
                const webStream = new ReadableStream({
                    start(controller) {
                        nodeStream.on('data', (chunk) => {
                            const uint8Array = chunk instanceof Buffer ? new Uint8Array(chunk) : new Uint8Array(Buffer.from(chunk as string));
                            controller.enqueue(uint8Array);
                        });

                        nodeStream.on('end', () => {
                            controller.close();
                        });

                        nodeStream.on('error', (error) => {
                            controller.error(error);
                        });
                    },
                    cancel() {
                        nodeStream.destroy();
                    }
                });

                return new Response(webStream, {
                    headers: {
                        'Content-Type': file.mime_type,
                        'Content-Disposition': `attachment; filename="${file.name}"`,
                        'Content-Length': String(file.size)
                    }
                });
            }
        } catch (error) {
            console.error("Error streaming file:", error);
            return NextResponse.json(
                { error: "Failed to read file" },
                { status: 500 }
            );
        }
    }
}

export async function DELETE(
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
        const file: IFile | undefined = await db(DBTABLES.FILES)
            .where({
                id: fileId,
                workspace_id: workspaceId
            })
            .first();

        if (!file) {
            return NextResponse.json(
                { error: "File not found" },
                { status: 404 }
            );
        }

        await fs.unlink(file.path);

        await db(DBTABLES.FILES)
            .where('id', fileId)
            .delete();

        return NextResponse.json(
            { message: "File deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error deleting file:", error);
        return NextResponse.json(
            { error: "Failed to delete file" },
            { status: 500 }
        );
    }
}

export const maxDuration = 60; // 60 seconds timeout
export const dynamic = 'force-dynamic';