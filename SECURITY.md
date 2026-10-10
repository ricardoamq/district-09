# DISTRICT 09 — Notas de seguridad

Sitio estático (HTML/CSS/JS). No hay backend, cuentas, pagos ni almacenamiento de datos personales.
Los pedidos se arman en el navegador y el cliente los envía **él mismo** desde WhatsApp.

## Dónde se configura cada cosa
| Qué | Dónde |
|---|---|
| Número de WhatsApp (único lugar) | `WHATSAPP_NUMBER` en `script.js` |
| Productos, precios, tallas, agotados | `RAW_CATALOG` en `script.js` (se valida al cargar) |
| Límites (cantidad, líneas, búsqueda) | `LIMITS` en `script.js` |

Para añadir un producto: agrega su entrada en `RAW_CATALOG` y una tarjeta `<article class="product" data-id="...">` en `index.html` con el mismo `id`.
Las entradas inválidas se descartan y se avisa en la consola del navegador.

## Limitaciones (importante)
La validación del frontend es una capa de higiene, **no** protección absoluta: cualquier visitante puede modificar el JS en su navegador.
Si algún día hay backend o pasarela de pago:
- Precios, existencias, tallas y cantidades deben recalcularse y verificarse en el servidor.
- El total que cobra el servidor nunca debe provenir del cliente.
- Hasta entonces, la tienda confirma disponibilidad, precio y envío por WhatsApp (el mensaje ya lo pide).

## Cabeceras HTTP (deben configurarse en el hosting)
`index.html` incluye una `<meta>` con CSP como defensa adicional, pero **una meta no sustituye a las cabeceras HTTP**
(no soporta `frame-ancestors` ni `report-uri`, y las cabeceras no las puede enviar un HTML). El entorno de publicación aún no está
identificado, por lo que no se incluye un archivo de configuración específico. Cuando lo definas (Netlify, Vercel, Cloudflare Pages,
GitHub Pages, Apache, Nginx…) configura estas cabeceras:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Strict-Transport-Security: max-age=31536000; includeSubDomains   (solo con HTTPS ya funcionando)
```
Notas:
- El proyecto no usa scripts ni estilos inline ni `eval`, por lo que la CSP no necesita `unsafe-inline` ni `unsafe-eval`.
- GitHub Pages no permite cabeceras personalizadas; ahí solo aplica la `<meta>` de CSP. Para cabeceras reales conviene Cloudflare/Netlify/Vercel.
- Si cambias fuentes o añades imágenes/recursos externos, amplía la CSP (`img-src`, `font-src`, etc.) o se bloquearán.

## Recursos externos
- Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`): única dependencia externa. No admite SRI (el CSS es dinámico).
  Para eliminarla, descarga las fuentes y sírvelas localmente (después puedes quitar esos dominios de la CSP).
- WhatsApp (`https://wa.me/`): único destino externo. Las URLs se generan solo en `script.js` con dominio fijo y mensaje con `encodeURIComponent`.
