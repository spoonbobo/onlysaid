export interface DataSource {
    id: string;
    name: string;
    icon: React.ComponentType;
    count: number;
}

export interface Folder {
    id: string;
    name: string;
    folders?: Folder[];
    files?: string[];
    isOpen?: boolean;
}

export interface Document {
    id: string;
    title: string;
    type: string;
    date: string;
    tags: string[];
    source: string;
    description: string;
    url: string;
    folderId: string;
}
