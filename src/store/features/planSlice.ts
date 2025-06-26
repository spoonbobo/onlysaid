import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { IPlan, ITask, PlanStatus, TaskStatus } from '@/types/plan';

// Define the state interface with string dates instead of Date objects
interface PlanState {
    plans: Array<Omit<IPlan, 'created_at' | 'updated_at' | 'completed_at'> & {
        created_at: string;
        updated_at: string;
        completed_at: string | null;
    }>;
    selectedPlanId: string | null;
    selectedTimelineItem: number | null;
    currentTaskId: number | null;
    tasks: Array<Omit<ITask, 'created_at' | 'start_time' | 'completed_at'> & {
        created_at: string | null;
        start_time: string | null;
        completed_at: string | null;
    }>;
    timelineData: Array<Omit<ITask, 'created_at' | 'start_time' | 'completed_at'> & {
        created_at: string | null;
        start_time: string | null;
        completed_at: string | null;
    }>;
    loading: {
        plans: boolean;
        tasks: boolean;
    };
    error: {
        plans: string | null;
        tasks: string | null;
    };
    statusFilter: PlanStatus | null;
    searchQuery: string;
    layout: {
        containerWidth: number | null;
        sidebarWidth: number;
        viewMode: 'kanban' | 'calendar';
    };
    planOrders: Record<PlanStatus, string[]>;
}

// Initial state
const initialState: PlanState = {
    plans: [],
    selectedPlanId: null,
    selectedTimelineItem: null,
    currentTaskId: null,
    tasks: [],
    timelineData: [],
    loading: {
        plans: false,
        tasks: false,
    },
    error: {
        plans: null,
        tasks: null,
    },
    statusFilter: null,
    searchQuery: '',
    layout: {
        containerWidth: null,
        sidebarWidth: 300,
        viewMode: 'kanban'
    },
    planOrders: {
        pending: [],
        running: [],
        success: [],
        failure: [],
        terminated: []
    }
};

// Async thunks for API calls
export const fetchPlans = createAsyncThunk(
    'plan/fetchPlans',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/plan/get_plans', {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            if (!response.ok) {
                throw new Error(`Server error (${response.status}): ${response.statusText}`);
            }

            const data = await response.json();

            // Process dates as strings for proper serialization
            const processedData = data.map((plan: any) => ({
                ...plan,
                created_at: plan.created_at ? new Date(plan.created_at).toISOString() : new Date().toISOString(),
                updated_at: plan.updated_at ? new Date(plan.updated_at).toISOString() : new Date().toISOString(),
                completed_at: plan.completed_at ? new Date(plan.completed_at).toISOString() : null,
                plan_id: plan.plan_id || plan.id,
                room_id: plan.room_id || null,
                status: plan.status || 'pending',
                progress: typeof plan.progress === 'number' ? plan.progress : 0
            }));

            return processedData;
        } catch (error) {
            console.error('Error fetching plans:', error);
            return rejectWithValue(error instanceof Error ? error.message : 'An unknown error occurred');
        }
    }
);

export const fetchTasks = createAsyncThunk(
    'plan/fetchTasks',
    async (planId: string, { rejectWithValue, signal, dispatch }) => {
        try {
            console.log(`[planSlice] Starting fetchTasks for plan ${planId}`);
            const controller = new AbortController();
            signal.addEventListener('abort', () => controller.abort());

            // Add timestamp to prevent caching
            const timestamp = new Date().getTime();
            const response = await fetch(`/api/plan/get_tasks?planId=${planId}&_t=${timestamp}`, {
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[planSlice] Error fetching tasks: ${response.status} ${response.statusText}`, errorText);
                return rejectWithValue(`Failed to fetch tasks: ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            console.log(`[planSlice] Fetched ${data.length} tasks for plan ${planId}:`, data);

            // Process dates as strings for proper serialization
            const processedData = data.map((task: any) => ({
                ...task,
                id: task.id || task.task_id,
                task_id: task.task_id || task.id,
                plan_id: task.plan_id || planId,
                created_at: task.created_at ? new Date(task.created_at).toISOString() : new Date().toISOString(),
                start_time: task.start_time ? new Date(task.start_time).toISOString() : null,
                completed_at: task.completed_at ? new Date(task.completed_at).toISOString() : null,
                status: task.status || 'pending',
                step_number: task.step_number || 0,
                task_name: task.task_name || 'Unnamed Task',
                task_explanation: task.task_explanation || ''
            }));

            console.log(`[planSlice] Processed ${processedData.length} tasks:`, processedData);
            return processedData;
        } catch (error) {
            console.error('[planSlice] Error in fetchTasks:', error);
            return rejectWithValue(error instanceof Error ? error.message : 'An unknown error occurred');
        }
    }
);

export const updatePlanStatus = createAsyncThunk(
    'plan/updateStatus',
    async ({ planId, status }: { planId: string, status: PlanStatus }, { rejectWithValue, getState }) => {
        const state = getState() as { plan: PlanState };
        const planInStore = state.plan.plans.find(p => p.plan_id === planId || p.id === planId);
        const idToUse = planInStore?.plan_id || planId;

        try {
            const response = await fetch(`/api/plan/update_plan`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_id: idToUse, status }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                return rejectWithValue(`Failed to update plan status: ${response.statusText} - ${errorText}`);
            }

            let updatedPlanData = null;
            try {
                const text = await response.text();
                if (text) {
                    updatedPlanData = JSON.parse(text).plan;
                }
            } catch (parseError) {
                // Continue even if parsing fails
            }

            window.dispatchEvent(new CustomEvent('plan-update', {
                detail: { planId: planId }
            }));

            return { planId: planId, status: status, updatedPlan: updatedPlanData };

        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'An unknown error occurred');
        }
    }
);

// Add a new action to update plan orders
export const updatePlanOrders = createAsyncThunk(
    'plan/updatePlanOrders',
    async (planOrders: Record<PlanStatus, string[]>, { dispatch }) => {
        // This is just to persist the state - no API call needed
        return planOrders;
    }
);

// Add a new thunk for updating task status
export const updateTaskStatus = createAsyncThunk(
    'plan/updateTaskStatus',
    async ({ taskId, status }: { taskId: string, status: TaskStatus }, { rejectWithValue, getState }) => {
        const state = getState() as { plan: PlanState };
        const taskInStore = state.plan.tasks.find(t => t.task_id === taskId || t.id === taskId);
        const idToUse = taskInStore?.task_id || taskId;

        try {
            const response = await fetch(`/api/plan/update_task`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id: idToUse, status }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                return rejectWithValue(`Failed to update task status: ${response.statusText} - ${errorText}`);
            }

            let updatedTaskData = null;
            try {
                const text = await response.text();
                if (text) {
                    updatedTaskData = JSON.parse(text).task;
                }
            } catch (parseError) {
                // Continue even if parsing fails
            }

            window.dispatchEvent(new CustomEvent('task-update', {
                detail: { taskId: taskId }
            }));

            return { taskId: taskId, status: status, updatedTask: updatedTaskData };

        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'An unknown error occurred');
        }
    }
);

// Create the slice
const planSlice = createSlice({
    name: 'plan',
    initialState,
    reducers: {
        selectPlan: (state, action: PayloadAction<string | null>) => {
            state.selectedPlanId = action.payload;
            state.selectedTimelineItem = null;
        },
        selectTimelineItem: (state, action: PayloadAction<number | null>) => {
            state.selectedTimelineItem = action.payload;
        },
        setSearchQuery: (state, action: PayloadAction<string>) => {
            state.searchQuery = action.payload;
        },
        setStatusFilter: (state, action: PayloadAction<PlanStatus | null>) => {
            state.statusFilter = action.payload;
        },
        clearTasksError: (state) => {
            state.error.tasks = null;
        },
        clearPlansError: (state) => {
            state.error.plans = null;
        },
        forceResetTasksLoading: (state) => {
            state.loading.tasks = false;
        },
        setCurrentTaskId: (state, action: PayloadAction<number | null>) => {
            state.currentTaskId = action.payload;
        },
        approvePlan: (state, action: PayloadAction<IPlan>) => {
            state.plans = state.plans.map((plan) =>
                plan.plan_id === action.payload.plan_id
                    ? { ...plan, status: 'running' }
                    : plan
            );
        },
        updateContainerWidth: (state, action: PayloadAction<number | null>) => {
            state.layout.containerWidth = action.payload;
        },
        updateSidebarWidth: (state, action: PayloadAction<number>) => {
            state.layout.sidebarWidth = action.payload;
        },
        updateViewMode: (state, action: PayloadAction<'kanban' | 'calendar'>) => {
            state.layout.viewMode = action.payload;
        },
        // Add a new reducer to update plan orders
        setPlanOrders: (state, action: PayloadAction<Record<PlanStatus, string[]>>) => {
            state.planOrders = action.payload;
        },
        // Add a new reducer for task orders if needed
        setTaskOrders: (state, action: PayloadAction<Record<TaskStatus, string[]>>) => {
            // You might want to add a taskOrders field to your state first
            // state.taskOrders = action.payload;
        },
    },
    extraReducers: (builder) => {
        // Handle fetchPlans
        builder.addCase(fetchPlans.pending, (state) => {
            state.loading.plans = true;
            state.error.plans = null;
        });
        builder.addCase(fetchPlans.fulfilled, (state, action) => {
            state.plans = action.payload;
            state.loading.plans = false;
        });
        builder.addCase(fetchPlans.rejected, (state, action) => {
            state.loading.plans = false;
            state.error.plans = action.payload as string;
        });

        // Handle fetchTasks
        builder.addCase(fetchTasks.pending, (state, action) => {
            state.loading.tasks = true;
            state.error.tasks = null;
        });
        builder.addCase(fetchTasks.fulfilled, (state, action) => {
            state.tasks = action.payload;
            state.timelineData = action.payload;

            // Calculate the current task ID (first non-completed task)
            const firstNonCompletedIndex = action.payload.findIndex((task: ITask) => !task.completed_at);
            state.currentTaskId = firstNonCompletedIndex >= 0 ? firstNonCompletedIndex : null;

            // Always explicitly set loading to false
            state.loading.tasks = false;

            // If we got an empty array, make sure loading is definitely false
            if (action.payload.length === 0) {
                state.loading.tasks = false;
            }
        });
        builder.addCase(fetchTasks.rejected, (state, action) => {
            state.loading.tasks = false;
            state.error.tasks = action.payload as string;
        });

        // Handle updatePlanStatus
        builder.addCase(updatePlanStatus.pending, (state, action) => {
            // Pending state handling without logs
        });
        builder.addCase(updatePlanStatus.fulfilled, (state, action) => {
            // Payload might be undefined if the thunk logic has issues, guard against it
            if (!action.payload) {
                return;
            }
            const { planId, status } = action.payload;

            const planIndex = state.plans.findIndex(p => p.plan_id === planId || p.id === planId);

            if (planIndex !== -1) {
                const oldStatus = state.plans[planIndex].status;
                // Update the plan status
                state.plans[planIndex] = { ...state.plans[planIndex], status: status };

                // Update plan orders if status actually changed
                if (oldStatus !== status) {
                    // Initialize planOrders if it doesn't exist
                    if (!state.planOrders) {
                        state.planOrders = {
                            pending: [],
                            running: [],
                            success: [],
                            failure: [],
                            terminated: []
                        };
                    }

                    // Ensure all status arrays exist
                    const validStatuses: PlanStatus[] = ['pending', 'running', 'success', 'failure', 'terminated'];
                    validStatuses.forEach(statusKey => {
                        if (!state.planOrders[statusKey]) {
                            state.planOrders[statusKey] = [];
                        }
                    });

                    // Now safely remove from old status order
                    if (oldStatus) {
                        const oldStatusAsPlanStatus = oldStatus as PlanStatus;
                        if (state.planOrders[oldStatusAsPlanStatus]) {
                            state.planOrders[oldStatusAsPlanStatus] = state.planOrders[oldStatusAsPlanStatus].filter(
                                (id: string) => id !== planId
                            );
                        }
                    }

                    // Add to new status order (we've already ensured the array exists)
                    if (!state.planOrders[status].includes(planId)) {
                        state.planOrders[status].push(planId);
                    }
                }
            }
        });
        builder.addCase(updatePlanStatus.rejected, (state, action) => {
            // Error handling without logs
        });

        // Handle updatePlanOrders
        builder.addCase(updatePlanOrders.fulfilled, (state, action) => {
            state.planOrders = action.payload;
        });

        // Handle updateTaskStatus
        builder.addCase(updateTaskStatus.pending, (state, action) => {
            // Pending state handling if needed
        });
        builder.addCase(updateTaskStatus.fulfilled, (state, action) => {
            // Payload might be undefined if the thunk logic has issues, guard against it
            if (!action.payload) {
                return;
            }
            const { taskId, status, updatedTask } = action.payload;

            // Find the task in the state
            const taskIndex = state.tasks.findIndex(t => t.task_id === taskId || t.id === taskId);

            if (taskIndex !== -1) {
                // Update the task with new status and any other updated fields
                if (updatedTask) {
                    // If we have complete updated task data from the server, use it
                    state.tasks[taskIndex] = {
                        ...state.tasks[taskIndex],
                        ...updatedTask,
                        status: status // Ensure status is updated even if not in updatedTask
                    };
                } else {
                    // Otherwise just update the status
                    state.tasks[taskIndex] = {
                        ...state.tasks[taskIndex],
                        status: status
                    };
                }

                // Also update the task in timelineData if it exists there
                const timelineIndex = state.timelineData.findIndex(t => t.task_id === taskId || t.id === taskId);
                if (timelineIndex !== -1) {
                    if (updatedTask) {
                        state.timelineData[timelineIndex] = {
                            ...state.timelineData[timelineIndex],
                            ...updatedTask,
                            status: status
                        };
                    } else {
                        state.timelineData[timelineIndex] = {
                            ...state.timelineData[timelineIndex],
                            status: status
                        };
                    }
                }

                // If the task is now completed and wasn't before, update the completed_at timestamp
                if (status === 'success' && !state.tasks[taskIndex].completed_at) {
                    const now = new Date().toISOString();
                    state.tasks[taskIndex].completed_at = now;

                    if (timelineIndex !== -1) {
                        state.timelineData[timelineIndex].completed_at = now;
                    }
                }

                // If the task is now running and wasn't before, update the start_time timestamp
                if (status === 'running' && !state.tasks[taskIndex].start_time) {
                    const now = new Date().toISOString();
                    state.tasks[taskIndex].start_time = now;

                    if (timelineIndex !== -1) {
                        state.timelineData[timelineIndex].start_time = now;
                    }
                }
            }
        });
        builder.addCase(updateTaskStatus.rejected, (state, action) => {
            // Error handling if needed
        });
    }
});

// Export actions and reducer
export const {
    selectPlan,
    selectTimelineItem,
    setSearchQuery,
    setStatusFilter,
    clearTasksError,
    clearPlansError,
    forceResetTasksLoading,
    setCurrentTaskId,
    approvePlan,
    updateContainerWidth,
    updateSidebarWidth,
    updateViewMode,
    setPlanOrders,
    setTaskOrders,
} = planSlice.actions;

export default planSlice.reducer;
