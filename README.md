# Worklex - Plataforma de Diccionarios Digitales y Evaluación Adaptativa (SENA)

Herramienta institucional desarrollada para el SENA para el aprendizaje de inglés técnico en **Análisis y Desarrollo de Software (ADSO)** mediante diccionarios digitales temáticos, evaluación continua CEFR y almacenamiento multimedia interno en la nube privada.

---

## 📋 Requisitos Previos

* **Docker Desktop** (con motor Linux en ejecución)
* **Docker Compose v2**

---

## 🚀 Despliegue en 1 Solo Clic (Recomendado)

En la raíz del proyecto, ejecuta:

### En Windows (Doble clic o desde CMD / Terminal):
```cmd
start-dev.bat
```

### O desde PowerShell:
```powershell
.\start-dev.ps1
```

El script se encarga automáticamente de:
1. Verificar que el daemon de Docker esté activo.
2. Crear la red común externa `worklex_network` si no existe.
3. Levantar todos los servicios orquestados a través de la variable `COMPOSE_FILE` definida en `.env`.
4. Ejecutar el aprovisionador automático de MinIO (`worklex_minio_provision`) para crear los buckets (`dictionary-audios`, `dictionary-images`, `dictionary-videos`, etc.), aplicar políticas públicas de descarga y sincronizar los archivos multimedia.
5. Inicializar PostgreSQL (`worklex_persistencia`), ejecutar migraciones de Django y poblar inmediatamente el catálogo completo del Vocabulario Técnico ADSO con sus términos, niveles (A1-B2) y competencias.
6. Validar que todos los servicios web y APIs respondan con código HTTP 200 OK.

---

## 🛠️ Despliegue Estándar con Docker Compose

```bash
# 1. Acceder al directorio del proyecto
cd Proyecto_SenaYilmar\Proyecto_Sena

# 2. Crear la red compartida (si aún no existe)
docker network create worklex_network

# 3. Levantar toda la infraestructura unificada
docker compose up -d --build
```

---

## 🌐 Servicios y Puntos de Acceso

| Servicio | URL / Host | Descripción | Credenciales por Defecto |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | [http://localhost:5173](http://localhost:5173) | Interfaz de Usuario SPA (Vite / React) | - |
| **Nginx Proxy / WAF** | [http://localhost](http://localhost) / [https://localhost](https://localhost) | Proxy Inverso con ModSecurity CRS | - |
| **Backend API** | [http://localhost:8000/api/](http://localhost:8000/api/) | Django REST Framework & Streaming Media | - |
| **Django Admin** | [http://localhost:8000/admin/](http://localhost:8000/admin/) | Panel de Administración Django | `superadmin@worklex.com` / `SuperAdmin123*` |
| **MinIO Consola Web** | [http://localhost:9001](http://localhost:9001) | Gestión visual de Buckets S3 | `admin` / `Admin123*` |
| **MinIO S3 API** | [http://localhost:9000](http://localhost:9000) | Endpoint S3 compatible | `admin` / `Admin123*` |
| **Keycloak Auth** | [http://localhost:8080](http://localhost:8080) | Gestión de Identidad y Acceso | `admin` / `Admin123*` |
| **HashiCorp Vault** | [http://localhost:8200](http://localhost:8200) | Almacenamiento Seguro de Secretos | - |
| **PostgreSQL** | `localhost:5432` | Base de datos persistente (BD: `SENA`) | `admin` / `Admin123*` |
