-- Create the n8n database
CREATE DATABASE n8n;

-- Create roles first
CREATE ROLE spoonbobo WITH LOGIN PASSWORD 'bobo1234';
GRANT ALL PRIVILEGES ON DATABASE postgres TO spoonbobo;

-- Grant privileges on n8n
GRANT ALL PRIVILEGES ON DATABASE n8n TO spoonbobo;

-- Connect to n8n to grant schema privileges
\c n8n

-- Grant usage on schema and privileges on future objects
GRANT USAGE ON SCHEMA public TO spoonbobo;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO spoonbobo;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO spoonbobo;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO spoonbobo;

-- Grant privileges on future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO spoonbobo;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO spoonbobo;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO spoonbobo;



-- PostgreSQL extensions that n8n might need
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Return to the default database for the rest of the seeds
\c postgres
