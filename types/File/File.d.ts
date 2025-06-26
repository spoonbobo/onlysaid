export interface IFile {
  id: string;
  workspace_id: string;
  name: string;
  size: number;
  mime_type: string;
  /**
   * Physical storage path on the server.
   * This may be sensitive information for direct frontend use.
   * Files are typically accessed via a dedicated download endpoint.
   */
  path: string;
  user_id?: string | null;
  created_at: string;
  updated_at?: string;
  /**
   * Flexible metadata object.
   * Can include properties like 'targetPath' for logical file organization.
   */
  metadata?: Record<string, any> & { targetPath?: string };
  /**
   * Logical path for the file, often derived from metadata.targetPath.
   * This is typically added by the backend when listing files.
   */
  logicalPath?: string | null;
}
