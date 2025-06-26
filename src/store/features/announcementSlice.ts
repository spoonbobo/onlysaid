import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';

interface AnnouncementItem {
    text: string;
    type: string;
}

interface AnnouncementState {
    isVisible: boolean;
    isCollapsed: boolean;
    message: string;
    id: string;
    items: AnnouncementItem[];
    currentIndex: number;
}

const initialState: AnnouncementState = {
    isVisible: true,
    isCollapsed: false,
    message: '🎉 Welcome to our platform! Check out our new features in the latest update.',
    id: 'default-announcement',
    items: [{ text: '🎉 Welcome to our platform! Check out our new features in the latest update.', type: 'info' }],
    currentIndex: 0
};

export const announcementSlice = createSlice({
    name: 'announcement',
    initialState,
    reducers: {
        dismissAnnouncement: (state) => {
            state.isVisible = false;
        },
        toggleCollapse: (state) => {
            state.isCollapsed = !state.isCollapsed;
        },
        setMessage: (state, action: PayloadAction<string>) => {
            state.message = action.payload;
        },
        resetAnnouncement: (state) => {
            return initialState;
        },
        setAnnouncementId: (state, action: PayloadAction<string>) => {
            state.id = action.payload;
        },
        setAnnouncementItems: (state, action: PayloadAction<AnnouncementItem[]>) => {
            state.items = action.payload;
        },
        setCurrentAnnouncementIndex: (state, action: PayloadAction<number>) => {
            state.currentIndex = action.payload;
        },
    },
});

// Export actions
export const {
    dismissAnnouncement,
    toggleCollapse,
    setMessage,
    resetAnnouncement,
    setAnnouncementId,
    setAnnouncementItems,
    setCurrentAnnouncementIndex,
} = announcementSlice.actions;

// Export selectors
export const selectAnnouncementState = (state: RootState) => state.announcement;
export const selectIsVisible = (state: RootState) => state.announcement.isVisible;
export const selectIsCollapsed = (state: RootState) => state.announcement.isCollapsed;
export const selectMessage = (state: RootState) => state.announcement.message;
export const selectAnnouncementItems = (state: RootState) => state.announcement.items;
export const selectCurrentAnnouncementIndex = (state: RootState) => state.announcement.currentIndex;

export default announcementSlice.reducer;
