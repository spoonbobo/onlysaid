-- Simple usage logging table
CREATE TABLE IF NOT EXISTS usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    kind VARCHAR(50) NOT NULL, -- 'Included in Pro', 'Free', etc.
    max_mode BOOLEAN DEFAULT FALSE,
    model VARCHAR(100) NOT NULL, -- 'claude-4-sonnet', etc.
    cost_requests DECIMAL(10, 2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User subscription/plan table
CREATE TABLE IF NOT EXISTS user_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL, -- 'Pro', 'Free', 'Enterprise'
    monthly_limit DECIMAL(10, 2) DEFAULT 0.0,
    current_usage DECIMAL(10, 2) DEFAULT 0.0,
    reset_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Model pricing table
CREATE TABLE IF NOT EXISTS model_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model VARCHAR(100) NOT NULL UNIQUE,
    cost_per_request DECIMAL(10, 4) DEFAULT 0.0,
    cost_per_input_token DECIMAL(10, 6) DEFAULT 0.0,
    cost_per_output_token DECIMAL(10, 6) DEFAULT 0.0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_date ON usage_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_model_pricing_model ON model_pricing(model);

-- Sample data with correct user IDs from 01_users.sql
INSERT INTO usage_logs (date, user_id, kind, max_mode, model, cost_requests) VALUES
('2024-06-04 12:49:00+00', '60b1a441-a4dd-4b5e-b88e-1ac1226005ca', 'Included in Pro', FALSE, 'claude-4-sonnet', 0.5),
('2024-06-04 12:42:00+00', '60b1a441-a4dd-4b5e-b88e-1ac1226005ca', 'Included in Pro', FALSE, 'claude-4-sonnet', 0.5),
('2024-06-04 01:29:00+00', '60b1a441-a4dd-4b5e-b88e-1ac1226005ca', 'Included in Pro', FALSE, 'claude-4-sonnet', 0.5);

INSERT INTO model_pricing (model, cost_per_request) VALUES
('claude-4-sonnet', 0.5),
('gpt-4', 0.8),
('gpt-3.5-turbo', 0.2);

INSERT INTO user_plans (user_id, plan_type, monthly_limit, reset_date) VALUES
('60b1a441-a4dd-4b5e-b88e-1ac1226005ca', 'Pro', 100.0, '2024-07-01');
 