-- Migration: 014_sync_interval_field.sql
-- Add sync interval configuration per campaign

-- Add column for sync interval in seconds
ALTER TABLE whatsapp_bot.whatsapp_campaigns 
ADD COLUMN IF NOT EXISTS sync_interval_seconds INTEGER DEFAULT 30;

-- Add check constraint to ensure reasonable values (5 seconds to 1 hour)
ALTER TABLE whatsapp_bot.whatsapp_campaigns 
ADD CONSTRAINT check_sync_interval_range 
CHECK (sync_interval_seconds >= 5 AND sync_interval_seconds <= 3600);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_sync_interval 
ON whatsapp_bot.whatsapp_campaigns(sync_interval_seconds);

-- Update existing campaigns to have default value
UPDATE whatsapp_bot.whatsapp_campaigns 
SET sync_interval_seconds = 30 
WHERE sync_interval_seconds IS NULL;

-- Add comment
COMMENT ON COLUMN whatsapp_bot.whatsapp_campaigns.sync_interval_seconds 
IS 'Sync interval in seconds for detecting new members (5-3600 seconds)'; 