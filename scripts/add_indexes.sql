-- =============================================================================
-- 📊 ÍNDICES DE RENDIMIENTO - Parque Industrial Jicamarca
-- Ejecutar sobre la base de datos en producción
-- Fecha: 2026-06-02
-- =============================================================================

-- Para subconsultas de pagos por recibo (se usa en findAll y findByIdCompleto de recibos)
CREATE INDEX IF NOT EXISTS idx_pago_recibo_deleted ON pago(recibo_id, deleted_at);

-- Para deudas por usuario (se usa en generación de recibos y lista de usuarios)
-- NOTA: idx_recibo_usuario_estado ya existe en el schema original, 
-- pero agregamos deleted_at para cubrir el filtro completo
CREATE INDEX IF NOT EXISTS idx_recibo_usuario_estado_deleted ON recibo(usuario_id, estado, deleted_at);

-- Para búsquedas de recibos por periodo
-- NOTA: idx_recibo_periodo ya existe, agregamos deleted_at
CREATE INDEX IF NOT EXISTS idx_recibo_periodo_deleted ON recibo(periodo_id, deleted_at);

-- Para lecturas por medidor y periodo (se usa en findByMedidorAndPeriodo)
CREATE INDEX IF NOT EXISTS idx_lectura_medidor_periodo_deleted ON lectura(medidor_id, periodo_id, deleted_at);

-- Para la última lectura del medidor (subconsulta correlacionada en medidorRepository)
CREATE INDEX IF NOT EXISTS idx_lectura_medidor_fecha ON lectura(medidor_id, fecha_registro DESC);

-- Para el cron job de recibos vencidos
CREATE INDEX IF NOT EXISTS idx_recibo_estado_vencimiento_deleted ON recibo(estado, fecha_vencimiento, deleted_at);

-- Para búsqueda de periodos por mes_anio
CREATE INDEX IF NOT EXISTS idx_periodo_mes_anio_deleted ON periodo_facturacion(mes_anio, deleted_at);

-- Para soft-deletes en medidor (cubrir el filtro usuario_id + deleted_at)
CREATE INDEX IF NOT EXISTS idx_medidor_usuario_deleted ON medidor(usuario_id, deleted_at);

-- Para búsqueda de usuarios por nombre/documento (search en findAll)
CREATE INDEX IF NOT EXISTS idx_usuario_nombre ON usuario(nombre_razonsocial);
CREATE INDEX IF NOT EXISTS idx_usuario_deleted_created ON usuario(deleted_at, created_at);
