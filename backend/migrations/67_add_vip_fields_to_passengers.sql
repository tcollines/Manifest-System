-- Add VIP fields to passengers table
ALTER TABLE passengers 
ADD COLUMN IF NOT EXISTS vip_type VARCHAR(255),
ADD COLUMN IF NOT EXISTS organization VARCHAR(255),
ADD COLUMN IF NOT EXISTS transport_means VARCHAR(255);
