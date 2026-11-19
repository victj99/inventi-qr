# InvenTI QR

Sistema de inventario de activos TI con fichas QR, auditoría en piso (offline-first),
semáforo explicable, prioridad de renovación y reportes Excel/PDF.

- **Frontend:** Angular 22 (standalone + signals), PWA con service worker, CSS propio.
- **Backend:** Spring Boot 3.3, Java 17, Spring Security + JWT, JPA.
- **Base de datos:** PostgreSQL (esquema aislado `inventario_ti`).
- **QR:** se genera en el navegador con `qrcode` (sin pipeline de build).

## Inicio rápido (desarrollo)

Requisitos: Node.js 24, JDK 17 y PostgreSQL en `127.0.0.1:55432`
(contenedor Docker `282f9f9d5ff7`, base `sade_validation`, usuario `sade`).

```sh
# 1. PostgreSQL
docker start 282f9f9d5ff7

# 2. API (puerto 8090; el 8080 puede estar ocupado por otro proceso)
cd backend
export JAVA_HOME=$(/usr/libexec/java_home -v 17)   # ajusta a tu JDK 17
PORT=8090 SEED=true ./mvnw spring-boot:run   # SEED=true solo la primera vez

# 3. Interfaz (puerto 4200, proxy /api → 8090)
cd frontend
npm ci
npm start
```

Abre **http://localhost:4200**. El backend crea las tablas solo
(`ddl-auto=update`) y `SEED=true` carga 4 usuarios, 10 activos y 2 registros.

| Rol | Correo | Contraseña | Alcance |
| --- | --- | --- | --- |
| Administrador | `admin@inventi.pe` | `InvenTI2026!` | Todo |
| Técnico | `tecnico@inventi.pe` | `InvenTI2026!` | Operación y auditoría |
| Colaborador | `colaborador@inventi.pe` | `InvenTI2026!` | Consulta y reporte de fallas |
| Consulta | `consulta@inventi.pe` | `InvenTI2026!` | Solo lectura y reportes |

En la pantalla de login hay **botones de acceso demo** para entrar con un clic.

> Los usuarios y datos son ficticios. Para una instalación real, no ejecutes
> `SEED=true` en producción y retira el bloque `demo` de `login.ts` (o protege
> el acceso con cuentas propias).

## Pruebas

```sh
cd frontend
npm test          # 6 pruebas de dominio (semáforo, QR, conciliación, prioridad)
npm run e2e       # 52 verificaciones Playwright (requiere API 8090 + web 4200)
```

```sh
cd backend
./mvnw test       # 31 pruebas JUnit (permisos, prioridad, usuarios y rate limit)
```

`e2e.mjs` inicia sesión, crea un activo, importa CSV, edita, asigna, registra una
falla, audita con lectura manual, sincroniza, cierra, descarga un Excel, prueba
roles, el modo offline, la gestión de usuarios (crear, editar, desactivar,
reactivar y perfil) y genera las capturas en `../capturas/`.

## Puertos

| Servicio | Puerto | Notas |
| --- | --- | --- |
| API Spring | 8090 | `PORT`; 8080 suele estar ocupado por otro proceso |
| Angular dev | 4200 | `npm start`, proxy `/api` → 8090 |

## Estructura

```
backend/            Spring Boot (com.nexo.inventario)
  src/main/java/    dominio, seguridad, servicio, web
  target/           jar construido
frontend/           Angular (src/app/*.ts, styles.css, e2e.mjs)
capturas/           capturas del sistema real
docs/               IMPLEMENTACION.md y generador del Word APF3
Dockerfile          imagen única (SPA + API) para Railway
```

## Despliegue

`Dockerfile` (raíz) construye el SPA con Node 24, el jar con Maven/JDK 17 y sirve
ambos en un solo servicio (Spring sirve `/static`). `railway.json` define el
builder y el healthcheck. Pendiente: `railway login` y variables
`DATABASE_URL`, `DB_SCHEMA=inventario_ti`, `JWT_SECRET` y `SEED=true` la primera vez.

```sh
docker build -t inventi-qr .
docker run --rm -p 8090:8090 inventi-qr
```
