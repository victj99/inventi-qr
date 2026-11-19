# InvenTI QR

Inventario de activos TI con códigos QR, con auditorías offline y reportes — **PWA Angular 22 + API Spring Boot 3**. Proyecto universitario (sin datos reales).

**Monorepo**: `frontend/` (Angular 22, PWA instalable con modo offline) y `backend/` (Spring Boot 3 + Maven, API REST en `/api`). El despliegue es un único servicio: el backend sirve el SPA compilado (mismo origen, sin CORS) — ver `Dockerfile` (multi-stage) y `railway.json`.

## Usuarios de prueba

> ⚠️ Credenciales públicas **por diseño**: es una demo con datos ficticios sembrados por `SEED=true` en el primer arranque.
| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@inventi.pe` | `InvenTI2026!` |
| Técnico | `tecnico@inventi.pe` | `InvenTI2026!` |
| Colaborador | `colaborador@inventi.pe` | `InvenTI2026!` |
| Consulta | `consulta@inventi.pe` | `InvenTI2026!` |

## Levantar en local

Requisitos: JDK 17, Maven (o `./mvnw`), Node 22+, Docker con Postgres 15.

```sh
# 1) Base de datos (cualquier Postgres 15; el esquema se crea solo al arrancar)
docker run -d --name inventi-db -e POSTGRES_USER=sade -e POSTGRES_PASSWORD=sade_local_validation -e POSTGRES_DB=sade_validation -p 55432:5432 postgres:15-alpine

# 2) API en :8090  (SEED=true SOLO el primer arranque: crea usuarios/activos de demo)
cd backend
JWT_SECRET=$(openssl rand -hex 32) SEED=true ./mvnw spring-boot:run

# 3) Frontend en :4200 (proxy /api → 8090)
cd ../frontend
npm ci
npm start
```

Abrir http://localhost:4200. La API queda en http://localhost:8090/api.

## Variables de entorno (backend)

| Variable | Obligatoria | Default | Uso |
|---|---|---|---|
| `JWT_SECRET` | **Sí** (el arranque falla sin ella) | — | Firma de tokens; mínimo 32 bytes |
| `PORT` | No | `8090` | Puerto HTTP (Railway la inyecta) |
| `SPRING_DATASOURCE_URL` | No* | `jdbc:postgresql://localhost:55432/sade_validation?currentSchema=inventario_ti` | Postgres; en Railway se deriva de `DATABASE_URL` |
| `SPRING_DATASOURCE_USERNAME` / `PASSWORD` | No* | `sade` / `sade_local_validation` | *Solo útiles para el Postgres local de demo |
| `DB_SCHEMA` | No | `inventario_ti` | Esquema (se crea si no existe) |
| `SEED` | No | `false` | `true` solo el primer arranque: siembra datos demo |
| `STATIC_LOCATIONS` | No | `classpath:/static/` | En Docker sirve el SPA compilado |

## Despliegue (Railway)

1. Proyecto con **Postgres** (variable `DATABASE_URL`).
2. Variables del servicio: `JWT_SECRET` (nuevo y aleatorio), `SEED=true` **solo el primer despliegue** (luego `false`), `DB_SCHEMA=inventario_ti`.
3. Deploy desde el repo: el `Dockerfile` multi-stage compila Angular y Spring y expone un solo contenedor. Healthcheck en `/`.

## Pruebas

| Suite | Comando | Cobertura |
|---|---|---|
| Dominio (Node) | `cd frontend && npm test` | 6 checks |
| Backend (JUnit) | `cd backend && ./mvnw test` | 31 tests |
| E2E (Playwright) | stack local arriba + `cd frontend && npm run e2e` | 52 checks (desktop + móvil + offline) |

## Deuda técnica documentada

- Sin paginación en los listados (volúmenes de demo); `ddl-auto: update` en producción y `backend/sql/` como referencia del esquema (sin Flyway).
- Tokens JWT de 8 h fijos, sin refresh; la revocación es por `token_version` por usuario.
- El paquete Java `com.nexo.inventario` y el proyecto Angular `inventario-ti-pwa` son identificadores internos históricos (la marca visible es InvenTI QR).
- Rate limit de login en memoria (se reinicia al reiniciar el servicio).
