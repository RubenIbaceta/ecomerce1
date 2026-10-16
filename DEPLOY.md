# Publicar el portafolio en Render + Neon

La tienda React y la API Express usan una sola dirección HTTPS. No se necesita Vercel, Docker en la nube ni comprar un dominio.

## 1. Crear una base nueva en Neon

En https://console.neon.tech crea un proyecto gratuito para ElectroStore. Elige una región cercana a la de tu servicio Render. En **Connect**, copia la cadena PostgreSQL con SSL (`sslmode=require`). Para esta demostración con una sola instancia usa la conexión directa (Connection pooling desactivado), que también sirve para las migraciones. No pegues esa dirección en GitHub ni en el chat: contiene la contraseña.

Los usuarios y pedidos de tu instalación local no se transfieren. El primer despliegue carga el catálogo de referencia en la base nueva.

## 2. Subir los cambios a GitHub

Incluye `render.yaml` y los ajustes de despliegue. `.env`, respaldos y archivos cargados están excluidos de Git. El repositorio actual es https://github.com/RubenIbaceta/ecomerce1.

## 3. Crear el servicio en Render

En https://dashboard.render.com selecciona **New → Blueprint** y conecta el repositorio. Render lee `render.yaml`, que solicita un único Web Service **Free** y genera el secreto de sesión. No crea una base de datos de Render.

Completa las variables solicitadas:

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | Cadena directa de Neon, con SSL |
| `APP_BASE_URL` | `https://NOMBRE-REAL.onrender.com` |
| `WEBPAY_RETURN_URL` | `https://NOMBRE-REAL.onrender.com/api/v1/payments/webpay/return` |
| `ADMIN_EMAIL` | Correo de tu administrador privado |
| `ADMIN_PASSWORD` | Contraseña nueva de 12 a 128 caracteres |

Si Render asigna otro nombre a la dirección, corrige las dos URLs en **Environment** y vuelve a desplegar. Deben usar HTTPS; `APP_BASE_URL` no lleva una ruta. No uses localhost.

Si utilizas **New → Web Service** en lugar de Blueprint: elige Node, rama `main`, raíz del repositorio vacía, plan Free, Build Command `npm ci --include=dev && npm run deploy:build`, Start Command `npm start` y Health Check `/api/v1/health`. Añade las variables del archivo `render.yaml`; `SESSION_SECRET` debe ser aleatorio y tener al menos 32 caracteres.

El despliegue compila ambas partes, aplica las migraciones e inicializa el catálogo y el administrador únicamente si la base está vacía. Los siguientes despliegues conservan los precios y existencias editados. No ejecutes el seed habitual sobre el catálogo editado: actualiza sus valores.

## 4. Revisar la publicación

- Abre `/api/v1/health` y comprueba que devuelve `status: ok`.
- Abre el inicio y recarga directamente `/catalogo` y una ficha de producto.
- Entra con el administrador configurado, revisa productos y cuentas.
- Prueba carrito, creación del pedido y Webpay de integración cuando las URLs estén configuradas.
- No compartas la contraseña administrativa en el portafolio.

## Correo: pendiente para registro público y recuperación

Render Free bloquea conexiones SMTP a los puertos 25, 465 y 587. Por eso Gmail SMTP no resuelve el envío en ese plan. La aplicación conserva su verificación: sin un proveedor configurado, el registro público en modo producción responde que el correo no está configurado. El administrador creado al inicializar la base sí puede ingresar.

Para habilitar registro, recuperación y contacto en este alojamiento falta integrar un proveedor de correo por HTTPS y configurar sus credenciales/remitente. No cambies `NODE_ENV` a development para evitar esa configuración: afecta las cookies seguras. Configurar solo una clave de un proveedor por API todavía no activa el correo en el código actual.

## Imágenes y límites gratuitos

Las imágenes incluidas en `client/public/images` se publican con el código. Las imágenes nuevas cargadas desde administración se pierden cuando Render reinicia, redespliega o suspende el servicio. Para conservarlas hace falta conectar almacenamiento externo; Neon guarda la base de datos, no esos archivos. Mientras tanto usa imágenes incluidas en el repositorio o URLs estables.

Render Free se suspende tras 15 minutos sin visitas y la primera apertura puede tardar alrededor de un minuto. Webpay permanece en integración y no cobra dinero real. Los planes gratuitos tienen límites de uso.

Referencias: https://render.com/docs/free · https://render.com/docs/blueprint-spec · https://neon.com/docs/get-started-with-neon/connect-neon
