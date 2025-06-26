export interface Team {
    id: string;
    created_at: string;
    updated_at: string;
    name: string;
    members: string[];
    rooms: string[];
    owners: string[];
    invite_code: string;
    settings: any;
}