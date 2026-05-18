-- Add status to news table
ALTER TABLE news ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved';
