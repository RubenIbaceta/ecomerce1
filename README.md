# ElectroStore

E-commerce de práctica para una tienda de **hardware y tecnología para PC**, desarrollado como proyecto Full Stack y portafolio.

## Tecnologías

- React + TypeScript + Vite y Tailwind CSS
- Node.js + Express
- PostgreSQL + Prisma
- Docker Compose para PostgreSQL

## Funcionalidades

- Registro, acceso, verificación de correo, recuperación/cambio de contraseña y perfil.
- Sesiones persistidas en PostgreSQL; contraseñas protegidas con scrypt.
- Catálogo con categorías, búsqueda, filtros, ordenamiento, paginación y fichas completas de producto.
- Carrito persistente y checkout con dirección, cotización local de despacho y Webpay.
- Reserva transaccional de stock; vencimientos, cancelaciones y pagos rechazados liberan unidades.
- Webpay Plus en ambiente de integración; el backend verifica el resultado antes de confirmar el pedido.
- Seguimiento interno por estado de pedido, administrado manualmente.
- Solicitudes de devolución dentro de 30 días desde el pago y gestión de reembolsos desde administración.
- Administración de productos, imágenes, cuentas, pedidos, ventas confirmadas, stock bajo y devoluciones.
- Formulario de contacto por correo y páginas Sobre nosotros, Despachos, Devoluciones, Privacidad y Términos.
- No se guardan números de tarjeta ni CVV.

## Instalación

```bash
npm install
```

Crea `.env` a partir de `.env.example`, configura `SESSION_SECRET` (al menos 32 caracteres) y `DATABASE_URL`, e inicia PostgreSQL:

```bash
docker compose up -d
```

Aplica las migraciones y carga el catálogo de referencia:

```bash
npm run db:deploy --workspace @ecommerce/server
npm run db:seed --workspace @ecommerce/server
```

Para el desarrollo normal, `db:deploy` aplica las migraciones pendientes sin solicitar un restablecimiento de datos. `db:migrate` se reserva para crear migraciones de desarrollo.

Para crear el administrador inicial, define `ADMIN_EMAIL` y `ADMIN_PASSWORD` (12 caracteres o más) antes de ejecutar el seed. Las credenciales locales no se suben a GitHub.

Inicia la aplicación:

```bash
npm run dev
```

Frontend: `http://localhost:5173` · API: `http://localhost:3001/api/v1/health`

## Correo

Verificación, recuperación de contraseña y formulario de contacto requieren SMTP. Configura `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` y `SUPPORT_EMAIL` en el `.env` de la raíz. Para desarrollo puedes usar Gmail con una contraseña de aplicación (no la contraseña normal).

En desarrollo sin SMTP, el registro local marca la cuenta verificada para no bloquear las pruebas; los enlaces de verificación/recuperación y el formulario de contacto requieren SMTP. En producción el registro exige SMTP. Los enlaces de verificación duran 24 horas y los de recuperación 30 minutos.

`APP_BASE_URL` debe coincidir con el origen desde donde se abre Vite, por ejemplo `http://localhost:5173` o `http://localhost:5174`.

## Despacho simulado

No requiere contratar una empresa de transporte. La tienda calcula tarifas de referencia: Metropolitana estándar $2.990 (2–3 días hábiles) o prioritario $4.990 (1–2 días); Valparaíso, O’Higgins y Maule estándar $4.990 (3–5 días); otras regiones estándar $6.990 (5–8 días). La fecha se guarda en el pedido y el cliente consulta cambios de estado desde su cuenta. La administración marca manualmente preparación, envío y entrega.

Estas tarifas y plazos se pueden ajustar en `server/src/modules/orders/shipping.ts`. Son estimaciones del proyecto, sin transportista ni seguimiento externo.

## Devoluciones y pagos

El cliente puede solicitar una devolución hasta 30 días después de un pago confirmado. La administración revisa el producto recibido antes de procesar el reembolso. Un resultado Webpay ambiguo queda en revisión manual para evitar duplicar el reembolso. No se repone stock automáticamente: se debe inspeccionar el producto primero.

Los pagos simulados no cobran dinero. Webpay está limitado al ambiente `integration`; no se realizan cobros comerciales. Las páginas de privacidad y términos describen el estado actual del proyecto y deben revisarse antes de cualquier uso comercial.

## Imágenes y respaldos

Las imágenes cargadas se guardan localmente en `server/uploads` (JPG, PNG o WebP de hasta 5 MB). `UPLOADS_DIR` permite elegir un directorio persistente; si se configura una ruta relativa, se resuelve desde el directorio de trabajo del servidor. La carpeta no se incluye en Git.

Con Docker Compose y la base de datos iniciada, crea un respaldo comprimido:

```bash
npm run db:backup --workspace @ecommerce/server
```

Los archivos quedan en `backups/`, ignorado por Git. Para restaurar de forma explícita:

```bash
npm run db:restore --workspace @ecommerce/server -- backups/archivo.dump --confirm-restore
```

La restauración reemplaza objetos existentes en la base configurada. Conserva respaldos fuera del equipo y añade `server/uploads` a la estrategia para proteger las imágenes.

## Pruebas y seguridad

```bash
npm run typecheck
npm run test --workspace @ecommerce/server
```

Las pruebas cubren contraseñas, transiciones de pedidos, cotizaciones/fechas hábiles de despacho, origen de solicitudes, límites, imágenes, protección de rutas y retorno Webpay. La aplicación valida el origen exacto configurado en `APP_BASE_URL`; el retorno de Webpay se exceptúa porque llega como formulario del proveedor.

## Estado

Proyecto de práctica y portafolio en desarrollo. El catálogo contiene datos de referencia, Webpay está en integración y el despacho es una simulación local.
