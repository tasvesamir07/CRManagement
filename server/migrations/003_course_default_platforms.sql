-- Add course_id to platforms table for course association
ALTER TABLE platforms 
ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id);

-- Add default_platform_ids to courses table for global defaults per course
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS default_platform_ids INTEGER[] DEFAULT '{}';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_platforms_course_id ON platforms(course_id);