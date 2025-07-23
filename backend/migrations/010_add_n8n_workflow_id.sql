-- Migración 010: Agregar campo n8n_workflow_id para automatización
-- Fecha: 2025-01-21
-- Descripción: Agregar campo para almacenar ID del workflow N8N automático por instancia

-- Agregar campo n8n_workflow_id a whatsapp_instances si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'whatsapp_bot' 
    AND table_name = 'whatsapp_instances' 
    AND column_name = 'n8n_workflow_id'
  ) THEN
    ALTER TABLE whatsapp_bot.whatsapp_instances 
    ADD COLUMN n8n_workflow_id VARCHAR(100);
    
    COMMENT ON COLUMN whatsapp_bot.whatsapp_instances.n8n_workflow_id 
    IS 'ID del workflow N8N creado automáticamente para esta instancia';
    
    -- Crear índice para búsquedas rápidas
    CREATE INDEX idx_instances_n8n_workflow_id 
    ON whatsapp_bot.whatsapp_instances(n8n_workflow_id);
    
    RAISE NOTICE 'Campo n8n_workflow_id agregado exitosamente';
  ELSE
    RAISE NOTICE 'Campo n8n_workflow_id ya existe, saltando migración';
  END IF;
END $$; 