# AGENTS.md

Guía para agentes de IA que trabajen en **DISTRICT 09**. Léela antes de editar.

## Qué es este proyecto
Sitio estático de una tienda de ropa (demo de portafolio + comercio real). Sin
framework, sin bundler, sin build step: HTML, CSS y JavaScript vanilla servidos
como archivos planos. Se despliega en Netlify (y opcionalmente Vercel/Cloudflare
Pages). No hay backend; la única integración es un enlace a WhatsApp.

## Estructura
- `index.html` — único documento. Contiene metas, CSP, JSON-LD, todas las secciones
  y el modal de producto.
- `styles.css` — todos los estilos. Variables en `:root`.
- `script.js` — toda la lógica. Se ejecuta con `defer`.
- `assets/` — imágenes locales (`hero`, `products/`, `lookbook/`, `og-image.png`).
- `_headers` — cabeceras y CSP para Netlify/Cloudflare. **Mantener sincronizada con
  `vercel.json` y con el `<meta http-equiv="Content-Security-Policy">` de `index.html`.**
- `vercel.json` — config de Vercel.
- `netlify.toml` — config de Netlify (`build.command = ""`, `publish = "."`). No
  reintroducir un build command: este sitio no compila nada.
- `README.md`, `SECURITY.md` — documentación de usuario y notas de seguridad.

No hay `package.json`, ni dependencias, ni tests automatizados. No añadas un
`package.json` sin pedir permiso: todo debe seguir funcionando abriendo `index.html`.

## Cómo verificar tus cambios
1. Sintaxis JS: `node --check script.js`.
2. Llaves CSS balanceadas (conteo de `{` y `}` igual).
3. Que cada `src`/`href` local referenciado en `index.html`, `script.js` y `styles.css`
   exista en disco.
4. Render sin errores. Navegador headless disponible:
   `& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless --disable-gpu --no-sandbox --dump-dom file:///<ruta>/index.html`.
   La CSP real bloquea scripts inline y conexiones externas; para probar la
   interacción hay un helper en `%TEMP%\opencode\build-selftest.ps1` que genera
   `_selftest.html` (sin CSP) con un `_test.js` que ejercita carrito, buscador y
   modal. Borra esos temporales al terminar y nunca los commitees.
5. Revisa `git status`/`git diff` antes de commitear. No commitees archivos `_*.html`
   ni `_*.js` de prueba.

## Reglas de seguridad (NO romper)
- Carrito solo en `localStorage`, clave `district09.cart.v1`, y solo guarda
  `{ id, size, qty }`. Cantidades y totales se recalculan desde el catálogo.
- Precios son **siempre** `precio * 100` (enteros en centavos) desde `RAW_CATALOG`.
  Nunca confíes en precios del DOM o de `localStorage`.
- `RAW_CATALOG` en `script.js` es la única fuente de verdad de productos.
- Sin `innerHTML` para datos dinámicos: usar `textContent`/`createElement`/el helper `h()`.
- La única URL externa permitida de destino es WhatsApp
  (`https://wa.me/<número>`), validada por `buildWhatsAppUrl`. Los formularios están
  prohibidos (`form-action 'none'`).
- No cargar imágenes por hotlinking desde dominios externos: descárgalas al repo
  (la CSP tiene `img-src 'self' data:`).
- Nunca commitear secretos. No hay claves en este proyecto y no deben introducirse.

## Convenciones de código
- JavaScript vanilla, sin comentarios salvo cuando aclaran una decisión no obvia.
- Español neutro/ecuatoriano para el texto de la interfaz ("tú", no "vos"/"vosotros").
- Nombres de clases CSS en kebab-case; funciones JS en `camelCase`; IDs de producto
  en minúsculas (`essential`, `concrete`, `hoodie`, `cargo`).
- Reutiliza los patrones existentes: paneles con `openPanel`/`closeAll`, toasts con
  `showToast`, render de badges solo desde el catálogo (`syncBadge`).

## Reglas de negocio importantes
- **No mostrar estados de stock estáticos.** No usar "Agotado", `soldOut`, ni
  cantidades disponibles hardcodeadas. La disponibilidad real se confirma por
  WhatsApp; la UI habla de "consultar disponibilidad".
- La **talla es obligatoria**: el selector incluye un placeholder "Elegir talla"
  (value `""`) y nunca se preselecciona una talla.
- El mensaje de WhatsApp es una **consulta**, no un pedido confirmado. Usa
  "SUBTOTAL ESTIMADO", aclara que no incluye envío y que no reserva stock.
- No afirmar envío gratis, disponibilidad ni plazos que no se puedan cumplir. Los
  claims de envío deben ser coherentes entre marquee, features y FAQ.
- El número de WhatsApp vive en `WHATSAPP_NUMBER` (`script.js`).

## Idioma y tono
- Español (Ecuador). Tuteo ("tienes", no "tenés"). Evitar "usted" y regionalismos
  de otros países.
- Textos en MAYÚSCULAS para CTAs, pero sin signos de exclamación excesivos.

## Antes de terminar
- Ejecuta la verificación de la sección "Cómo verificar tus cambios".
- Si cambias cabeceras/CSP, sincroniza `_headers`, `vercel.json` e `index.html`.
- No hagas `git commit`/`push` salvo que el usuario lo pida explícitamente.
