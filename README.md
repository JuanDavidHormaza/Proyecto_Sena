# Worklex

Proyecto SENA para implementar una herramienta que permita trabajar con diccionarios digitales por temáticas.

---

## 📋 Requisitos

Tener instalado:

* Docker
* Docker Compose

---

## ⚙️ Instalación paso a paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/senaworklex/worklex.git
cd worklex
```

---

### 2. Crear la red compartida

```bash
docker network create worklex_network
```

---



---

### 3. Levantar contenedor

```bash
docker compose -f docker-compose.yml -f docker-compose.db.yml -f docker-compose.px.yml  -f  docker-compose.vault.yml  -f  docker-compose.firewall.yml -f docker-compose.auth.yml -f docker-compose.media.yml up -d --build
```

---

## 🌐 Acceso a la aplicación

* Frontend: http://localhost:5173
* Backend: http://localhost:8000

---

## 🛑 Si algo falla

```bash
docker-compose down
docker system prune -f
docker-compose -p worklex_aplicacion up --build
```