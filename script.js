/*
 * DISTRICT 09 — interacciones de tienda
 *
 * Reglas de seguridad de este archivo:
 *  - El catálogo (precios, tallas, existencias) vive AQUÍ, no en el HTML.
 *    Los atributos data-* del HTML solo identifican la tarjeta (data-id) y se
 *    comprueban contra este catálogo; nunca se usan para calcular importes.
 *  - Todo texto dinámico se inserta con textContent / createElement (sin innerHTML).
 *  - Los importes se calculan en céntimos (enteros) y siempre desde el catálogo.
 *  - NOTA: esto es una defensa de frontend. Si algún día hay backend, precios,
 *    existencias y cantidades deben volver a verificarse en el servidor.
 */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Configuración                                                      */
  /* ------------------------------------------------------------------ */

  // Número comercial: código de país + número, sin +, espacios ni guiones.
  const WHATSAPP_NUMBER = '593980927148';
  // Único dominio de destino permitido para los enlaces de pedido.
  const WHATSAPP_ORIGIN = 'https://wa.me';

  const LIMITS = Object.freeze({
    maxQtyPerLine: 10,   // unidades por prenda + talla
    maxLines: 20,        // líneas distintas en el carrito
    maxSearchLength: 40, // caracteres de búsqueda
    maxSearchResults: 8,
    toastMs: 2200,
  });

  const SIZE_OPTIONS = Object.freeze(['XS', 'S', 'M', 'L', 'XL', 'XXL']);

  // Clave para persistir el carrito entre visitas (solo id, talla y cantidad).
  const STORAGE_KEY = 'district09.cart.v1';

  // Fuente única de verdad de productos. Precios en dólares (máx. 2 decimales).
  const RAW_CATALOG = [
    { id: 'essential', name: 'Oversized Essential', description: 'Camiseta negra · Algodón', price: 22, comparePrice: 28, sizes: SIZE_OPTIONS, soldOut: false },
    { id: 'concrete',  name: 'Concrete Tee',        description: 'Camiseta gráfica · Gris',  price: 25,                    sizes: SIZE_OPTIONS, soldOut: false },
    { id: 'hoodie',    name: 'Urban Hoodie',        description: 'Sudadera · Negro lavado',  price: 38, comparePrice: 45, sizes: SIZE_OPTIONS, soldOut: false },
    { id: 'cargo',     name: 'Night Cargo',         description: 'Pantalón cargo · Negro',   price: 42,                    sizes: SIZE_OPTIONS, soldOut: true },
  ];

  /* ------------------------------------------------------------------ */
  /* Utilidades puras (validación y formato)                            */
  /* ------------------------------------------------------------------ */

  const ID_PATTERN = /^[a-z0-9-]{1,32}$/;
  const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
  const MAX_PRICE_CENTS = 10000000; // $100,000.00

  function toCents(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
    const cents = Math.round(value * 100);
    if (Math.abs(value * 100 - cents) > 1e-6 || cents > MAX_PRICE_CENTS) return null;
    return cents;
  }

  function isCleanText(value, max) {
    return typeof value === 'string' && value.trim().length > 0 &&
      value.length <= max && !CONTROL_CHARS.test(value);
  }

  function isValidQty(value) {
    return typeof value === 'number' && Number.isInteger(value) &&
      value >= 1 && value <= LIMITS.maxQtyPerLine;
  }

  function money(cents) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function isValidWhatsAppNumber(value) {
    // E.164 sin "+": 8 a 15 dígitos, sin cero inicial.
    return typeof value === 'string' && /^[1-9]\d{7,14}$/.test(value);
  }

  function normalizeText(value) {
    return String(value ?? '')
      .slice(0, LIMITS.maxSearchLength)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLocaleLowerCase('es')
      .trim();
  }

  // Devuelve un producto validado e inmutable, o null si los datos no son fiables.
  function validateProduct(raw, seenIds) {
    if (!raw || typeof raw !== 'object') return null;
    const { id, name, description, price, comparePrice, sizes, soldOut } = raw;
    if (typeof id !== 'string' || !ID_PATTERN.test(id) || seenIds.has(id)) return null;
    if (!isCleanText(name, 80) || !isCleanText(description, 120)) return null;
    const priceCents = toCents(price);
    if (priceCents === null) return null;
    let compareCents = null;
    if (comparePrice !== undefined) {
      compareCents = toCents(comparePrice);
      if (compareCents === null || compareCents <= priceCents) return null;
    }
    if (!Array.isArray(sizes) || sizes.length === 0 ||
        new Set(sizes).size !== sizes.length ||
        !sizes.every((size) => SIZE_OPTIONS.includes(size))) return null;
    if (typeof soldOut !== 'boolean') return null;
    seenIds.add(id);
    return Object.freeze({
      id, name, description, priceCents, compareCents,
      sizes: Object.freeze([...sizes]), soldOut,
      searchText: normalizeText(`${name} ${description}`),
    });
  }

  function buildCatalog(rawList) {
    const catalog = new Map();
    const seen = new Set();
    rawList.forEach((raw, index) => {
      const product = validateProduct(raw, seen);
      if (product) catalog.set(product.id, product);
      else console.warn(`[DISTRICT 09] Producto #${index} descartado: datos inválidos o duplicados.`);
    });
    return catalog;
  }

  /* ------------------------------------------------------------------ */
  /* Referencias al DOM                                                 */
  /* ------------------------------------------------------------------ */

  const $ = (selector) => document.querySelector(selector);
  const dom = {
    overlay: $('.overlay'),
    searchPanel: $('#search-panel'),
    cartDrawer: $('#cart-drawer'),
    mobileMenu: $('#mobile-menu'),
    menuToggle: $('.menu-toggle'),
    searchOpen: $('.search-open'),
    searchClose: $('.search-close'),
    searchForm: $('.search-form'),
    searchInput: $('.search-form input'),
    searchResults: $('.search-results'),
    cartOpen: $('.cart-open'),
    cartClose: $('.cart-close'),
    cartCount: $('.cart-count'),
    cartBody: $('.cart-body'),
    cartSubtotal: $('.cart-subtotal'),
    continueShopping: $('.continue-shopping'),
    checkout: $('.checkout-btn'),
    toast: $('.toast'),
    productModal: $('#product-modal'),
    pmClose: $('.pm-close'),
    pmPhoto: $('.pm-photo'),
    pmSku: $('.pm-sku'),
    pmTitle: $('#pm-title'),
    pmDesc: $('.pm-desc'),
    pmPrice: $('.pm-price'),
    pmSize: $('.pm-size'),
    pmAdd: $('.pm-add'),
  };

  const missing = Object.keys(dom).filter((key) => !dom[key]);
  if (missing.length) {
    console.error(`[DISTRICT 09] Faltan elementos en el HTML: ${missing.join(', ')}`);
    return;
  }

  const catalog = buildCatalog(RAW_CATALOG);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------ */
  /* Estado del carrito: clave "id::talla" -> { id, size, qty }         */
  /* Solo se guardan id, talla y cantidad; el precio sale del catálogo. */
  /* ------------------------------------------------------------------ */

  const cart = new Map();
  let toastTimer;
  let lastTrigger = null;
  let currentQuickView = null;

  const lineKey = (id, size) => `${id}::${size}`;

  function h(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Elimina líneas que ya no sean válidas y devuelve las líneas con su producto.
  function resolveCart() {
    const lines = [];
    for (const [key, line] of [...cart]) {
      const product = catalog.get(line.id);
      if (!product || product.soldOut || !product.sizes.includes(line.size) ||
          !isValidQty(line.qty) || key !== lineKey(line.id, line.size)) {
        cart.delete(key);
        continue;
      }
      lines.push({ key, product, size: line.size, qty: line.qty, subtotal: product.priceCents * line.qty });
    }
    return lines;
  }

  function totals(lines) {
    return {
      units: lines.reduce((sum, line) => sum + line.qty, 0),
      cents: lines.reduce((sum, line) => sum + line.subtotal, 0),
    };
  }

  // Persistencia: se guardan solo id, talla y cantidad; el precio sale del catálogo.
  function loadCart() {
    let raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return; // almacenamiento no disponible (modo privado / bloqueado)
    }
    if (!raw) return;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (!Array.isArray(parsed)) return;
    parsed.forEach((entry) => {
      if (!entry || typeof entry.id !== 'string' || typeof entry.size !== 'string') return;
      if (!isValidQty(entry.qty)) return;
      const key = lineKey(entry.id, entry.size);
      if (cart.has(key)) return;
      cart.set(key, { id: entry.id, size: entry.size, qty: entry.qty });
    });
  }

  function saveCart() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...cart.values()]));
    } catch {
      // Sin espacio o bloqueado: el carrito sigue funcionando solo en esta sesión.
    }
  }

  /* ------------------------------------------------------------------ */
  /* WhatsApp                                                           */
  /* ------------------------------------------------------------------ */

  function buildWhatsAppUrl(message) {
    if (!isValidWhatsAppNumber(WHATSAPP_NUMBER)) return null;
    const url = `${WHATSAPP_ORIGIN}/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    try {
      const parsed = new URL(url);
      if (parsed.origin !== WHATSAPP_ORIGIN || parsed.protocol !== 'https:') return null;
    } catch {
      return null;
    }
    return url;
  }

  function buildOrderMessage(lines) {
    const { units, cents } = totals(lines);
    return [
      '¡Hola, DISTRICT 09! Quiero realizar este pedido:',
      '',
      ...lines.map((line) =>
        `• ${line.product.name} | Talla: ${line.size} | Cantidad: ${line.qty} | Unitario: ${money(line.product.priceCents)} | Subtotal: ${money(line.subtotal)}`),
      '',
      `*TOTAL DE PRENDAS: ${units}*`,
      `*TOTAL DEL PEDIDO: ${money(cents)}*`,
      '',
      '¿Me confirman disponibilidad, costo de envío y forma de pago?',
      'Nombre:',
      'Ciudad/sector:',
      'Dirección de entrega:',
    ].join('\n');
  }

  const GENERAL_MESSAGE = '¡Hola, DISTRICT 09! Quisiera recibir información sobre sus prendas y disponibilidad.';

  function bindGeneralWhatsAppLinks() {
    const url = buildWhatsAppUrl(GENERAL_MESSAGE);
    document.querySelectorAll('.whatsapp-link').forEach((link) => {
      if (url) {
        link.setAttribute('href', url);
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        link.removeAttribute('aria-disabled');
      } else {
        link.setAttribute('aria-disabled', 'true');
        link.removeAttribute('href');
      }
    });
    if (!url) console.error('[DISTRICT 09] WHATSAPP_NUMBER no tiene un formato válido (8–15 dígitos, sin +).');
  }

  /* ------------------------------------------------------------------ */
  /* Paneles, foco y toasts                                             */
  /* ------------------------------------------------------------------ */

  function showToast(message) {
    dom.toast.textContent = message;
    dom.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { dom.toast.hidden = true; }, LIMITS.toastMs);
  }

  function activePanel() {
    return [dom.searchPanel, dom.cartDrawer, dom.mobileMenu, dom.productModal]
      .find((panel) => !panel.hidden) || null;
  }

  function openPanel(panel, trigger) {
    const alreadyOpen = activePanel();
    if (!alreadyOpen) lastTrigger = trigger || document.activeElement;
    closeAll(false);
    dom.overlay.hidden = false;
    panel.hidden = false;
    document.body.classList.add('no-scroll');
    if (panel === dom.mobileMenu) dom.menuToggle.setAttribute('aria-expanded', 'true');
    if (panel === dom.searchPanel) dom.searchInput.focus();
    else if (panel === dom.cartDrawer) dom.cartClose.focus();
    else if (panel === dom.productModal) dom.pmClose.focus();
    else panel.querySelector('a')?.focus();
  }

  function closeAll(restoreFocus = true) {
    const wasOpen = activePanel() !== null;
    dom.overlay.hidden = true;
    dom.searchPanel.hidden = true;
    dom.cartDrawer.hidden = true;
    dom.mobileMenu.hidden = true;
    dom.productModal.hidden = true;
    document.body.classList.remove('no-scroll');
    dom.menuToggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus && wasOpen && lastTrigger && document.contains(lastTrigger)) {
      lastTrigger.focus();
    }
    if (restoreFocus) lastTrigger = null;
  }

  function trapTab(event) {
    const panel = activePanel();
    if (!panel || event.key !== 'Tab') return;
    const selector = 'a[href], button:not([disabled]), input, select, textarea';
    const items = [...panel.querySelectorAll(selector)];
    if (panel === dom.mobileMenu) items.unshift(dom.menuToggle);
    const visible = items.filter((node) => !node.hidden && node.getClientRects().length > 0);
    if (!visible.length) return;
    const first = visible[0];
    const last = visible[visible.length - 1];
    if (!panel.contains(document.activeElement) && document.activeElement !== dom.menuToggle) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Render del carrito                                                 */
  /* ------------------------------------------------------------------ */

  function renderCart() {
    const lines = resolveCart();
    const { units, cents } = totals(lines);
    const empty = lines.length === 0;

    dom.cartCount.textContent = String(units);
    dom.cartCount.hidden = units === 0;
    dom.cartOpen.setAttribute('aria-label', units ? `Abrir carrito, ${units} ${units === 1 ? 'unidad' : 'unidades'}` : 'Abrir carrito');
    dom.cartSubtotal.textContent = money(cents);
    dom.checkout.setAttribute('aria-disabled', String(empty));
    dom.checkout.classList.toggle('is-disabled', empty);
    dom.checkout.setAttribute('href', empty ? '#' : (buildWhatsAppUrl(buildOrderMessage(lines)) || '#'));

    dom.cartBody.replaceChildren();
    if (empty) {
      const note = h('p', 'cart-empty');
      note.append('Tu carrito está vacío.', document.createElement('br'),
        'Explora la colección y agrega tus prendas favoritas.');
      dom.cartBody.append(note);
      return;
    }

    lines.forEach((line) => {
      const { product, size, qty } = line;
      const item = h('article', 'cart-item');
      item.dataset.key = line.key;

      const info = h('div', 'cart-item-info');
      info.append(
        h('strong', '', product.name), document.createElement('br'),
        h('small', '', `Talla: ${size} · ${money(product.priceCents)} c/u`), document.createElement('br'),
        h('small', '', `Subtotal: ${money(line.subtotal)}`),
      );

      const controls = h('div', 'qty');
      const dec = h('button', '', '−');
      dec.type = 'button';
      dec.dataset.action = 'dec';
      dec.setAttribute('aria-label', `Quitar una unidad de ${product.name} talla ${size}`);
      const count = h('span', '', String(qty));
      count.setAttribute('aria-label', 'Cantidad');
      const inc = h('button', '', '+');
      inc.type = 'button';
      inc.dataset.action = 'inc';
      inc.disabled = qty >= LIMITS.maxQtyPerLine;
      inc.setAttribute('aria-label', `Agregar una unidad de ${product.name} talla ${size}`);
      const remove = h('button', 'remove-item', 'Quitar');
      remove.type = 'button';
      remove.dataset.action = 'remove';
      remove.setAttribute('aria-label', `Eliminar ${product.name} talla ${size}`);
      controls.append(dec, count, inc, remove);

      item.append(info, controls);
      dom.cartBody.append(item);
    });
  }

  function addToCart(productId, size) {
    const product = catalog.get(productId);
    if (!product) { showToast('No pudimos agregar esta prenda.'); return false; }
    if (product.soldOut) { showToast('Esta prenda está agotada.'); return false; }
    if (!product.sizes.includes(size)) { showToast('Selecciona una talla válida.'); return false; }

    const key = lineKey(product.id, size);
    const current = cart.get(key);
    if (!current && cart.size >= LIMITS.maxLines) {
      showToast('El carrito alcanzó el máximo de prendas distintas.');
      return false;
    }
    const nextQty = (current ? current.qty : 0) + 1;
    if (!isValidQty(nextQty)) {
      showToast(`Máximo ${LIMITS.maxQtyPerLine} unidades por prenda y talla.`);
      return false;
    }
    cart.set(key, { id: product.id, size, qty: nextQty });
    saveCart();
    renderCart();
    openPanel(dom.cartDrawer, lastTrigger);
    showToast(`${product.name} · talla ${size} agregado`);
    return true;
  }

  function updateQty(key, action) {
    const line = cart.get(key);
    if (!line) return;
    if (action === 'remove') cart.delete(key);
    else if (action === 'inc') {
      if (isValidQty(line.qty + 1)) line.qty += 1;
      else showToast(`Máximo ${LIMITS.maxQtyPerLine} unidades por prenda y talla.`);
    } else if (action === 'dec') {
      line.qty -= 1;
      if (line.qty < 1) cart.delete(key);
    }
    saveCart();
    renderCart();
  }

  /* ------------------------------------------------------------------ */
  /* Tarjetas de producto (hidratadas desde el catálogo)                */
  /* ------------------------------------------------------------------ */

  const cardById = new Map();

  function setupProductCards() {
    document.querySelectorAll('.product').forEach((card) => {
      const product = catalog.get(card.dataset.id || '');
      const addButton = card.querySelector('.add-btn');

      if (!product) {
        console.warn('[DISTRICT 09] Tarjeta sin producto válido en el catálogo; no se puede comprar.');
        addButton?.remove();
        return;
      }
      if (cardById.has(product.id)) {
        console.warn(`[DISTRICT 09] Tarjeta duplicada para "${product.id}" ignorada.`);
        addButton?.remove();
        return;
      }
      cardById.set(product.id, card);

      const heading = card.querySelector('h3');
      if (heading) {
        const titleButton = h('button', 'quick-view-btn', product.name);
        titleButton.type = 'button';
        titleButton.setAttribute('aria-label', `Ver detalle de ${product.name}`);
        titleButton.addEventListener('click', () => openQuickView(product.id, titleButton));
        heading.replaceChildren(titleButton);
      }
      card.querySelector('.product-desc')?.replaceChildren(product.description);
      card.classList.toggle('sold-out', product.soldOut);
      syncBadge(card, product);

      const price = card.querySelector('.price');
      if (price) {
        price.replaceChildren(h('strong', '', money(product.priceCents)));
        if (product.compareCents) {
          const off = Math.round((1 - product.priceCents / product.compareCents) * 100);
          price.append(h('s', '', money(product.compareCents)), h('em', '', `-${off}%`));
        }
      }

      bindQuickView(card, product);

      if (product.soldOut) { addButton?.remove(); return; }
      if (!addButton) return;

      const label = h('label', 'size-picker');
      label.append(h('span', '', 'Talla'));
      const select = h('select', 'product-size');
      select.setAttribute('aria-label', `Seleccionar talla de ${product.name}`);
      product.sizes.forEach((size) => {
        const option = h('option', '', size);
        option.value = size;
        select.append(option);
      });
      label.append(select);
      if (product.sizes.includes('M')) select.value = 'M';
      card.querySelector('.product-desc')?.after(label);

      addButton.setAttribute('aria-label', `Agregar ${product.name} al carrito`);
      addButton.addEventListener('click', () => addToCart(product.id, select.value));
    });
  }

  // El badge se genera desde el catálogo, nunca desde el HTML.
  function syncBadge(card, product) {
    const box = card.querySelector('.product-image');
    if (!box) return;
    let badge = box.querySelector('.badge');
    if (product.soldOut) {
      if (!badge) { badge = h('span', 'badge'); box.prepend(badge); }
      badge.className = 'badge sold';
      badge.textContent = 'Agotado';
    } else if (product.compareCents) {
      if (!badge) { badge = h('span', 'badge'); box.prepend(badge); }
      badge.className = 'badge sale';
      badge.textContent = 'Oferta';
    } else if (badge) {
      badge.remove();
    }
  }

  function bindQuickView(card, product) {
    const box = card.querySelector('.product-image');
    box?.addEventListener('click', (event) => {
      if (event.target.closest('.add-btn')) return;
      openQuickView(product.id, event.currentTarget);
    });
  }

  function openQuickView(id, trigger) {
    const product = catalog.get(id);
    const card = product && cardById.get(product.id);
    if (!product || !card) return;
    currentQuickView = product;

    const photo = card.querySelector('.product-photo');
    if (photo) {
      dom.pmPhoto.src = photo.currentSrc || photo.src;
      dom.pmPhoto.alt = photo.alt;
    }
    const sku = card.querySelector('.sku');
    dom.pmSku.replaceChildren(sku ? sku.textContent : product.id);
    dom.pmTitle.replaceChildren(product.name);
    dom.pmDesc.replaceChildren(product.description);
    dom.pmSize.setAttribute('aria-label', `Seleccionar talla de ${product.name}`);

    dom.pmPrice.replaceChildren(h('strong', '', money(product.priceCents)));
    if (product.compareCents) {
      const off = Math.round((1 - product.priceCents / product.compareCents) * 100);
      dom.pmPrice.append(h('s', '', money(product.compareCents)), h('em', '', `-${off}%`));
    }

    dom.pmSize.replaceChildren();
    product.sizes.forEach((size) => {
      const option = h('option', '', size);
      option.value = size;
      dom.pmSize.append(option);
    });
    if (product.sizes.includes('M')) dom.pmSize.value = 'M';

    if (product.soldOut) {
      dom.pmAdd.disabled = true;
      dom.pmAdd.replaceChildren('AGOTADO');
    } else {
      dom.pmAdd.disabled = false;
      dom.pmAdd.replaceChildren('AGREGAR AL CARRITO ↗');
    }

    openPanel(dom.productModal, trigger);
  }

  /* ------------------------------------------------------------------ */
  /* Búsqueda                                                           */
  /* ------------------------------------------------------------------ */

  function renderSearch(query) {
    const q = normalizeText(query);
    dom.searchResults.replaceChildren();

    if (!q) {
      dom.searchResults.append(h('p', 'muted', 'Escribe para buscar en el drop.'));
      return;
    }

    const matches = [...catalog.values()]
      .filter((product) => product.searchText.includes(q))
      .slice(0, LIMITS.maxSearchResults);

    if (!matches.length) {
      dom.searchResults.append(h('p', 'muted', 'No encontramos esa prenda. Prueba con otro término.'));
      return;
    }

    matches.forEach((product) => {
      const button = h('button', 'search-item');
      button.type = 'button';
      button.dataset.id = product.id;
      button.append(
        h('span', '', product.soldOut ? `${product.name} · Agotado` : product.name),
        h('small', '', money(product.priceCents)),
      );
      dom.searchResults.append(button);
    });
  }

  const highlightTimers = new Map();

  function goToProduct(id) {
    const product = catalog.get(id);
    const card = product && cardById.get(product.id);
    if (!card) return;
    closeAll();
    card.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
    if (product.soldOut) return;
    clearTimeout(highlightTimers.get(id));
    card.classList.add('product-highlight');
    highlightTimers.set(id, setTimeout(() => card.classList.remove('product-highlight'), 1400));
  }

  /* ------------------------------------------------------------------ */
  /* Eventos (cada uno se registra una sola vez)                        */
  /* ------------------------------------------------------------------ */

  dom.searchOpen.addEventListener('click', () => {
    openPanel(dom.searchPanel, dom.searchOpen);
    renderSearch(dom.searchInput.value);
  });
  dom.searchClose.addEventListener('click', () => closeAll());
  dom.cartOpen.addEventListener('click', () => openPanel(dom.cartDrawer, dom.cartOpen));
  dom.cartClose.addEventListener('click', () => closeAll());
  dom.continueShopping.addEventListener('click', () => closeAll());
  dom.overlay.addEventListener('click', () => closeAll());
  dom.pmClose.addEventListener('click', () => closeAll());
  dom.pmAdd.addEventListener('click', () => {
    if (currentQuickView) addToCart(currentQuickView.id, dom.pmSize.value);
  });

  dom.menuToggle.addEventListener('click', () => {
    if (!dom.mobileMenu.hidden) closeAll();
    else openPanel(dom.mobileMenu, dom.menuToggle);
  });
  dom.mobileMenu.querySelectorAll('a').forEach((link) =>
    link.addEventListener('click', () => closeAll(false)));

  // Si la ventana pasa a escritorio con el menú móvil abierto, se cierra.
  window.matchMedia('(min-width: 651px)').addEventListener('change', (event) => {
    if (event.matches && !dom.mobileMenu.hidden) closeAll();
  });

  dom.cartBody.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    const item = event.target.closest('.cart-item');
    if (!button || !item || !dom.cartBody.contains(button)) return;
    const action = button.dataset.action;
    if (!['inc', 'dec', 'remove'].includes(action)) return;
    updateQty(item.dataset.key, action); // updateQty ignora claves que no estén en el carrito
  });

  dom.searchInput.addEventListener('input', () => {
    if (dom.searchInput.value.length > LIMITS.maxSearchLength) {
      dom.searchInput.value = dom.searchInput.value.slice(0, LIMITS.maxSearchLength);
    }
    renderSearch(dom.searchInput.value);
  });
  dom.searchResults.addEventListener('click', (event) => {
    const result = event.target.closest('.search-item');
    if (result) goToProduct(result.dataset.id);
  });
  dom.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    renderSearch(dom.searchInput.value);
  });

  dom.checkout.addEventListener('click', (event) => {
    const lines = resolveCart();
    if (!lines.length) {
      event.preventDefault();
      showToast('Agrega al menos una prenda antes de pedir.');
      return;
    }
    const url = buildWhatsAppUrl(buildOrderMessage(lines));
    if (!url) {
      event.preventDefault();
      showToast('No se pudo preparar el enlace de WhatsApp.');
      return;
    }
    // Se deja actuar al enlace nativo (target="_blank" + rel="noopener noreferrer").
    dom.checkout.setAttribute('href', url);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAll();
    else trapTab(event);
  });

  /* ------------------------------------------------------------------ */
  /* Inicio                                                             */
  /* ------------------------------------------------------------------ */

  setupProductCards();
  loadCart();
  renderCart();
  bindGeneralWhatsAppLinks();
})();
