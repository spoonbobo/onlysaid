-- create the plan table
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    plan_name TEXT,
    plan_overview TEXT,
    assigner UUID NOT NULL,
    assignee UUID NOT NULL,
    reviewer UUID,
    status TEXT, -- running/pending/success/failure/terminated
    room_id UUID,
    progress INTEGER,
    logs JSONB, -- list of plan_log ids
    context JSONB
);

-- Create the task table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    start_time TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    step_number INTEGER NOT NULL, -- to track the order of tasks in a plan
    task_name TEXT NOT NULL, -- from the "name" field in your JSON
    task_explanation TEXT NOT NULL, -- from the "explanation" field in your JSON
    expected_result TEXT, -- from the "expected_result" field in your JSON
    mcp_server TEXT,
    skills JSONB,
    status TEXT, -- pending/running/success/failure
    result TEXT,
    logs JSONB
);


CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- TODO: add updated_at, but not important for now
    type TEXT,
    plan_id UUID,
    task_id UUID,
    skill_id UUID,
    content TEXT
);

CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    name TEXT,
    mcp_server TEXT,
    description TEXT,
    type TEXT,
    args JSONB
);
