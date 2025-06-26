-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(255) PRIMARY KEY,
    content TEXT,
    content_path VARCHAR(255),
    parent_id VARCHAR(255),
    source_type VARCHAR(50) NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    source_url VARCHAR(255),
    source_file_type VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    author_list TEXT,
    created_at TIMESTAMP,
    last_modified TIMESTAMP,
    ingested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    language VARCHAR(50) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    tags TEXT,
    topics TEXT,
    categories TEXT,
    chunk_index INTEGER,
    total_chunks INTEGER,
    chunk_strategy VARCHAR(50),
    chunk_size INTEGER,
    chunk_overlap INTEGER,
    chunk_section VARCHAR(255),
    embedding_model VARCHAR(100),
    embedding_version VARCHAR(50),
    embedding_dimensions INTEGER,
    embedding_created_at TIMESTAMP,
    importance_score FLOAT,
    recency_score FLOAT,
    view_count INTEGER DEFAULT 0,
    feedback_score FLOAT,
    additional_metadata JSONB,
    FOREIGN KEY (parent_id) REFERENCES documents(id)
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_documents_parent_id ON documents(parent_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_language ON documents(language);
CREATE INDEX IF NOT EXISTS idx_documents_ingested_at ON documents(ingested_at);

-- Insert sample seed data
INSERT INTO documents (
    id, content, content_path, parent_id, source_type, source_name, source_url, 
    source_file_type, title, author_list, created_at, last_modified, language, 
    document_type, tags, topics, categories, chunk_index, total_chunks, 
    chunk_strategy, chunk_size, chunk_overlap, importance_score, view_count
) VALUES
(
    'doc_001', 
    'This is a sample document about artificial intelligence.', 
    '/storage/documents/original/doc_001.pdf',
    NULL,
    'file',
    'AI Introduction',
    NULL,
    'pdf',
    'Introduction to Artificial Intelligence',
    'John Doe,Jane Smith',
    '2023-01-15 10:00:00',
    '2023-01-20 14:30:00',
    'en',
    'article',
    'AI,Machine Learning,Introduction',
    'Artificial Intelligence,Beginner Guide',
    'Technology,Education',
    0,
    5,
    'semantic',
    1000,
    200,
    0.8,
    0
),
(
    'doc_001_chunk_1',
    'Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to intelligence of humans and other animals.',
    NULL,
    'doc_001',
    'file',
    'AI Introduction',
    NULL,
    'pdf',
    'Introduction to Artificial Intelligence - Part 1',
    'John Doe,Jane Smith',
    '2023-01-15 10:00:00',
    '2023-01-20 14:30:00',
    'en',
    'article',
    'AI,Machine Learning,Introduction',
    'Artificial Intelligence,Beginner Guide',
    'Technology,Education',
    1,
    5,
    'semantic',
    1000,
    200,
    0.8,
    3
),
(
    'doc_002',
    'This document covers the fundamentals of database design.',
    '/storage/documents/original/doc_002.docx',
    NULL,
    'file',
    'Database Design',
    NULL,
    'docx',
    'Database Design Fundamentals',
    'Alice Johnson',
    '2023-02-10 09:15:00',
    '2023-02-12 16:45:00',
    'en',
    'tutorial',
    'Databases,SQL,Design',
    'Database,Fundamentals',
    'Technology,Computer Science',
    0,
    3,
    'fixed',
    800,
    150,
    0.7,
    0
);

-- Create a view for easier querying
CREATE OR REPLACE VIEW document_view AS
SELECT 
    d.id,
    d.title,
    d.content,
    d.document_type,
    d.language,
    d.source_name,
    d.ingested_at,
    CASE WHEN d.parent_id IS NULL THEN 'Parent' ELSE 'Chunk' END as doc_type,
    d.view_count
FROM 
    documents d
ORDER BY 
    d.ingested_at DESC;
