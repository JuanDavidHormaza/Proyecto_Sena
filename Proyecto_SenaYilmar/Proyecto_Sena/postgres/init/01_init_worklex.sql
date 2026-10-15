-- postgres/init/01_init_worklex.sql

-- Crear el esquema worklex si no existe
CREATE SCHEMA IF NOT EXISTS worklex;

-- Asignar propietario y permisos exclusivos al usuario postgres
ALTER SCHEMA worklex OWNER TO postgres;
GRANT ALL ON SCHEMA worklex TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA worklex TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA worklex GRANT ALL ON TABLES TO postgres;