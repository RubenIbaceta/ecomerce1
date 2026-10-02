# Electronics Store Demo

E-commerce de práctica de una tienda de **hardware y tecnología para PC**, desarrollado como proyecto Full Stack.

## Tecnologías

- React + TypeScript + Vite
- Tailwind CSS
- Node.js + Express
- PostgreSQL
- Docker

## Funcionalidades

- Registro e inicio/cierre de sesión.
- Perfil de cliente.
- Sesiones persistidas en PostgreSQL.
- Área de administración protegida por rol.
- Contraseñas almacenadas con hash scrypt; nunca en texto plano.
- Carrito persistente por cuenta, con cantidades y subtotal calculado por la API.
- Checkout con datos de entrega e historial de pedidos.
- Reserva transaccional de stock, vencimiento/liberación de reservas y pago simulado sin cobros reales.
- Webpay Plus en ambiente de integración: redirección al formulario alojado por Transbank y confirmación de pago en el backend.
- Los pedidos guardan copias históricas de SKU, nombre y precio de cada producto.
- Catálogo de productos
- Categorías
- Búsqueda y filtros
- Ordenamiento
- Paginación
- Detalle de productos
- API REST
- Base de datos PostgreSQL

## Instalación

```bash
npm install
```

Crear `.env` a partir de `.env.example` y configurar las variables necesarias.

Iniciar PostgreSQL:

```bash
docker compose up -d
```

Ejecutar migraciones y datos de prueba:

```bash
npm run db:migrate --workspace @ecommerce/server
npm run db:seed --workspace @ecommerce/server
```

Iniciar el proyecto:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

API: `http://localhost:3001/api/v1/health`

## Estado

🚧 Proyecto en desarrollo.

Proyecto creado con fines de **práctica y portafolio profesional**.

## Configuración de autenticación

Configura en el archivo .env un SESSION_SECRET aleatorio de al menos 32 caracteres. Para crear el administrador inicial, define ADMIN_EMAIL y ADMIN_PASSWORD (12 caracteres o más) antes de ejecutar el seed. Estas credenciales son locales y no se suben a GitHub.

Webpay se mantiene limitado al ambiente `integration`. El SDK utiliza las credenciales públicas de integración de Transbank si `WEBPAY_COMMERCE_CODE` y `WEBPAY_API_KEY` se dejan vacías. Para probar los retornos desde un equipo externo, define `WEBPAY_RETURN_URL` con una URL accesible que apunte a `/api/v1/payments/webpay/return`; `APP_BASE_URL` debe apuntar a la dirección desde donde se abre el frontend.
