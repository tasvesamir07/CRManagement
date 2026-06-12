ALTER TABLE announcements
  DROP CONSTRAINT IF EXISTS announcements_file_id_fkey,
  ADD CONSTRAINT announcements_file_id_fkey
    FOREIGN KEY (file_id) REFERENCES files(id)
    ON DELETE SET NULL;
