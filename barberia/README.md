# Navaja & Roble — Landing de barbería (plantilla reutilizable)

Landing one-page para barbería moderna. HTML + CSS + JS vanilla, sin dependencias ni build.
Solo tienes que abrir `index.html` en el navegador.

```
barberia/
├── index.html   · estructura y contenido
├── styles.css   · estilos (todas las variables de marca en :root, arriba del todo)
└── script.js    · comportamiento (configuración arriba del todo)
```

## ✅ Qué sustituir para personalizar por cliente

| Qué | Dónde |
|-----|-------|
| **Colores / tipografía / espaciado** | `styles.css` → bloque `:root` (todo está comentado) |
| **Color de acento** | `styles.css` → `--color-accent` (y `--color-accent-strong`) + `meta theme-color` y los `placehold.co` del HTML |
| **Logo** | `index.html` → `.logo` (sustituir `N&R` / texto por un `<img>`); también `favicon` y `og:image` |
| **Nombre y eslogan** | `index.html` (header, hero, footer) y `BUSINESS_NAME` en `script.js` |
| **Fotos** (hero, sobre nosotros, galería, equipo) | `index.html` → cada `<img>` lleva un comentario `<!-- SUSTITUIR ... -->`. Tamaños: hero 1920×1080, galería 800×800, equipo 600×600 |
| **Servicios y precios** | `index.html` → sección `#servicios` (y las `<option>` del formulario) |
| **Textos** (sobre nosotros, por qué elegirnos, reseñas) | `index.html` |
| **URL de reservas** | `script.js` → `BOOKING_URL` (vacío = usa el formulario de la página; con URL = lleva a Booksy/Fresha/Treatwell…) |
| **Dirección, teléfono, horario** | `index.html` → secciones `#reservar` y `#ubicacion`, enlaces `tel:`, y el **JSON-LD** del `<head>` |
| **Mapa de Google** | `index.html` → `.location__map` (sustituir el placeholder por el `<iframe>` real de Google Maps) |
| **Redes sociales** | `index.html` → enlaces de Instagram/TikTok (varios sitios) + `sameAs` del JSON-LD |
| **WhatsApp** | `script.js` → `WHATSAPP_NUMBER` y `WHATSAPP_MESSAGE` |
| **SEO** | `index.html` → `<title>`, `meta description`, Open Graph, `canonical` y el JSON-LD `BarberShop` |
| **Aviso legal / privacidad / cookies** | `index.html` → footer (enlaces placeholder `#`) |

## 🔧 Notas técnicas

- **Reservas (demo):** el formulario no tiene backend; al enviar compone un mensaje de WhatsApp con los datos y lo abre. En producción, conéctalo a un backend/email o pon `BOOKING_URL`.
- **Accesibilidad:** AA, foco visible, navegación por teclado, `alt` en todas las imágenes, `prefers-reduced-motion` respetado.
- **Rendimiento:** imágenes con `loading="lazy"`, `font-display: swap`, sin librerías.
- **SEO:** un solo `<h1>`, jerarquía de encabezados, Open Graph y JSON-LD `BarberShop`.
