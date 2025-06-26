
// Update the interface to match GitHub issues format
export interface GitHubIssue {
    id: number;
    number: number;
    title: string;
    body: string;
    state: string;
    created_at: string;
    updated_at: string;
    labels: Array<{
        id: number;
        name: string;
        color: string;
    }>;
}