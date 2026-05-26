-- Restore Cruise as a first-class event type (was merged into road in 004).
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'cruise';
