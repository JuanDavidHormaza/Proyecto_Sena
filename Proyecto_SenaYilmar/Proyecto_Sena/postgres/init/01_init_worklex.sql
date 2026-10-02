-- postgres/init/01_init_worklex.sql

-- Crear el esquema worklex si no existe
CREATE SCHEMA IF NOT EXISTS worklex;

-- Dar permisos al usuario admin
GRANT ALL PRIVILEGES ON SCHEMA worklex TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA worklex TO admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA worklex GRANT ALL ON TABLES TO admin;