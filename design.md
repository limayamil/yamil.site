# design.md

Las decisiones de diseño del sitio, con los números que las sostienen.

Esto no es una guía de estilo aspiracional: es lo que está implementado, dónde
vive, y por qué. Si algo acá contradice al código, gana el código — y esta
página está desactualizada.

Complementa a [CLAUDE.md](CLAUDE.md), que documenta la arquitectura. Acá va el
criterio visual.

---

## 1. Paleta

Cinco neutros y un primario. La restricción es el punto: cuando el 95% de la
página es gris, un solo color hace todo el trabajo de jerarquía sin subir la voz.

Todos viven en el bloque `@theme` de [global.css](src/styles/global.css) y
Tailwind v4 genera las utilidades (`text-primary`, `bg-surface`, …) desde ahí.

### Neutros

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#fafaf8` | Fondo. Blanco roto, cálido. |
| `--color-surface` | `#f1f1ed` | Superficies elevadas. |
| `--color-ink` | `#111110` | Texto principal. |
| `--color-muted` | `#63635e` | Bio, copy secundario. |
| `--color-faint` | `#9a9a94` | Labels, metadatos, estados inactivos. |
| `--color-line` | `rgb(17 17 16 / 0.1)` | Hairlines. |

### Primario

| Token | Valor | Contraste sobre `#fafaf8` | Dónde sí | Dónde no |
|---|---|---|---|---|
| `--color-primary` | `#e35342` | **3.60:1** | Trazos, reglas, subrayados, acentos ≥24px | Texto de cuerpo |
| `--color-primary-ink` | `#b8392a` | **5.53:1** | Cualquier texto en primario bajo 24px | — |
| `--color-primary-wash` | `rgb(227 83 66 / 0.16)` | n/a | Fondo del resaltador | Bordes, texto |

**Este es el error fácil de cometer acá.** `#e35342` pasa el piso de 3:1 de
WCAG AA para grafismo no textual y para texto grande, y **no llega** a los 4.5:1
que pide el texto chico. Por eso hay dos tokens y no uno. La nota manuscrita
(`.hand`) usa `--color-primary-ink` justamente por esto: son 17px.

Los números están también como comentario en el `@theme`, porque el lugar donde
se comete el error es el lugar donde hay que leerlos.

### El punto de disponibilidad sigue verde

`.dot` mantiene su `#2f9e5f` hardcodeado. No es un olvido: pintar de rojo-naranja
el indicador de "disponible para proyectos" dice exactamente lo contrario de lo
que el texto al lado dice. El verde ahí no es decoración, es semántica.

---

## 2. Sistema de doodles

Las marcas a mano alzada — óvalo, flecha, resaltador — se generan con
[rough.js](https://roughjs.com) en [src/lib/doodles.ts](src/lib/doodles.ts) y se
renderizan con [Doodle.astro](src/components/Doodle.astro).

Sólo viven ahí las formas que se usan. Una forma sin consumidor es código
muerto en un archivo que se evalúa en cada build.

### Por qué en build y no en runtime

`rough-notation` habría sido el camino obvio (3.8kb gz, mide el elemento en el
navegador y dibuja encima). Se descartó porque rompe la regla que define este
proyecto: **el JS de runtime es un solo archivo**, `motion.ts`.

`roughjs` es `devDependency`. Astro evalúa `doodles.ts` al compilar y al
navegador solo viaja el `<path d>` resultante. Es el mismo patrón que
[tool-icons.ts](src/lib/tool-icons.ts) usa con `simple-icons`.

Verificable: después de `npm run build`, ningún chunk de `dist/` contiene los
símbolos de la librería (`hachure`, `bowing`, `RoughGenerator`).

### Seed fijo, siempre

Rough dibuja distinto en cada invocación — es su razón de ser. Sin `seed`, cada
build produciría curvas nuevas: las marcas se moverían entre deploys y el output
diffearía sin motivo. **Toda forma nueva pinea su `seed`.**

### Los dos modos

| Modo | `stretch` | Cómo se renderiza | Para qué |
|---|---|---|---|
| Fijo | `false` | Aspect ratio conservado, tamaño conocido | Marcas que no dependen de un ancho ajeno (`arrowLeft`) |
| Estirable | `true` | `preserveAspectRatio="none"` + `vector-effect="non-scaling-stroke"` | Marcas que abarcan un elemento de ancho desconocido (`oval`, `highlight`) |

El modo estirable es lo que **reemplaza al medir-el-DOM** que haría una librería
en runtime: el SVG se adapta a la caja donde se lo pone, y `non-scaling-stroke`
hace que el grosor de la pluma sobreviva al estirado.

### Trampa: `max-width` sobre `svg`

El reset base aplica `max-width: 100%` a todo `svg`. Para contenido está bien;
para una marca está mal — un óvalo tiene que dibujarse **más ancho** que la
palabra que rodea, y el tope lo recorta silenciosamente a la caja exacta del
texto. Se ve como un óvalo achatado, no como una regla que falta.

`.doodle` lleva `max-width: none` por eso. Y todas las ubicaciones dimensionan
con `width`/`height` explícitos, nunca con insets opuestos: un `<svg>` es un
elemento reemplazado, así que `left: 0; right: 0; width: auto` está
sobre-restringido y el navegador descarta `right`.

### Cómo se revelan

Ninguna marca necesita JS propio. Cada una hereda el revelado de lo que ya se
anima alrededor:

- `pathLength="1"` normaliza cualquier path a largo 1, así una sola regla de
  `stroke-dasharray`/`dashoffset` anima un óvalo, una regla o una flecha por
  igual — sin medir geometría.
- El resaltador es la excepción: su trazo es un fibrón de 15px, y un revelado
  por dashes ahí se lee como línea punteada. Entra con un barrido de
  `clip-path` desde la izquierda — el mismo gesto que `.link::after`.
- `.doodle-enter` monta sobre el stagger `--i` del ancestro `.enter`, con 700ms
  de retraso: anotar algo antes de que exista se lee al revés.
- `[data-reveal].is-visible` está cableado para marcas que entren por scroll,
  aunque hoy ninguna lo use.

---

## 3. Tipografía

| Familia | Token | Rol |
|---|---|---|
| Inter Tight Variable | `--font-sans` | Todo el texto de interfaz y de cuerpo |
| Instrument Serif | `--font-display` | El `h1` y nada más |
| Caveat | `--font-hand` | Notas al margen de una a tres palabras |

Las tres son self-hosted: los `.woff2` se copian a mano de `node_modules` a
`public/fonts/` (ver comentario al tope de `global.css`).

**Caveat no se preloadea**, a diferencia de las otras dos. Es una fuente
decorativa que sólo compone dos palabras; no tiene por qué competir por ancho de
banda con la tipografía de la que está hecha la página. Va con `font-display:
swap`, así la nota entra en la fallback y se re-compone después — aceptable para
una nota, inaceptable para un título.

Se usa la **estática 400 (47.7KB)** y no la variable (74.9KB): para notas de dos
palabras no hace falta un eje de peso.

**Caveat nunca compone texto corrido.** Una a tres palabras, y siempre en
`--color-primary-ink`.

---

## 4. Inventario de anotaciones

Cinco gestos. Esta tabla es la fuente de verdad: si se agrega uno, va acá.

| # | Dónde | Marca | Se dispara con |
|---|---|---|---|
| 1 | `h1`, el apellido — [Intro.astro](src/components/Intro.astro) | Óvalo (`oval`) | `.enter` del `h1` (`--i:1`) |
| 2 | A la derecha de los links de contacto | Flecha (`arrowLeft`) + nota manuscrita | `.enter` del bloque inferior (`--i:5`) |
| 3 | Primer término glosado del bio | Resaltador (`highlight`) | `.enter` del bio (`--i:3`) |
| 4 | Links de contacto — [Links.astro](src/components/Links.astro) | Subrayado en primario (CSS puro) | hover / focus |

El texto de la nota #2 es dato, no markup: `profile.contactNote` en
[profile.ts](src/data/profile.ts).

La marca #1 rodea **el apellido**, no el nombre completo: una marca que rodea
todo no marca nada. La #3 resalta **el primer** término glosado de cada idioma,
no todos: un resaltador por columna se lee como alguien marcando la línea que
importó; tres se leen como una leyenda.

**La nota #2 va en la misma línea que los links, no arriba.** La flecha apunta
hacia la izquierda, de vuelta al último link, y se dibuja dentro del
`column-gap` de `.contact-row` — por eso ese gap es un número medido (3.5rem) y
no el espaciado propio de la lista. La nota no se empuja al borde derecho de la
columna: dejaría ~200px entre la punta de la flecha y el link, y una flecha que
no llega a lo que señala no señala nada.

### Los ejes no llevan marca

Se probó un subrayado rugoso bajo el eje activo y se quitó: las tres filas ya
tienen borde inferior propio, y una marca encima competía con esa estructura en
vez de sumarse. El estado activo lo siguen llevando el color y el chevron.

---

## 5. Reglas

- **Una marca por elemento.** Nunca dos anotaciones compitiendo en el mismo
  bloque.
- **Los doodles no suman altura de flujo.** Siempre `position: absolute` y
  `pointer-events: none`. Es lo que hace que anotar algo nunca mueva el layout,
  y lo que mantiene `.intro` dentro de su presupuesto.
- **`aria-hidden` sin excepción.** Son decoración sobre texto que ya dice la
  cosa. Un lector de pantalla anunciando "círculo" alrededor de un nombre es
  ruido. La nota manuscrita también va `aria-hidden`: "escribime → Email,
  LinkedIn" no aporta nada leído en voz alta.
- **Toda animación nueva se resuelve en el bloque de `prefers-reduced-motion`.**
  Las marcas son el punto; la pluma recorriéndolas no. Con la query activa las
  marcas aparecen dibujadas y el subrayado del eje sigue atado al estado activo
  (ahí sí carga significado), simplemente sin trazarse.
- **Tres clases de ícono, tres pesos visuales distintos** — la distinción es
  deliberada y está en CLAUDE.md: trazo hairline = disciplina
  ([Icon.astro](src/components/Icon.astro)), relleno sólido = herramienta
  ([ToolIcon.astro](src/components/ToolIcon.astro)), trazo suelto en primario =
  anotación ([Doodle.astro](src/components/Doodle.astro)). Los doodles son los
  únicos que llevan color propio, y eso es lo que los mantiene legibles como
  capa encima y no como más contenido.

---

## 6. Presupuestos

### Altura de la columna intro

`.intro` es `position: sticky; height: 100svh` arriba de 62rem. Todo lo que se
agregue tiene que entrar en un viewport.

**Medido:** con la columna en su punto más angosto (304px, en un viewport de
exactamente 62rem), el intro necesita **1050px** en ambos idiomas. Por eso el
escape hatch de `global.css` está en `max-height: 65.75rem` (1052px, dos de
margen para redondeo sub-pixel): sticky sólo puede activarse de 1053px para
arriba.

> Ese número estaba en 61rem (976px) y ya se quedaba ~74px corto: entre 977px y
> 1050px de alto, la columna se pinneaba y recortaba su propio footer en
> silencio. La nota de contacto no agrega nada — va en la fila de los links, no
> en una propia — así que el número corregido es el que esta columna siempre
> necesitó.

**Cómo re-medirlo** (obligatorio si se agrega una fila al intro): poner el
viewport en 992px de ancho, forzar sobre `.intro` la forma flex con
`height: auto`, y leer la altura de flujo en ES y EN.

### Peso

| Qué | Cuánto |
|---|---|
| Markup de los 7 doodles en el HTML | 4.5KB (11% del `index.html`) |
| `index.html` completo | 40.2KB → **13.5KB gzip** |
| Caveat (no preloadeado, `swap`) | 47.7KB |
| JS de runtime | Sin cambios — `motion.ts` y nada más |

El `d` de cada path se redondea a dos decimales en `doodles.ts`; rough emite ~17,
que es un tercio del markup en precisión que ninguna pantalla resuelve.

Si el markup de doodles llegara a molestar, la palanca es el `roughness` y la
cantidad de pasadas, no el redondeo: `disableMultiStroke: true` corta un path a
la mitad.
