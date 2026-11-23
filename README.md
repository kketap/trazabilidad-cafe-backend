# Trazabilidad Café - Backend

Backend del sistema de trazabilidad de café. Este servicio expone una API REST para gestionar la información del sistema, conectarse a PostgreSQL mediante Prisma y servir los datos consumidos por el frontend.

## Tecnologías utilizadas

* Node.js
* Express
* TypeScript
* Prisma ORM
* PostgreSQL
* Railway para despliegue
* CORS
* Dotenv

## Requisitos previos

Antes de iniciar el proyecto, se debe tener instalado:

* Node.js
* npm
* Git
* PostgreSQL local o acceso a una base de datos PostgreSQL remota
* Cuenta de Railway para producción

## Instalación local

Clonar el repositorio:

```bash
git clone https://github.com/kketap/trazabilidad-cafe-backend.git
cd trazabilidad-cafe-backend
```

Instalar dependencias:

```bash
npm install
```

Crear archivo `.env` en la raíz del proyecto usando como base `.env.example`.

## Variables de entorno

Ejemplo de `.env` local:

```env
NODE_ENV=development
PORT=4000

FRONTEND_LOCAL_URL=http://localhost:5173
FRONTEND_PRODUCTION_URL=https://trazabilidad-cafe.netlify.app

DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

En desarrollo local, `FRONTEND_LOCAL_URL` debe apuntar al frontend local.

En producción, `FRONTEND_PRODUCTION_URL` debe apuntar al dominio de Netlify.

## Ejecutar en desarrollo

```bash
npm run dev
```

El backend quedará disponible en:

```txt
http://localhost:4000
```

Endpoint de prueba:

```txt
http://localhost:4000/api/health
```

Respuesta esperada:

```json
{
  "ok": true,
  "service": "trazabilidad-cafe-backend",
  "message": "Backend funcionando correctamente"
}
```

## Scripts disponibles

```bash
npm run dev
```

Levanta el backend en modo desarrollo con `ts-node-dev`.

```bash
npm run build
```

Genera Prisma Client y compila TypeScript.

```bash
npm run start
```

Ejecuta el backend compilado desde `dist`.

```bash
npm run prisma:generate
```

Genera Prisma Client.

```bash
npm run prisma:studio
```

Abre Prisma Studio.

## Configuración de CORS

El backend permite conexiones desde los orígenes definidos en variables de entorno:

```env
FRONTEND_LOCAL_URL=http://localhost:5173
FRONTEND_PRODUCTION_URL=https://trazabilidad-cafe.netlify.app
```

El archivo `src/app.ts` carga estas variables y valida los orígenes permitidos.

## Deploy en Railway

El backend está desplegado en Railway.

URL de producción:

```txt
https://trazabilidad-cafe-backend-production.up.railway.app
```

Endpoint de salud:

```txt
https://trazabilidad-cafe-backend-production.up.railway.app/api/health
```

Variables necesarias en Railway:

```env
DATABASE_URL=URL_DE_POSTGRES_RAILWAY
FRONTEND_LOCAL_URL=http://localhost:5173
FRONTEND_PRODUCTION_URL=https://trazabilidad-cafe.netlify.app
NODE_ENV=production
```

No se debe configurar manualmente `PORT`, Railway lo asigna automáticamente.

## Estructura principal

```txt
src/
  app.ts
  server.ts
  lib/
    prisma.ts
  routes/
    index.ts
  modules/
    health/
      health.routes.ts
    cosechas/
    trazabilidad/
    clientes/
    reportes/
prisma/
  schema.prisma
```

## Flujo Git recomendado

Crear rama nueva desde `main`:

```bash
git checkout main
git pull origin main
git checkout -b feature/nombre-de-la-rama
```

Subir rama:

```bash
git push -u origin feature/nombre-de-la-rama
```

Ejemplo:

```bash
git checkout -b feature/schema-cosecha-trazabilidad
git push -u origin feature/schema-cosecha-trazabilidad
```

## Notas importantes

* No subir archivos `.env` al repositorio.
* Usar `.env.example` como plantilla.
* En producción, las variables se configuran desde Railway.
* Cada cambio en `main` puede activar un nuevo deploy automático en Railway.

## Migraciones y verificación de inventario

Una base PostgreSQL vacía puede inicializarse con `npm run prisma:deploy`.
La migración `202611180000_esquema_base` reproduce el esquema local anterior
al pesaje pendiente y a los nuevos campos de Trilla.

Para una base existente, comprobar primero en una copia que su estructura
coincida con esa migración. Si coincide y la base aún no tiene historial de
Prisma Migrate, registrar la base con
`npx prisma migrate resolve --applied 202611180000_esquema_base` y aplicar las
migraciones siguientes sobre la copia antes de actualizar el entorno activo.
Las órdenes históricas sin vínculo a un registro de almacén requieren
conciliación antes de usar el saldo calculado de esos registros.

Secado consume de los lotes originales. Un ingreso a Almacén Pergamino
vinculado a secados toma todo su peso seco registrado. Un envío a Trilla
puede consumir parte del saldo de un registro de almacén. El saldo se
compromete al crear la orden y es independiente del cambio manual de estado.

Ejecutar `npm test -- --runInBand` para verificar la validación de pesos y
el descuento, la edición y la devolución multilote con Prisma simulado.
