// Calendar Provider Types
export type CalendarProvider = 'google' | 'outlook' | 'apple' | 'exchange';

// Base Calendar User/Account
export interface ICalendarUser {
    id: string;
    email: string;
    name?: string;
    provider: CalendarProvider;
    accessToken?: string;
    refreshToken?: string;
    expiryDate?: number;
}

// Base Calendar
export interface ICalendar {
    id: string;
    name: string;
    description?: string;
    primary?: boolean;
    provider: CalendarProvider;
    color?: string;
    timezone?: string;
    accessRole?: 'owner' | 'reader' | 'writer' | 'freeBusyReader';
    selected?: boolean;
}

// Event Date/Time Types
export interface IEventDateTime {
    dateTime?: string; // ISO string for timed events
    date?: string; // YYYY-MM-DD for all-day events
    timezone?: string;
}

// Event Attendee
export interface IEventAttendee {
    email: string;
    name?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
    organizer?: boolean;
    optional?: boolean;
}

// Event Recurrence
export interface IEventRecurrence {
    rule?: string; // RRULE string
    exceptions?: string[]; // Exception dates
}

// Base Calendar Event
export interface ICalendarEvent {
    id: string;
    calendarId: string;
    provider: CalendarProvider;
    summary: string;
    description?: string;
    location?: string;
    start: IEventDateTime;
    end: IEventDateTime;
    allDay?: boolean;
    attendees?: IEventAttendee[];
    organizer?: IEventAttendee;
    recurrence?: IEventRecurrence;
    status?: 'confirmed' | 'tentative' | 'cancelled';
    visibility?: 'default' | 'public' | 'private' | 'confidential';
    created?: string;
    updated?: string;
    url?: string;
    color?: string;
}

// Calendar Sync Status
export interface ICalendarSyncStatus {
    provider: CalendarProvider;
    lastSync?: Date;
    syncing: boolean;
    error?: string;
    nextPageToken?: string; // For pagination
}

// Calendar API Response Types
export interface ICalendarListResponse {
    calendars: ICalendar[];
    nextPageToken?: string;
    syncToken?: string;
}

export interface IEventsListResponse {
    events: ICalendarEvent[];
    nextPageToken?: string;
    syncToken?: string;
}

// Provider-specific extensions
export namespace Google {
    export interface ICalendar extends Omit<ICalendar, 'provider'> {
        provider: 'google';
        backgroundColor?: string;
        foregroundColor?: string;
        conferenceProperties?: {
            allowedConferenceSolutionTypes?: string[];
        };
    }

    export interface IEvent extends Omit<ICalendarEvent, 'provider'> {
        provider: 'google';
        htmlLink?: string;
        hangoutLink?: string;
        conferenceData?: {
            conferenceId?: string;
            conferenceSolution?: {
                key?: {
                    type?: string;
                };
            };
            entryPoints?: Array<{
                entryPointType?: string;
                uri?: string;
            }>;
        };
    }
}

export namespace Outlook {
    export interface ICalendar extends Omit<ICalendar, 'provider'> {
        provider: 'outlook';
        isDefaultCalendar?: boolean;
        canEdit?: boolean;
        canShare?: boolean;
        canViewPrivateItems?: boolean;
    }

    export interface IEvent extends Omit<ICalendarEvent, 'provider'> {
        provider: 'outlook';
        webLink?: string;
        isOnlineMeeting?: boolean;
        onlineMeetingUrl?: string;
        importance?: 'low' | 'normal' | 'high';
        sensitivity?: 'normal' | 'personal' | 'private' | 'confidential';
    }
}

// Unified Calendar Store State
export interface ICalendarStoreState {
    // Connected providers
    connectedProviders: CalendarProvider[];

    // Users/Accounts by provider
    users: Record<CalendarProvider, ICalendarUser | null>;

    // Calendars by provider
    calendars: Record<CalendarProvider, ICalendar[]>;

    // Events (unified across all providers)
    events: ICalendarEvent[];

    // Loading states
    loading: Record<CalendarProvider, boolean>;

    // Errors by provider
    errors: Record<CalendarProvider, string | null>;

    // Sync status
    syncStatus: Record<CalendarProvider, ICalendarSyncStatus>;

    // Selected date range
    dateRange: {
        start: Date;
        end: Date;
    };

    // View mode
    viewMode: 'day' | 'week' | 'month' | 'agenda';
}

// Calendar Action Types
export interface ICalendarActions {
    // Provider connection
    connectProvider: (provider: CalendarProvider) => Promise<void>;
    disconnectProvider: (provider: CalendarProvider) => void;

    // Data fetching
    fetchCalendars: (provider: CalendarProvider) => Promise<void>;
    fetchEvents: (provider: CalendarProvider, calendarIds?: string[], dateRange?: { start: Date; end: Date }) => Promise<void>;

    // Event management
    createEvent: (provider: CalendarProvider, calendarId: string, event: Partial<ICalendarEvent>) => Promise<ICalendarEvent>;
    updateEvent: (provider: CalendarProvider, calendarId: string, eventId: string, event: Partial<ICalendarEvent>) => Promise<ICalendarEvent>;
    deleteEvent: (provider: CalendarProvider, calendarId: string, eventId: string) => Promise<void>;

    // Calendar management
    toggleCalendar: (provider: CalendarProvider, calendarId: string, selected: boolean) => void;

    // View management
    setDateRange: (start: Date, end: Date) => void;
    setViewMode: (mode: 'day' | 'week' | 'month' | 'agenda') => void;

    // Error handling
    clearError: (provider: CalendarProvider) => void;
    clearAllErrors: () => void;

    // Sync
    syncProvider: (provider: CalendarProvider) => Promise<void>;
    syncAllProviders: () => Promise<void>;
}
