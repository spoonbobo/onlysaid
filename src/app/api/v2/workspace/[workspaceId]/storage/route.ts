import { authenticateRequest, unauthorized } from "@/utils/auth";
import { NextResponse } from "next/server";
import path from 'path';
import { promises as fs, constants as fsConstants } from 'fs';

async function getDirectoryContents(basePath: string, relativeDir: string = '') {
    const targetPath = path.join(basePath, relativeDir);
    const contents = [];

    try {
        const stats = await fs.stat(targetPath);
        if (!stats.isDirectory()) {
            return {
                currentPath: relativeDir,
                contents: [],
                error: "Path is not a directory"
            };
        }

        const dirents = await fs.readdir(targetPath, { withFileTypes: true });
        for (const dirent of dirents) {
            if (dirent.isDirectory()) {
                contents.push({
                    name: dirent.name,
                    type: 'directory',
                    path: path.join(relativeDir, dirent.name)
                });
            } else {
                const physicalFileName = dirent.name;
                const extension = path.extname(physicalFileName);
                const uuidName = path.basename(physicalFileName, extension);

                contents.push({
                    name: uuidName,
                    type: 'file',
                    path: path.join(relativeDir, uuidName)
                });
            }
        }
        return {
            currentPath: relativeDir,
            contents: contents
        };
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return {
                currentPath: relativeDir,
                contents: [],
                error: "Directory not found"
            };
        }
        console.error(`Error reading directory ${targetPath}:`, error);
        throw error;
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
    const requestedRelativePath = searchParams.get('relativePath') || '';

    const workspaceStorageRoot = path.join(process.cwd(), 'storage', workspaceId);

    const normalizedRequestedPath = path.normalize(requestedRelativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const absoluteRequestedPath = path.join(workspaceStorageRoot, normalizedRequestedPath);

    if (!absoluteRequestedPath.startsWith(workspaceStorageRoot)) {
        return NextResponse.json(
            { error: "Invalid path" },
            { status: 400 }
        );
    }
    const safeRelativePath = path.relative(workspaceStorageRoot, absoluteRequestedPath);

    try {
        try {
            await fs.access(workspaceStorageRoot, fsConstants.F_OK);
        } catch (e) {
            await fs.mkdir(workspaceStorageRoot, { recursive: true });
            return NextResponse.json(
                {
                    workspaceStorageRoot: workspaceStorageRoot,
                    currentPath: '',
                    contents: []
                },
                { status: 200 }
            );
        }

        const listing = await getDirectoryContents(workspaceStorageRoot, safeRelativePath);

        if (listing.error) {
            const status = listing.error === "Directory not found" ? 404 : 400;
            return NextResponse.json(
                {
                    workspaceStorageRoot,
                    currentPath: safeRelativePath,
                    contents: [],
                    error: listing.error
                },
                { status }
            );
        }

        return NextResponse.json(
            {
                workspaceStorageRoot: workspaceStorageRoot,
                currentPath: listing.currentPath,
                contents: listing.contents
            },
            { status: 200 }
        );
    } catch (error) {
        console.error(`Error listing storage for workspace ${workspaceId} at path ${safeRelativePath}:`, error);
        return NextResponse.json(
            { error: "Failed to list storage contents" },
            { status: 500 }
        );
    }
}