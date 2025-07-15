// N8n Node Types
export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, string>;
}

export interface N8nConnection {
  node: string;
  type: string;
  index: number;
}

export interface N8nWorkflowData {
  nodes: N8nNode[];
  connections: Record<string, Record<string, N8nConnection[][]>>;
}

export interface N8nWorkflow {
  id?: string;
  name: string;
  active?: boolean; // Make this optional
  nodes: N8nNode[];
  connections: Record<string, Record<string, N8nConnection[][]>>;
  settings?: {
    timezone?: string;
    saveManualExecutions?: boolean;
    saveExecutionProgress?: boolean;
    saveDataErrorExecution?: string;
    saveDataSuccessExecution?: string;
    executionTimeout?: number;
    errorWorkflow?: string;
    executionOrder?: string;
  };
  staticData?: Record<string, any>;
  tags?: string[];
  triggerCount?: number;
  updatedAt?: string;
  createdAt?: string;
}

// Specific Node Types
export interface CronTriggerNode extends N8nNode {
  type: 'n8n-nodes-base.cron';
  parameters: {
    triggerTimes: {
      hour: number;
      minute: number;
      second: number;
      weekday?: number[];
      monthday?: number[];
      month?: number[];
    };
    timezone: string;
  };
}

export interface EmailNode extends N8nNode {
  type: 'n8n-nodes-base.emailSend';
  parameters: {
    fromEmail: string;
    toEmail: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: string;
    options?: {
      allowUnauthorizedCerts?: boolean;
      cc?: string;
      bcc?: string;
      replyTo?: string;
    };
  };
  credentials: {
    smtp: string;
  };
}

// Discussion Section Workflow Specific Types
export interface DiscussionSectionWorkflowParams {
  courseCode: string;
  sectionNumber: string;
  room: string;
  instructorEmail: string;
  studentEmails: string[];
  scheduleDate: string; // ISO date string
  scheduleTime: string; // HH:MM format
  timezone: string;
  periodType?: 'one-time' | 'recurring' | 'specific-dates';
  frequency?: 'daily' | 'weekly' | 'monthly';
  days?: string[];
}

export interface DiscussionSectionEmailContent {
  subject: string;
  htmlContent: string;
  textContent: string;
}
