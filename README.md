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
- Panel de administración protegido por rol para crear, editar, activar/desactivar productos, ajustar stock y avanzar o cancelar pedidos.
- Carga de imágenes JPG, PNG y WebP para productos desde el panel de administración.
- Imágenes locales comprimidas para el catálogo y carrusel con controles accesibles en la página principal.
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

## Verificación y seguridad

Ejecuta las pruebas del servidor con:

```bash
npm run test --workspace @ecommerce/server
```

Las pruebas cubren el hash de contraseñas, las transiciones permitidas de pedidos, la validación del origen en operaciones que modifican datos, el límite de intentos, las cabeceras de Helmet, las cargas de imagen permitidas, los límites de las peticiones, la protección del panel y el retorno de formulario de Webpay. Configura `APP_BASE_URL` con el origen exacto desde donde abres el frontend; la API lo usa para comprobar el origen de las solicitudes. El retorno de Webpay queda exceptuado porque llega como formulario del proveedor.

Las imágenes cargadas desde administración se guardan en `server/uploads` (JPG, PNG o WebP de hasta 5 MB). Esa carpeta no se incluye en Git; para un despliegue con disco efímero habrá que configurar almacenamiento persistente u object storage.

## Estado

🚧 Proyecto en desarrollo.

Proyecto creado con fines de **práctica y portafolio profesional**.

## Configuración de autenticación

Configura en el archivo .env un SESSION_SECRET aleatorio de al menos 32 caracteres. Para crear el administrador inicial, define ADMIN_EMAIL y ADMIN_PASSWORD (12 caracteres o más) antes de ejecutar el seed. Estas credenciales son locales y no se suben a GitHub.

Webpay se mantiene limitado al ambiente `integration`. El SDK utiliza las credenciales públicas de integración de Transbank si `WEBPAY_COMMERCE_CODE` y `WEBPAY_API_KEY` se dejan vacías. Para probar los retornos desde un equipo externo, define `WEBPAY_RETURN_URL` con una URL accesible que apunte a `/api/v1/payments/webpay/return`; `APP_BASE_URL` debe apuntar a la dirección desde donde se abre el frontend.
