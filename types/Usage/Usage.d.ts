export interface IUsageLog {
    id: string;
    date: string;
    user_id: string;
    kind: 'Included in Pro' | 'Free' | 'Enterprise' | 'Trial';
    max_mode: boolean;
    model: string;
    cost_requests: number;
    created_at: string;
}

export interface IUserPlan {
    id: string;
    user_id: string;
    plan_type: 'Pro' | 'Free' | 'Enterprise';
    monthly_limit: number;
    current_usage: number;
    reset_date: string;
    created_at: string;
}

export interface IModelPricing {
    id: string;
    model: string;
    cost_per_request: number;
    cost_per_input_token: number;
    cost_per_output_token: number;
    active: boolean;
    created_at: string;
}

// Request/Response interfaces
export interface ILogUsageArgs {
    token: string;
    data: {
        kind: IUsageLog['kind'];
        max_mode?: boolean;
        model: string;
        cost_requests?: number;
    };
}

export interface IGetUsageLogsArgs {
    token: string;
    limit?: number;
    offset?: number;
}

export interface IGetUsageAnalyticsArgs {
    token: string;
    days?: number;
}

export interface IGetPlanArgs {
    token: string;
}

export interface ICreatePlanArgs {
    token: string;
    data: {
        plan_type: IUserPlan['plan_type'];
        monthly_limit?: number;
        reset_date: string;
    };
}

export interface IUpdatePlanArgs {
    token: string;
    data: Partial<Omit<IUserPlan, 'id' | 'user_id' | 'created_at'>>;
}

// Analytics interfaces
export interface IUsageAnalytics {
    summary: {
        total_requests: number;
        total_cost: number;
        models_used: number;
    };
    daily: Array<{
        day: string;
        requests: number;
        cost: number;
    }>;
    models: Array<{
        model: string;
        requests: number;
        cost: number;
    }>;
}

export interface IUsageLogsResponse {
    data: IUsageLog[];
}

export interface IUsageAnalyticsResponse {
    data: IUsageAnalytics;
}

export interface IUserPlanResponse {
    data: IUserPlan;
}