ALTER TABLE members
ADD COLUMN follow_up_status ENUM('pending', 'followed') DEFAULT 'pending',
ADD COLUMN last_contact TIMESTAMP NULL,
ADD COLUMN follow_up_note TEXT;
