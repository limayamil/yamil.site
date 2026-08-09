# design.md

Las decisiones de diseño del sitio, con los números que las sostienen.

Esto no es una guía de estilo aspiracional: es lo que está implementado, dónde
vive, y por qué. Si algo acá contradice al código, gana el código — y esta
página está desactualizada.

Complementa a [CLAUDE.md](CLAUDE.md), que documenta la arquitectura. Acá va el
criterio visual.

---

## 1. Paleta

Cinco neutros y un primario, sobre oscuro. La restricción es el punto: cuando el
95% de la página es un neutro, un solo color hace todo el trabajo de jerarquía
sin subir la voz.

Todos viven en el bloque `@theme` de [global.css](src/styles/global.css) y
Tailwind v4 genera las utilidades (`text-primary`, `bg-surface`, …) desde ahí.

### Neutros

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#120906` | Fondo. Negro cálido. |
| `--color-surface` | `#1c110b` | Superficies elevadas. **Opaco, no translúcido.** |
| `--color-ink` | `#ffffff` | Texto principal. |
| `--color-muted` | `#b3aca4` | Bio, copy secundario. |
| `--color-faint` | `#9d958c` | Labels, metadatos, estados inactivos. |
| `--color-line` | `rgb(255 255 255 / 0.14)` | Hairlines. |

`--color-bg` no es un gris elegido a ojo: es el `uColorA` del shader del fondo
(§7). Que el token y el punto más oscuro del veil sean el mismo valor es lo que
hace que el fallback estático y el primer frame renderizado empalmen sin costura.

`--color-surface` tiene que ser opaco porque todo lo que lo usa —`.card-media`,
`.gloss-note`— está apoyado sobre una imagen en movimiento, y un panel
semitransparente encima de eso no se lee.

### Contra qué se miden estos números

**No contra `--color-bg`.** El fondo es un shader animado, así que el peor caso
no es el token: es el píxel más claro que el veil puede producir, visto a través
del scrim. Ese es el fondo contra el que están medidas las relaciones de abajo, y
el procedimiento para volver a medirlas está en §7.

| Token | Columna intro | Zona de tarjetas | Piso que necesita |
|---|---|---|---|
| `--color-ink` | 17.0:1 | 14.5:1 | 4.5 ✓ |
| `--color-muted` | 7.6:1 | 6.5:1 | 4.5 ✓ |
| `--color-faint` | 5.7:1 | 4.9:1 | 4.5 ✓ |

La columna sale mejor que las tarjetas porque el scrim es más pesado ahí a
propósito: arriba de 62rem esa columna concentra todo el texto chico de la
página, y las tarjetas —que son mayormente imagen— se quedan con más veil.

### Primario

| Token | Valor | Columna | Tarjetas | Dónde sí | Dónde no |
|---|---|---|---|---|---|
| `--color-primary` | `#e35342` | **4.5:1** | **3.9:1** | Trazos, reglas, subrayados, acentos ≥24px | Texto de cuerpo |
| `--color-primary-ink` | `#f2836f` | **6.7:1** | **5.7:1** | Cualquier texto en primario bajo 24px | — |
| `--color-primary-wash` | `rgb(227 83 66 / 0.28)` | n/a | n/a | Fondo del resaltador | Bordes, texto |

**Este es el error fácil de cometer acá, y cambió de forma.** Sigue habiendo dos
tokens porque `#e35342` pasa el piso de 3:1 de WCAG AA para grafismo no textual
y para texto grande, y no llega a los 4.5:1 del texto chico sobre las tarjetas.
La nota manuscrita (`.hand`) usa `--color-primary-ink` justamente por eso: son
17px.

Lo que se dio vuelta es **hacia qué lado va `-ink`**. Sobre el crema anterior era
el tinte *más oscuro* (`#b8392a`), porque contra un fondo claro oscurecer es lo
que suma contraste. Sobre `#120906` ese mismo `#b8392a` cae a **3.4:1** y dejaría
la nota manuscrita fallando — así que `-ink` es ahora el tinte *más claro*.
Buscar el oscuro es el reflejo que hay que resistir.

El wash también subió, de 0.16 a 0.28: sobre oscuro, 0.16 de alfa no se ve.

Los números están también como comentario en el `@theme`, porque el lugar donde
se comete el error es el lugar donde hay que leerlos.

### El punto de disponibilidad sigue verde

`.dot` mantiene su `#2f9e5f` hardcodeado. No es un olvido: pintar de rojo-naranja
el indicador de "disponible para proyectos" dice exactamente lo contrario de lo
que el texto al lado dice. El verde ahí no es decoración, es semántica. Sobre el
fondo nuevo da 4.3:1 en el peor caso, de sobra para el 3:1 que pide un grafismo.

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
| JS de runtime | `motion.ts` + `veil.ts` (§7). Cero dependencias nuevas |

El `d` de cada path se redondea a dos decimales en `doodles.ts`; rough emite ~17,
que es un tercio del markup en precisión que ninguna pantalla resuelve.

Si el markup de doodles llegara a molestar, la palanca es el `roughness` y la
cantidad de pasadas, no el redondeo: `disableMultiStroke: true` corta un path a
la mitad.

---

## 7. El fondo

Rayos volumétricos saliendo de una fuente de luz que deriva fuera de cuadro,
abajo a la izquierda. Es un fragment shader de WebGL2 en
[src/scripts/veil.ts](src/scripts/veil.ts), montado por
[SolarVeil.astro](src/components/SolarVeil.astro) sobre un canvas fijo a todo el
viewport.

Tres colores, y son los mismos que definen la paleta neutra:

| Uniform | Valor | Rol |
|---|---|---|
| `uColorA` | `#120906` | La base. **Es `--color-bg`.** |
| `uColorB` | `#c9471e` | El velo ambiente. |
| `uColorC` | `#ffe0a8` | La punta de los haces. |

### Sin dependencias, y por qué

Llegó como componente React manejado con `ogl`. Las dos se descartaron por la
misma regla que descartó `rough-notation` en §2: `veil.ts` habla WebGL2 crudo —
un triángulo fullscreen derivado de `gl_VertexID`, sin buffers ni VAO.

El shader además se podó. El original era un uber-shader de ~40 uniforms cuyo
preset apagaba casi todos: sin dither, LED, pixelado, glitch, RGB split, pixel
sort, posterizado, edge glow, duotono, scanlines, animación de UV ni textura de
origen. Quedó **sólo el camino que ese preset ejecutaba de verdad**, copiado
carácter por carácter: 17KB → 2.9KB. El original completo se conserva sin
compilar en [docs/reference](docs/reference/).

### El scrim es parte del contrato, el canvas no

Es la distinción que sostiene toda la §1, y confundirlas es el error:

- **El canvas es mejora progresiva.** Sin WebGL2, con el contexto perdido o con
  el script bloqueado la página tiene que quedar igual de legible. Por eso `body`
  lleva un gradiente estático que lo aproxima, y por eso `--color-bg` es el mismo
  valor que `uColorA`.
- **El scrim no lo es.** `.veil-scrim` es la capa a través de la cual están
  medidas todas las relaciones de contraste, así que existe pinte o no pinte el
  canvas. De ahí que sean dos elementos y no un filtro sobre uno.

Arriba de 62rem el scrim es un degradado horizontal: más pesado sobre la columna
intro, que concentra todo el texto chico, y más liviano sobre las tarjetas, que
son mayormente imagen. Abajo de 62rem hay una sola columna y es parejo.

### Las tres palancas

Sólo estas tres mueven el presupuesto de contraste. Tocar una obliga a re-medir.

| Palanca | Dónde | Valor |
|---|---|---|
| `--scrim` | `.veil` en `global.css` | `0.82` |
| `--scrim-column` | `.veil` en `global.css` | `0.9` |
| `brightness` | `VEIL` en `veil.ts` | `0.85` (el preset traía `1.0`) |

### Cómo re-medir

**No alcanza con mirarlo**: el fondo se mueve, y el frame que rompe el contraste
puede tardar en aparecer. La fuente de luz tiene un ciclo de ~116s, así que un
muestreo corto se lo pierde.

El procedimiento, corriendo en la página:

1. Compilar el mismo shader en un contexto WebGL2 aparte, con
   `preserveDrawingBuffer`, a la relación de aspecto que se quiera evaluar.
2. Barrer `uTime` de 0 a 130 en pasos de 0.5 y `readPixels` en cada paso.
3. Componer cada píxel contra el alfa de scrim que le toca según su posición en
   x, y quedarse con la **luminancia máxima** de todo el barrido, separando la
   franja de la columna (x < 0.30) del resto.
4. Calcular la relación de cada token contra ese peor caso.

El piso: **4.5:1 para todo token de texto, 3:1 para todo grafismo.** Los
resultados de la última corrida están en las tablas de §1.

### Coste y contención

`glow` a 0.68 dispara cuatro muestreos extra del generador, y cada muestreo corre
`fbm` de 5 octavas dos veces: cinco pasadas caras por píxel. Eso es lo que fija
las tres decisiones de contención en `veil.ts`, y ninguna es opcional:

- **dpr topeado en 1.5** (el original usaba 2). El coste escala con el cuadrado.
- **El loop se corta con `visibilitychange`.** El original seguía renderizando
  aun "pausado" — sólo congelaba el reloj.
- **`prefers-reduced-motion` dibuja un frame y para.** El original no contemplaba
  la query. Vale la misma regla de §5: la imagen es el punto, el movimiento no.
