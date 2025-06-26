import { User } from "./user";
import { IMessage } from "./chat";

export interface ISkill {
    name?: string;
    created_at?: Date;
    updated_at?: Date;
    mcp_server?: string;
    description?: string;
    type?: string;
    args?: Record<string, any>;
}

export interface IContextItem {
    sender: User;
    message: IMessage;
}

export type PlanStatus = 'pending' | 'running' | 'success' | 'failure' | 'terminated';
export type TaskStatus = 'pending' | 'running' | 'success' | 'failure' | 'denied' | 'not_started';

export interface IPlan {
    id: string;
    plan_id: string;
    plan_name: string;
    plan_overview: string;
    status: string;
    progress: number;
    room_id: string;
    assigner: string;
    assignee: string;
    reviewer: string | null;
    created_at: Date;
    updated_at: Date;
    completed_at: Date | null;
    logs?: Log[];
    context?: any[];
}


export interface ITask {
    id?: string;
    task_id?: string;
    plan_id: string;
    task_name: string;
    task_explanation?: string;
    status: string;
    step_number: number;
    created_at?: Date;
    updated_at?: Date;
    start_time?: Date | null;
    completed_at?: Date | null;
    skills?: any;
    expected_result?: string;
    result?: string;
    mcp_server?: string;
    logs?: any;
}

export interface IPlanFromAPI {
    id: string;
    plan_id: string;
    plan_name: string;
    plan_overview: string;
    status: string;
    progress: number;
    room_id: string;
    assigner: string;
    assignee: string;
    reviewer: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    logs?: Log[];
    context?: any[];
}

export const logTypes = ['created_plan', 'ask_for_plan_confirmation'];

export class Log {
    id: string;
    created_at: Date;
    type: string;
    plan_id?: string;
    task_id?: string;
    skill_id?: string;
    content: string;
}

export interface PlanLog {
    id: string;
    created_at: Date | string;
    type: string;
    content: string;
    planName?: string;
    planShortId?: string;
    task_id?: string;
    plan_id?: string;
    planNavId?: string;
    planOverview?: string;
    skills?: any[];
}

