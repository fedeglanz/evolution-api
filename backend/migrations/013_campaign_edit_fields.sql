-- Migration: 013_campaign_edit_fields.sql
-- Add fields for campaign editing functionality

-- Add column for controlling if only admins can send messages
ALTER TABLE whatsapp_bot.whatsapp_campaigns 
ADD COLUMN IF NOT EXISTS only_admins_can_send BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_only_admins 
ON whatsapp_bot.whatsapp_campaigns(only_admins_can_send) 
WHERE only_admins_can_send = true;

-- Update existing campaigns to have default values
UPDATE whatsapp_bot.whatsapp_campaigns 
SET only_admins_can_send = false 
WHERE only_admins_can_send IS NULL;

-- Add comment
COMMENT ON COLUMN whatsapp_bot.whatsapp_campaigns.only_admins_can_send 
IS 'Controls if only administrators can send messages in all groups of this campaign'; 