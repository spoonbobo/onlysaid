import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FileNode, Breadcrumb, FileContentResponse } from '@/types/file';

interface WorkbenchState {
    // File explorer state
    fileExplorer: {
        rootDirectory: FileNode | null;
        selectedItem: FileNode | null;
        currentPath: string;
        breadcrumbs: Breadcrumb[];
        searchQuery: string;
        fileContent: FileContentResponse | string | null;
        expandedPaths: string[];
    };
    // UI state
    ui: {
        sidebarWidth: number;
    };
    // Can add more workbench-related state sections here in the future
}

const initialState: WorkbenchState = {
    fileExplorer: {
        rootDirectory: null,
        selectedItem: null,
        currentPath: '/agent_home',
        breadcrumbs: [{ name: 'agent_home', path: '/agent_home' }],
        searchQuery: '',
        fileContent: null,
        expandedPaths: ['/agent_home'],
    },
    ui: {
        sidebarWidth: 300,
    }
};

export const workbenchSlice = createSlice({
    name: 'workbench',
    initialState,
    reducers: {
        // File explorer actions
        setRootDirectory: (state, action: PayloadAction<FileNode | null>) => {
            state.fileExplorer.rootDirectory = action.payload;
        },
        setSelectedItem: (state, action: PayloadAction<FileNode | null>) => {
            state.fileExplorer.selectedItem = action.payload;
        },
        setCurrentPath: (state, action: PayloadAction<string>) => {
            state.fileExplorer.currentPath = action.payload;
        },
        setBreadcrumbs: (state, action: PayloadAction<Breadcrumb[]>) => {
            state.fileExplorer.breadcrumbs = action.payload;
        },
        setSearchQuery: (state, action: PayloadAction<string>) => {
            state.fileExplorer.searchQuery = action.payload;
        },
        setFileContent: (state, action: PayloadAction<FileContentResponse | string | null>) => {
            state.fileExplorer.fileContent = action.payload;
        },
        // Add actions for expanded paths with safety checks
        addExpandedPath: (state, action: PayloadAction<string>) => {
            // Initialize expandedPaths if it doesn't exist
            if (!state.fileExplorer.expandedPaths) {
                state.fileExplorer.expandedPaths = [];
            }

            // Check if path already exists
            if (!state.fileExplorer.expandedPaths.includes(action.payload)) {
                state.fileExplorer.expandedPaths.push(action.payload);
            }
        },
        removeExpandedPath: (state, action: PayloadAction<string>) => {
            // Initialize expandedPaths if it doesn't exist
            if (!state.fileExplorer.expandedPaths) {
                state.fileExplorer.expandedPaths = [];
                return;
            }

            state.fileExplorer.expandedPaths = state.fileExplorer.expandedPaths.filter(
                path => path !== action.payload
            );
        },
        // UI actions
        setSidebarWidth: (state, action: PayloadAction<number>) => {
            // Ensure ui exists before setting properties
            if (!state.ui) {
                state.ui = { sidebarWidth: 300 };
            }
            state.ui.sidebarWidth = action.payload;
        },
        // Reset file explorer state
        resetFileExplorer: (state) => {
            state.fileExplorer = initialState.fileExplorer;
        },
    },
});

export const {
    setRootDirectory,
    setSelectedItem,
    setCurrentPath,
    setBreadcrumbs,
    setSearchQuery,
    setFileContent,
    addExpandedPath,
    removeExpandedPath,
    setSidebarWidth,
    resetFileExplorer,
} = workbenchSlice.actions;

export default workbenchSlice.reducer;
