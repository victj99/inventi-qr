-- Migración de la gestión de usuarios (2026-11-18).
-- Aplicar ANTES de desplegar el backend sobre una base ya poblada.
-- Idempotente: se puede ejecutar más de una vez.
-- NO toca los esquemas sade/drizzle; solo inventario_ti.

ALTER TABLE inventario_ti.usuarios
    ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true NOT NULL,
    ADD COLUMN IF NOT EXISTS creado_en timestamp(6) with time zone,
    ADD COLUMN IF NOT EXISTS ultimo_acceso timestamp(6) with time zone,
    ADD COLUMN IF NOT EXISTS password_actualizado_en timestamp(6) with time zone,
    ADD COLUMN IF NOT EXISTS token_version integer DEFAULT 0 NOT NULL;

-- Las cuentas existentes quedan activas y con versión 0.
UPDATE inventario_ti.usuarios
SET activo = true
WHERE activo IS NULL;

UPDATE inventario_ti.usuarios
SET token_version = 0
WHERE token_version IS NULL;
