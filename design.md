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

Seis gestos. Esta tabla es la fuente de verdad: si se agrega uno, va acá.

| # | Dónde | Marca | Se dispara con |
|---|---|---|---|
| 1 | `h1`, el apellido — [Intro.astro](src/components/Intro.astro) | Óvalo (`oval`) | `.enter` del `h1` (`--i:1`) |
| 2 | A la derecha de los links de contacto | Flecha (`arrowLeft`) + nota manuscrita | `.enter` de `.intro-foot` (`--i:7`) |
| 3 | Primer término glosado del bio | Resaltador (`highlight`) | `.enter` del bio (`--i:3`) |
| 4 | Links de contacto — [Links.astro](src/components/Links.astro) | Subrayado en primario (CSS puro) | hover / focus |
| 5 | Ranura de reposo del panel de ejes — [Axes.astro](src/components/Axes.astro) | Flecha hacia arriba (`arrowUp`) + nota manuscrita | `.enter` de la columna |
| 6 | El empleador en la línea de experiencia (`.link-em`) | Resaltador (`highlight`) + subrayado permanente en primario | `.enter` del bloque de experiencia (`--i:4`) |

El texto de las notas #2 y #5 es dato, no markup: `profile.contactNote` y
`profile.restingNote` en [profile.ts](src/data/profile.ts).

El recorrido ([Track.astro](src/components/Track.astro), §9) tuvo una séptima
anotación — la misma flecha-más-nota que la #5, apuntando a una leyenda de tres
chips — y se sacó junto con la leyenda que anotaba. Si esa leyenda vuelve, la
marca es la misma: reusar `arrowUp`, no dibujar una nueva.

La #6 es la única que rompe la regla de "un solo resaltador por columna": el
bio ya trae el suyo en #3. Es una decisión explícita — el nombre del empleador
actual es el dato más concreto de la columna y se pidió marcado — pero es
también el techo. Un tercer resaltador en el mismo scroll deja de leerse como
alguien marcando lo que importaba y pasa a leerse como una leyenda.

La #5 es una instrucción, no una línea de copy: dice que la lista de arriba
responde al puntero, y la flecha es la que la ata a esa lista. Sólo existe con
puntero — en touch el panel abre en el primer eje y la ranura de reposo nunca se
muestra (`idle` en [motion.ts](src/scripts/motion.ts)), así que la copia puede
hablar de mouse sin mentir. La flecha se dibuja más alta que la nota porque
tiene que cruzar el `margin-top` del panel antes de llegar a los botones.

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

> **Qué cubre este presupuesto desde que existe el recorrido (§9).** La columna
> quedó partida en dos: `.intro-views` (las dos vistas) y `.intro-foot`
> (contacto + reloj), que está afuera de las vistas y no se mueve nunca. El
> presupuesto es de `.intro-views` en **vista bio**, y hoy sobra: sacar contacto
> del flujo del bio devolvió ~104px, así que en el tramo más angosto
> (992x1080) el bio cierra a 879px contra un footer que arranca en 911 — 32px de
> aire, que es exactamente el `gap` de la columna.
>
> La vista `track` no entra acá y nunca se pidió que entrara: scrollea adentro
> de `.intro-views`. Por eso los tres umbrales de abajo están scopeados a
> `[data-view='bio']` — y tienen que estarlo **los tres o ninguno**, porque a
> (0,2,0) un solo umbral scopeado le gana a los otros dos sin importar el orden
> y los dos que re-afirman sticky dejarían de poder hacerlo.

La altura que necesita **depende del ancho**: la columna es `max(19rem, 30vw)`,
así que una pantalla más ancha envuelve la copia en menos líneas. Por eso el
escape hatch de `global.css` está tramado por ancho, no es un solo número.

| Tramo | Viewport más angosto | Columna | Altura de flujo | Sticky desde |
|---|---|---|---|---|
| 62–90rem | 992px | 304px | 1085px | > 67rem (1072px) |
| 90–120rem | 1440px | 432px | 951px | ≥ 57.5rem (920px) |
| ≥ 120rem | 1920px | 576px | 905px | ≥ 54.5rem (872px) |

> Un solo umbral tiene que ser el del tramo más angosto (~67rem, 1072px), y con
> eso una pantalla de 1920x1080 — donde el intro entra en 866px — no se pinneaba
> nunca. El número venía subiendo (61rem → 65.75rem → 74.625rem) porque cada
> fila nueva del intro lo empujaba; tramarlo por ancho es lo que corta esa
> escalera.

Dos palancas lo bajaron a estos valores, y las dos son de contenido, no del
umbral: `.col-prose` pasa de 38ch a **62ch** arriba de 62rem — cada línea que la
copia no envuelve son 23px de presupuesto — y el `padding-block` de la columna
pinneada pasó de `8vh` a `6vh`, que arriba de ~1200px de viewport da lo mismo
(ambos clampean a 4.5rem) y sólo devuelve espacio en los viewports cortos que lo
están peleando: ~32px en 1080p.

**Cómo re-medirlo** (obligatorio si se agrega una fila al intro, y hay que hacer
los tres tramos): poner el viewport en el ancho más angosto del tramo, forzar
sobre `.intro` la forma flex con `height: auto`, leer la altura de flujo en ES y
EN, quedarse con la más alta, y despejar el viewport que la aguanta cuando el
padding es 6vh de esa misma altura: `H = (flujo − padding) / 0.88`, redondeado
al próximo 0.5rem.

### Peso

| Qué | Cuánto |
|---|---|
| Markup de los 7 doodles en el HTML | 4.5KB |
| `index.html` completo | 90.5KB → **20.1KB gzip** (era 40.2 → 13.5 antes del bento; ver §8) |
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

---

## 8. La grilla bento

La columna derecha tiene dos vistas y una sola URL: el índice (fila de filtros +
grilla) y un caso abierto. Las dos están en el HTML a la vez y `data-view` en
`.projects` elige una, el mismo truco que `html[data-lang]` hace con los dos
idiomas. El hash `#caso/<slug>` es todo el router.

### Los tres tiers

El tamaño **es** la afirmación. No hay otra señal de jerarquía: ni badges, ni
"destacado", ni orden implícito.

| Tier | ≥62rem (3 col) | 34–62rem (2 col) | <34rem (1 col) |
|---|---|---|---|
| `primary` | 3 × 2 | 2 × 2 | ratio 5/4 |
| `secondary` + `horizontal` | 2 × 1 | 2 × 1 | ratio 16/11 |
| `secondary` + `vertical` | 1 × 2 | 1 × 2 | ratio 4/5 |
| `tertiary` | 1 × 1 | 1 × 1 | ratio 16/11 |

En una sola columna los spans no significan nada, así que cada tier declara su
proporción vía `--tile-ratio` en lugar de su span. La propiedad se setea por
tier y el `aspect-ratio` se apaga con una única regla de la misma
especificidad — por eso es una custom property y no el `aspect-ratio` directo.

`grid-auto-flow: dense` es lo que evita que la grilla se lea como una escalera:
un tile vertical detrás de uno horizontal rellena el hueco en vez de dejarlo.
El costo es que `dense` desacopla el orden visual del orden del DOM, así que el
`order` de `projects.json` tiene que quedar cerca del orden de lectura; dense
sólo rellena huecos, no baraja.

**El índice completo empaqueta exacto.** Con 9 proyectos las celdas suman 27, que
son 9 filas de 3, y el `order` actual las cierra sin un hueco:

```
filas 1–2   primary                      (3×2 = 6)
filas 3–4   vertical vertical ter ter    (2+2+1+1 = 6)
filas 5–6   primary                      (3×2 = 6)
fila  7     horizontal ter               (2+1 = 3)
filas 8–9   primary                      (3×2 = 6)
```

Si se agrega o saca un proyecto hay que rehacer esta cuenta o aceptar el hueco
en la cola. Filtrado por un solo eje quedan 3 tiles y la cola queda dispareja:
tres piezas no llenan una grilla de tres columnas, y está bien que así sea.

### El scrim del tile, que es load-bearing

La media pasó a ser **fondo**: el texto va encima. Eso saca el contraste de la
órbita de `.veil-scrim` (§7) — ninguna de esas medidas sobrevive a poner texto
sobre arte cuyo brillo no controlamos.

Hay dos capas y sólo una carga el presupuesto:

- **`.tile-media::after`** — un velo suave sobre toda la imagen (0.45 abajo →
  0.06 arriba). Es estética: asienta el arte en la página y le da al chevron
  algo sobre qué apoyarse. El contraste no se apoya acá.
- **`.tile-body::before`** — el que sí. Va colgado de **la copia, no del tile**,
  y esa es la decisión: un tile es una celda de alto fijo pero la copia no lo
  es, así que cualquier gradiente expresado como porcentaje del tile es una
  conjetura que un título de dos líneas rompe. La primera versión iba por
  porcentajes y dejaba la línea de eje de un terciario en **1.9:1** sobre un
  frame blanco, porque ese tile resultó ser 63% texto.

  Anclado a `.tile-body` la geometría es exacta a cualquier alto y cualquier
  largo de copia: el tramo opaco cubre la copia más el padding de abajo, y el
  degradé es exactamente los 3.5em de sangrado de arriba — la rampa siempre
  arranca donde el texto termina. En `em`, así escala con la tipografía y no con
  el layout.

**El alfa está medido, no elegido.** El token que manda es
`--color-primary-ink` (la línea de eje): con L = 0.362 necesita un fondo de
L ≤ 0.042 para sostener 4.5:1, y bajar arte blanco hasta ahí pide α ≥ 0.82.

| Token | Sobre frame blanco (α efectivo 0.934) | Piso |
|---|---|---|
| `--color-ink` (título) | 17.2:1 | 4.5 ✓ |
| `--color-muted` (bajada) | 7.7:1 | 4.5 ✓ |
| `--color-primary-ink` (eje) | 6.8:1 | 4.5 ✓ |
| `.tile-cue` sobre `rgb(18 9 6 / 0.55)` | 4.2:1 | 3.0 ✓ |

El peor caso es un frame blanco puro; los placeholders actuales son mucho más
oscuros, así que el presupuesto ya está pago para cuando llegue material real.

**Cómo re-medirlo** si se toca el 0.93 o el sangrado de 3.5em: componer blanco
contra el alfa efectivo de las dos capas, pasar a luminancia relativa y sacar la
razón contra cada token. El chevron va aparte: está arriba del tile, donde el
scrim ya soltó, y por eso su fondo es oscuro (`rgb(18 9 6 / 0.55)`) y no un lavado
blanco, que sobre arte claro se lo llevaría puesto.

### El alto de fila

`grid-auto-rows: clamp(10rem, 14vw, 13.5rem)`. El mínimo no es decorativo: un
terciario carga eje + título + bajada, que son ~105px de copia, y abajo de 10rem
el scrim detrás de esa copia se come la celda entera y el arte deja de leerse.

### Los tiles no llevan marca

Misma razón que los ejes (§4): el tile ya tiene su propia estructura — hairline,
radio, scrim — y una anotación encima compite con eso en vez de sumarle. La
única marca del bento es el chevron, que es afordancia, no anotación.

### Peso

Los 9 casos se renderizan en build y viajan ocultos en el HTML: sin fetch, sin
plantilla en cliente, y con JS apagado un `#caso/slug` no rompe nada. El costo es
real y está acá para que se vea:

| Qué | Antes | Ahora |
|---|---|---|
| `index.html` | 40.2KB → 13.5KB gzip | 90.5KB → **20.1KB gzip** |
| `motion.ts` compilado | — | 7.8KB → 2.8KB gzip |

Si eso llegara a molestar, la palanca es sacar los casos del HTML inicial, no
recortar la copia — pero eso trae fetch y plantillas en cliente, que es
exactamente lo que este sitio no tiene.

---

## 9. El recorrido

La segunda vista de la columna izquierda, en `#recorrido`. Es el mismo truco que
el bento hace con `#caso/<slug>`, del otro lado de la página: las dos vistas
viajan en el HTML, `data-view` elige una, y un solo `hashchange` es toda la
ruta — así el botón de atrás, un link compartido y un ctrl-click entran por la
misma puerta.

Catorce puestos, ocho empresas, desde 2010. El dato está en
[track.ts](src/data/track.ts); el orden lo resuelve el build (`start`
descendente, empate por duración) así que el archivo se puede escribir en
cualquier orden.

### La columna quedó en tres partes

```
.intro            sticky, 100svh, flex column
  .intro-views    flex:1 — las dos vistas; scrollea sólo en track
  .intro-foot     contacto + reloj — afuera de las vistas, no se mueve nunca
```

Contacto estaba al fondo del bio, así que abrir el recorrido se lo llevaba de la
pantalla. Sacarlo de las vistas es lo que lo vuelve constante: durante el swap ni
siquiera se anima, porque es hermano del elemento que sale y no hijo.

`min-height: 0` en `.intro-views` no es opcional. Sin eso un flex item se niega a
achicarse abajo de su contenido, la caja crece más allá de los 100svh y el footer
termina empujado fuera de la pantalla — que es exactamente lo que esta división
existe para evitar.

**El scroll interno está scopeado a `[data-view='track']`.** `overflow` no sólo
scrollea: recorta. Y el bio tiene una cosa que legítimamente se sale de su caja,
`.gloss-note`, a la que se le permite ser más ancha que la columna que la ancla
(§ nota en `global.css`). El bio además ya entra en un viewport por diseño, así
que no gana nada acá y perdería el popover.

### Las dos correcciones del borde

**`overflow-x: clip`, no `visible`.** Un eje en `visible` al lado de uno que
scrollea computa a `auto`, y eso era una barra horizontal que aparecía durante
toda la transición: `enter-left` arranca cada entrada 22px a la derecha de donde
cae, y por lo que dura el stagger eso es overflow real (medido: 26px de pico).
Recortarlo además se lee mejor — las entradas salen de atrás del borde de la
columna en vez de empujarlo.

**El final se disuelve, no se corta.** `.intro-views` lleva un
`mask-image: linear-gradient(to bottom, #000 calc(100% - var(--fade)), transparent)`
con `--fade: 4rem`, así el recorrido se desvanece antes de chocar contra
`.intro-foot` en vez de cortarse a mitad de una entrada.

Es máscara y no un degradado encima, y la razón es §7: abajo de todo esto hay un
shader moviéndose. Un scrim falso en `--color-bg` sería una banda oscura tapando
los rayos; la máscara los deja pasar.

`.track` lleva `padding-bottom: var(--fade)` — **el mismo número, y tiene que
serlo**. Sin eso la última entrada vive adentro del degradado de forma
permanente y no se resuelve por más que scrollees. Con eso, scrolleado hasta el
fondo, el link a LinkedIn cae exactamente donde arranca la rampa: la zona que se
desvanece no tiene más que aire.

### El nodo lleva el glifo de la disciplina

Misma clave que usan el panel de capacidades y los filtros del bento
(`Capability.icon` = `TrackEntry.axis` = `axis` en projects.json). Un valor
fuera de la unión rompe el build. Sólo llega como el glifo del nodo y una
etiqueta `sr-only`; hoy nada en esta vista filtra o resalta por él — se probaron
una leyenda de tres chips que atenuaba las filas que no compartían disciplina y
una regla por entrada con la duración a escala, y las dos se sacaron a pedido
antes de llegar a producción. La clave se dejó puesta porque es gratis y es la
que ata las tres pantallas entre sí; si alguna vuelve a necesitar filtrar o
resaltar el recorrido, el dato ya está ahí.

### La entrada es lateral, y por qué no es `[data-reveal]`

Las entradas salen de un contenedor en `display: none`, que es justo el caso que
un IntersectionObserver no puede ver: nunca tuvieron caja para intersectar y no
la consiguen de forma confiable al aparecer. Es el mismo bug que el router de
casos tuvo desde el otro lado. Acá la entrada es una animación CSS (`enter-left`
+ `--i`), que reinicia sola cada vez que la vista se muestra.

El sentido es lateral en vez de vertical porque esta vista llega *reemplazando* a
la de al lado: el bio sale hacia la izquierda (WAAPI, 190ms) y el recorrido entra
desde la derecha. Las dos mitades viajan para el mismo lado, que es lo que hace
que se lea como un movimiento y no como dos elementos cruzándose.

**La primera pasada es la excepción y se saltea la transición.** Un `#recorrido`
compartido no tiene vista saliente — el bio nunca estuvo en pantalla — así que
animar una es mentira, y además es un rehén: una pestaña que abre en segundo
plano tiene las animaciones paradas en el frame cero, y el swap esperaría un
frame que sólo llega cuando alguien mira.

### Peso

| Qué | Antes | Ahora |
|---|---|---|
| `index.html` | 90.5KB → 20.1KB gzip | 112.2KB → **22.8KB gzip** |
| `motion.ts` compilado | 7.8KB → 2.8KB gzip | 9.1KB → **3.2KB gzip** |

Cero dependencias nuevas: los glifos ya estaban en `Icon.astro`, la flecha ya
estaba en `doodles.ts`, y las fechas se arman con dos arrays de doce strings en
vez de con `Intl` (ICU escribe los meses cortos en español con punto y deletrea
septiembre como "sept", así que la columna cargaría dos anchos de etiqueta
distintos sin motivo).
