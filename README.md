# DISTRICT 09 — Demo de tienda streetwear

Web estática basada en HTML/CSS/JS (**sin backend**) que demuestra una tienda
independiente de streetwear con carrito y pedido por WhatsApp. Se usa como
**pieza de portafolio** para dar a conocer el trabajo de diseño web a marcas.

> **Estado:** proyecto de demostración. Algunos contenidos usan placeholders
> que deben sustituirse antes de publicar (ver [Placeholders por sustituir](#placeholders-por-sustituir)).

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
| Productos, precios, tallas, agotados | `RAW_CATALOG` en `script.js` |
| Número de WhatsApp | `WHATSAPP_NUMBER` en `script.js` |
| Textos, redes y nombre del autor | `index.html` (secciones `#nosotros`, `#proyecto`, `#contacto`, `footer`) |
| Imágenes de producto / lookbook | `assets/products/`, `assets/lookbook/` |
| Dominio (canonical, `og:url`, sitemap) | `index.html`, `sitemap.xml`, `robots.txt` |

## Placeholders por sustituir

- [ ] **Fotos reales**: reemplaza `assets/hero.png`, `assets/products/*.png`
      (frente `nombre.png` y trasera `nombre-back.png`, 800×1000) y
      `assets/lookbook/look-*.png` (900×1200). Mantén los nombres para no tocar el HTML.
- [ ] **Datos del autor**: `[TU NOMBRE]` (badge DEMO, `#proyecto`, footer) y las
      redes (`tu_usuario`) en el footer.
- [ ] **Dominio**: `district-09.example.com` en `canonical`, `og:url`, JSON-LD,
      `robots.txt` y `sitemap.xml`.
- [ ] **OG image**: regenera `assets/og-image.png` con el dominio real.

## Stock agotado (dinamismo)

La web es estática: el estado "Agotado" sale de `RAW_CATALOG` en `script.js`.
Para marcar una prenda como agotada, cambia `soldOut: false` por `true` y publica
(Git push si el hosting está conectado al repo; se actualiza en segundos).

Si algún día quieres que se actualice sola sin tocar código, hay dos caminos sin
backend propio: leer el stock de una **hoja externa** (Google Sheets/Airtable) al
cargar, o usar **Supabase/Firebase** para tiempo real. Ambos requieren abrir
`connect-src` en la CSP.

## Seguridad

El frontend valida precios, tallas y cantidades, pero eso **no** sustituye a un
backend. Los pedidos se confirman por WhatsApp. Más detalles en `SECURITY.md`.
