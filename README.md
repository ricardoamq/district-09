# DISTRICT 09 — Demo de tienda streetwear

Web estática basada en HTML/CSS/JS (**sin backend**) que demuestra una tienda
independiente de streetwear con carrito y pedido por WhatsApp. Se usa como
**pieza de portafolio** para dar a conocer el trabajo de diseño web a marcas.

> **Estado:** proyecto de demostración. Algunos contenidos usan placeholders
> que deben sustituirse antes de publicar (ver [Placeholders por sustituir](#placeholders-por-sustituir)).

## Stack

- HTML semántico + CSP (meta y cabeceras).
- CSS puro (variables, `prefers-reduced-motion`, responsive).
- JavaScript vanilla en un IIFE: catálogo validado, carrito con `localStorage`,
  búsqueda y pedidos por WhatsApp. Sin dependencias.

## Estructura

```
index.html      Página principal
styles.css      Estilos
script.js       Lógica (catálogo, carrito, búsqueda, WhatsApp)
SECURITY.md     Notas y límites de seguridad
_headers        Cabeceras HTTP (Netlify / Cloudflare Pages)
robots.txt      Allow + sitemap
sitemap.xml     Sitemap
404.html        Página de error
assets/
  favicon.svg           Icono de pestaña
  apple-touch-icon.png  Icono iOS
  og-image.png          Imagen para compartir (enlaces)
  products/*.svg        Placeholders de producto (sustituir por fotos)
```

## Requisitos

Ninguno. Abre `index.html` en el navegador, o levanta cualquier servidor estático:

```sh
npx serve .          # o: python -m http.server
```

## Publicar (Netlify / Cloudflare Pages / Vercel)

El proyecto es 100% estático:

- **Netlify:** `netlify deploy --prod` con `publish directory = .`
  (o arrastra la carpeta en el panel). Los formularios se activan por Netlify Forms.
- **Cloudflare Pages:** importa el repo y deja build command vacío; `_headers` se aplica solo.
- **Vercel:** importa el repo; añade `vercel.json` con las cabeceras de `_headers` si quieres CSP real.

## Dónde editar cada cosa

| Qué | Dónde |
|---|---|
| Productos, precios, tallas, agotados | `RAW_CATALOG` en `script.js` |
| Número de WhatsApp | `WHATSAPP_NUMBER` en `script.js` |
| Email / redes / nombre del autor | Secciones `about`, `contact` y `footer` en `index.html` |
| Placeholder del dominio (canonical, sitemap) | `index.html`, `sitemap.xml`, `robots.txt` |
| Placeholder de contacto (formulario) | Formulario `name="contacto"` en `index.html` |

## Placeholders por sustituir

- [ ] **Fotos de producto**: reemplazar `assets/products/*.svg` por fotos reales
      (800×1000 recomendado) y actualizar `alt`, `srcset` y el `img-src` de la CSP si se sirven de otro dominio.
- [ ] **Dominio**: `district-09.example.com` en `canonical`, `og:url`, `robots.txt`, `sitemap.xml`.
- [ ] **Datos del autor**: nombre/alias, email, Instagram, TikTok, GitHub (secciones `about` y `contact`).
- [ ] **Formulario**: `Netlify Forms` deja de funcionar si no se despliega en Netlify
      (sustituir por Formspree/endpoint propio y abrir `form-action` en la CSP).
- [ ] **Imágenes OG**: regenerar `assets/og-image.png` con el dominio real.

## Seguridad

El frontend valida precios, tallas y cantidades, pero eso **no** sustituye a un
backend. Los pedidos se confirman por WhatsApp. Más detalles en `SECURITY.md`.