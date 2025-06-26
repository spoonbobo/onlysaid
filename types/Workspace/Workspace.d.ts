import { IUser } from "../User/User";

export interface IWorkspace {
    id: string;
    created_at: string;
    updated_at: string;
    image: string;
    name: string;
    invite_code: string;
    settings: Record<string, any>;
}

export interface IWorkspaceUser {
    workspace_id: string;
    user_id: string;
    role: 'super_admin' | 'admin' | 'member';
    created_at: string;
    username?: string;
    avatar?: string;
    last_login?: string;
    email?: string;
    level?: number;
    agent_id?: string;
    settings?: Record<string, any>;
}

export interface ICreateWorkspaceArgs {
    request: IWorkspace;
    token: string;
    users?: IWorkspaceUser[];
}

export interface IGetWorkspaceArgs {
    token: string;
    workspaceId: string;
    userId: string;
}

export interface IUpdateWorkspaceArgs {
    workspaceId: string;
    request: Partial<Omit<IWorkspace, 'id' | 'created_at' | 'updated_at'>>;
    token: string;
}

export interface IWorkspaceUserArgs {
    token: string;
    workspaceId: string;
    userId: string;
    role?: string;
}

export interface IGetWorkspaceUsersArgs {
    token: string;
    workspaceId: string;
    role?: string;
}

export interface IAddUserToWorkspaceRequest {
    user_id: string;
    email?: string;
    role: 'super_admin' | 'admin' | 'member';
}

export interface IAddUsersToWorkspaceArgs {
    token: string;
    workspaceId: string;
    request: IAddUserToWorkspaceRequest[];
}

export interface IRemoveUserFromWorkspaceArgs {
    token: string;
    workspaceId: string;
    userId: string;
}

export interface IWorkspaceWithRole extends IWorkspace {
    role?: 'super_admin' | 'admin' | 'member';
}

export interface IGetUsersFromWorkspaceArgs {
    token: string;
    workspaceId: string;
}

export interface IWorkspaceInvitation {
    id: string;
    workspace_id: string;
    inviter_id: string;
    invitee_email: string;
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
    updated_at: string;
    inviter_username?: string;
    inviter_avatar?: string;
    workspace_name?: string;
    workspace_image?: string;
}

export interface IWorkspaceJoin {
    id: string;
    user_id: string;
    workspace_id: string;
    status: 'pending' | 'active' | 'left';
    created_at: string;
    updated_at: string;
    username?: string;
    avatar?: string;
    email?: string;
}

export interface ISendInvitationArgs {
    token: string;
    workspaceId: string;
    invitee_email: string;
}

export interface IGetInvitationsArgs {
    token: string;
    workspaceId: string;
    status?: string;
}

export interface IUpdateInvitationArgs {
    token: string;
    workspaceId: string;
    invitation_id: string;
    status: 'accepted' | 'declined';
}

export interface ICancelInvitationArgs {
    token: string;
    workspaceId: string;
    invitationId: string;
}

export interface IJoinWorkspaceArgs {
    token: string;
    workspaceId: string;
    invite_code?: string;
}

export interface IGetJoinRequestsArgs {
    token: string;
    workspaceId: string;
}

export interface IUpdateJoinRequestArgs {
    token: string;
    workspaceId: string;
    user_id: string;
    status: 'active' | 'left';
}

export interface ILeaveWorkspaceArgs {
    token: string;
    workspaceId: string;
}

export interface IWorkspaceSettings {
    id: string;
    workspace_id: string;
    moodle_course_id?: string;
    moodle_api_token?: string;
    selected_assignment_id?: string;
    created_at: string;
    updated_at: string;
}

export interface IGetWorkspaceSettingsArgs {
    token: string;
    workspaceId: string;
}

export interface ICreateWorkspaceSettingsArgs {
    token: string;
    workspaceId: string;
    request: {
        moodle_course_id?: string;
        moodle_api_token?: string;
        selected_assignment_id?: string;
    };
}

export interface IUpdateWorkspaceSettingsArgs {
    token: string;
    workspaceId: string;
    request: {
        moodle_course_id?: string;
        moodle_api_token?: string;
        selected_assignment_id?: string;
    };
}

export interface IDeleteWorkspaceSettingsArgs {
    token: string;
    workspaceId: string;
}

export interface IGetUserInvitationsArgs {
    token: string;
    status?: string;
}