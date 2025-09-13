-- Migration: Create revocation table with device_id as primary key

CREATE TABLE IF NOT EXISTS revocation (
    device_id VARCHAR PRIMARY KEY,
    is_revocked BOOLEAN NOT NULL DEFAULT FALSE
);