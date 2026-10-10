# DISTRICT 09 — Demo de tienda streetwear

Web estática basada en HTML/CSS/JS (**sin backend**) que demuestra una tienda
independiente de streetwear con carrito y consulta por WhatsApp. Funciona como
**demo de producto**: se muestra a marcas para que vean cómo se vería su propia
tienda. La firma del autor vive en el badge DEMO y en el footer.

> **Estado:** tienda de demostración con marca ficticia. No se muestra stock ni
> estados "agotado": la disponibilidad se confirma por WhatsApp.

## Stack

- HTML semántico + CSP (meta y cabeceras).
- CSS puro (variables, `prefers-reduced-motion`, responsive, animaciones de entrada).
- JavaScript vanilla en un IIFE: catálogo validado, carrito con `localStorage`,
  búsqueda, detalle de producto y pedidos por WhatsApp. Sin dependencias.

## Estructura

```
index.html      Página principal
styles.css      Estilos
script.js       Lógica (catálogo, carrito, búsqueda, WhatsApp)
SECURITY.md     Notas y límites de seguridad
_headers        Cabeceras HTTP (Netlify / Cloudflare Pages)
vercel.json     Cabeceras HTTP (Vercel)
robots.txt      Allow + sitemap
sitemap.xml     Sitemap
404.html        Página de error
assets/
  favicon.svg              Icono de pestaña
  apple-touch-icon.png     Icono iOS
  og-image.png             Imagen para compartir (enlaces)
  hero.png                 Imagen del hero
  products/*.png           Placeholders de producto (frente y trasera)
  lookbook/look-*.png      Placeholders del lookbook
```

## Requisitos

Ninguno. Abre `index.html` en el navegador, o levanta cualquier servidor estático:

```sh
npx serve .          # o: python -m http.server
```

## Publicar (Netlify / Cloudflare Pages / Vercel)

El proyecto es 100% estático y funciona igual en cualquier hosting:

- **Netlify:** arrastra la carpeta en el panel (o `netlify deploy --prod`, publish dir = `.`).
- **Cloudflare Pages:** importa el repo y deja el build command vacío; `_headers` se aplica solo.
- **Vercel:** importa el repo; `vercel.json` ya incluye las cabeceras de seguridad.

La única integración externa es WhatsApp (`https://wa.me/`); no hay formularios,
bases de datos ni servicios que configurar.

## Dónde editar cada cosa

| Qué | Dónde |
|---|---|
| Productos, precios y tallas | `RAW_CATALOG` en `script.js` |
| Número de WhatsApp | `WHATSAPP_NUMBER` en `script.js` |
| Textos, redes y firma del autor | `index.html` (secciones, footer y badge DEMO) |
| Imágenes de producto / lookbook | `assets/products/`, `assets/lookbook/` |
| Dominio (canonical, `og:url`, sitemap) | `index.html`, `sitemap.xml`, `robots.txt` |

## Personalizar para un cliente

- **Fotos**: reemplaza `assets/hero.png`, `assets/products/*.png`
      (frente `nombre.png` y trasera `nombre-back.png`, 800×1000) y
      `assets/lookbook/look-*.png` (900×1200). Mantén los nombres para no tocar el HTML.
- **Autor**: `index.html` (badge DEMO y footer) — configurado con Instagram
      `ricardoam_q` y correo `ramunoz.quimi@gmail.com`.
- **Dominio**: `https://district-09.netlify.app/` en `canonical`, `og:url`,
      JSON-LD, `robots.txt` y `sitemap.xml` (cámbialo si registras un dominio propio).
- **OG image**: regenera `assets/og-image.png` si cambias de dominio o marca.

## Disponibilidad

La demo no muestra stock ni estados "agotado". La interfaz siempre invita a
*consultar disponibilidad* por WhatsApp, y el mensaje del carrito es una consulta
con subtotal estimado que no reserva stock. Para publicar un cambio, edita y haz
`git push`: Netlify despliega solo en segundos.

## Seguridad

El frontend valida precios, tallas y cantidades, pero eso **no** sustituye a un
backend. Los pedidos se confirman por WhatsApp. Más detalles en `SECURITY.md`.
