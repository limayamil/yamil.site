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

### El estado actual sigue verde

El borde de `.now` conserva el verde de estado como un `rgb(47 158 95 / 0.55)`
local, pero sólo en su base: un gradiente baja desde `--color-line` arriba hasta
ese verde abajo. Lo dibuja un `::before` enmascarado de 1px para que el color
viva exclusivamente en el perímetro y no tiña el relleno translúcido del panel.
No es un olvido ni decoración, sino la señal semántica del trabajo actual. El
halo exterior también nace debajo del panel y a baja opacidad, para sostener esa
lectura sin competir con el barrido de color que lo cruza al entrar.

---

## 2. Sistema de doodles

Las marcas a mano alzada — óvalo, flecha y resaltador — se generan con
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

### La escala

Nueve pasos entre 10 y 18px, más cinco `clamp()` para lo que tiene que respirar
con el viewport. No son tokens: viven como literales en el sitio de uso, igual
que el resto de los números medidos de este proyecto. La escala está acá para
que lo próximo que se agregue caiga en un paso que ya existe en vez de inventar
el décimo.

| Paso | Dónde vive | Rol |
|---|---|---|
| `0.625rem` | `.track-tag` | El único: la píldora "Freelance" |
| `0.6875rem` | `.label`, `.lang-toggle` | Metadato en versalitas |
| `0.75rem` | `.gloss-note`, `.tool-name`, `.tile-summary`, `.case-caption` | Nota al pie, epígrafe |
| `0.8125rem` | doce lugares | **El paso de trabajo.** Todo lo secundario de la página |
| `0.875rem` | `.axis-title`, bajada de tile primario | Un escalón arriba de secundario |
| `0.9375rem` | `body`, `.track-role`, `.case-heading`, `.case-step-title` | Cuerpo, y los subtítulos que pesan como cuerpo |
| `1rem` | `.tile-title` | Título de tile terciario |
| `1.0625rem` | `.hand` | Sólo Caveat, que corre chica para su cuerpo |
| `1.125rem` | `.tile-title` secundario | El techo de lo que no es display |

Los cinco `clamp()` son el `h1`, los dos títulos de sección serif
(`.track-title`, `.case-title`), la bajada del caso y las dos cifras grandes
(`.track-stat-value`, `.case-metric-value`, que son el mismo `clamp` byte por
byte porque son la misma cifra en columnas opuestas).

### Dos pesos, y ninguno más

400 y 500. **Inter Tight es un eje variable 100-900**, así que no tener 600 ni
700 es una restricción elegida, no un límite de la fuente — vale decirlo porque
es exactamente la clase de cosa que alguien "arregla" sin saber que estaba
puesta a propósito. La jerarquía la llevan el tamaño y el color; sumarle peso
sería decir lo mismo tres veces.

Instrument Serif sí es una sola cara de 400, y `body` lleva
`font-synthesis-weight: none` para que nadie la engorde sintéticamente. Un
`font-weight` sobre `.display` o sus derivados no hace nada.

### Tracking, atado al tamaño

Seis pasos negativos, y la regla es una sola: **cuanto más grande el texto, más
cerrado**. Un cuerpo de 15px y un título de 42px con el mismo tracking no se ven
igual de apretados, se ven mal los dos.

| Tracking | Dónde |
|---|---|
| `0.08em` | `.label` — el único positivo, porque las versalitas necesitan aire |
| `-0.011em` | `body` |
| `-0.014em` | Subtítulos de 15px |
| `-0.018em` | `.tile-title` |
| `-0.024em` | Cifras grandes, tile primario |
| `-0.025em` | `.display` |
| `-0.028em` | `.case-title` |

`-0.024` y `-0.025` son en la práctica el mismo valor; están separados porque
uno lo usa la sans y el otro la serif, que a igual tamaño no se aprietan igual.

**Los dos títulos serif del sitio no son gemelos, y deberían serlo.**
`.track-title` hereda `-0.025em`/`0.98` de `.display`; `.case-title` los
redeclara en `-0.028em`/`1.08`. Son la misma jerarquía —el título de la segunda
vista de su columna— en columnas opuestas. Es deuda conocida, no criterio: si se
unifican, el que manda es `.display`.

---

## 4. Inventario de anotaciones

Once gestos. Esta tabla es la fuente de verdad: si se agrega uno, va acá.

| # | Dónde | Marca | Se dispara con |
|---|---|---|---|
| 1 | `h1`, el apellido — [Intro.astro](src/components/Intro.astro) | Óvalo (`oval`) | `.enter` del `h1` (`--i:1`) |
| 2 | A la derecha de los links de contacto | Flecha (`arrowLeft`) + nota manuscrita | `.enter` de `.intro-foot` (`--i:7`) |
| 3 | Primer término glosado del bio | Resaltador (`highlight`) | `.enter` del bio (`--i:3`) |
| 4 | Links de contacto — [Links.astro](src/components/Links.astro) | Subrayado en primario (CSS puro) | hover / focus |
| 5 | Ranura de reposo del panel de ejes — [Axes.astro](src/components/Axes.astro) | Flecha hacia arriba (`arrowUp`) + nota manuscrita | `.enter` de la columna |
| 6 | Borde inferior del hero de cada caso — [ProjectDetail.astro](src/components/ProjectDetail.astro) | Flecha (`arrowLeft`) + nota técnica manuscrita | `.case-enter` (`--i:2`) |
| 7 | Una sección elegida por caso | Flecha (`arrowUp`) + nota técnica manuscrita | `.case-enter` del cuerpo (`--i:3`) |
| 8 | Encabezado de la última sección | Resaltador (`highlight`) | `.case-enter` del cuerpo (`--i:3`) |
| 9 | Primera métrica, cuando existe | Óvalo (`oval`) | `.case-enter` de métricas (`--i:2`) |
| 10 | Una captura elegida por caso | Flecha (`arrowLeft`) + nota técnica manuscrita | `.case-enter` de galería (`--i:4`) |
| 11 | Ficha técnica del caso | Dos trazos cortos en las esquinas (CSS puro) + fondo de grilla tenue | Con el bloque |

Los cinco primeros gestos pertenecen al intro. El óvalo y el resaltador de esa
columna se renderizan una vez por idioma, porque marcan palabras distintas. Los
seis restantes forman la gramática común de los casos: tres notas específicas,
un cierre, una métrica opcional y la ficha técnica.

El texto de las notas #2 y #5 es dato, no markup: `profile.contactNote` y
`profile.restingNote` en [profile.ts](src/data/profile.ts).

Las notas #6, #7 y #10 son contenido editorial y viven junto a lo que explican
en `detail.heroNote`, `detail.sections[].note` y `detail.gallery[].note`. Cada
caso usa como máximo una de cada clase, en pares `{ es, en }` de dos a seis
palabras. No son slogans: condensan una decisión, un recorrido o un resultado.

El recorrido ([Track.astro](src/components/Track.astro), §9) tuvo una séptima
anotación — la misma flecha-más-nota que la #5, apuntando a una leyenda de tres
chips — y se sacó junto con la leyenda que anotaba. Si esa leyenda vuelve, la
marca es la misma: reusar `arrowUp`, no dibujar una nueva.

**El empleador de la línea de experiencia tuvo un resaltador y ya no.** Era la
única marca que rompía la regla de "un solo resaltador por columna" —el bio ya
trae el suyo en #3— y se sacó por una razón de dibujo, no de inventario: el
swipe sangra 0.26em de cada lado, que es exactamente lo que lo hace leer como
trazado a mano y no como un fondo, y ahí la palabra anterior es "en", a un
espacio de distancia, así que el sangrado izquierdo le caía encima. La regla de
un resaltador por columna vuelve a ser regla sin excepción.

Lo que quedó marcando ese link es lo que ya alcanzaba: color, subrayado
permanente en primario y la flecha de salida (§10). El razonamiento completo
está en el comentario de [Intro.astro](src/components/Intro.astro), donde vive
el markup que lo perdió.

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
- **Los trazos llevan `aria-hidden` sin excepción.** Un lector de pantalla
  anunciando "círculo" alrededor de un nombre es ruido. Las notas redundantes
  del intro también se ocultan; las tres notas editoriales del caso no, porque
  son contenido propio y no etiquetas del dibujo.
- **Toda animación nueva se resuelve en el bloque de `prefers-reduced-motion`.**
  Las marcas son el punto; la pluma recorriéndolas no. Con la query activa las
  marcas aparecen dibujadas y el subrayado del eje sigue atado al estado activo
  (ahí sí carga significado), simplemente sin trazarse.
- **Cuatro clases de marca, cuatro pesos visuales distintos.** La distinción es
  deliberada: ninguna compite con otra al mismo peso.

  | Clase | Componente | Dibujo | Qué significa |
  |---|---|---|---|
  | Disciplina | [Icon.astro](src/components/Icon.astro) | Trazo hairline 1.1, `currentColor`, sin relleno | Un eje: engineering, motion, ops |
  | Herramienta | [ToolIcon.astro](src/components/ToolIcon.astro) | Relleno sólido, `currentColor` | Una marca del stack |
  | Anotación | [Doodle.astro](src/components/Doodle.astro) | Trazo suelto, color propio en primario | Alguien pasó por acá y marcó esto |
  | Empresa | [CompanyLogo.astro](src/components/CompanyLogo.astro) | Wordmark ajeno, `currentColor` en `--color-primary-ink` | Dónde pasó cada tramo del recorrido |

  Los doodles son los únicos que llevan **color propio**, y eso es lo que los
  mantiene legibles como capa encima y no como más contenido. Los wordmarks son
  los únicos que llevan **forma ajena** —no los dibujamos nosotros— y por eso
  son también los únicos que no se pueden normalizar a una grilla: ver §9.

  La flecha diagonal de salida ([ExternalArrow.astro](src/components/ExternalArrow.astro))
  no es una quinta clase: son las mismas reglas de dibujo que `Icon.astro`, y su
  trabajo es de control, no de contenido. Vive en §10 con el resto de los links.

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

| Tramo | Viewport más angosto | Columna | Contenido (sin padding) | Sticky desde |
|---|---|---|---|---|
| 62–90rem | 992px | 304px | 907px | > 64.5rem (1032px) |
| 90–120rem | 1440px | 432px | 861px | ≥ 61.5rem (984px) |
| ≥ 120rem | 1920px | 576px | 774px | ≥ 55rem (880px) |

> Re-medidos cuando la línea de experiencia y su CTA pasaron a la caja `.now`.
> Lo que pagó el marco fue la copia: una sola frase que abre con su propio
> sujeto ("Ahora en…") en vez de tres palabras de preámbulo, que es un renglón
> devuelto en todos los anchos donde la redacción vieja envolvía.

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
| Markup de doodles en el HTML | 15.6KB, en 19 elementos (intro + tres casos renderizados — §4) |
| `index.html` completo | 167.9KB → **41.6KB gzip** |
| Caveat (no preloadeado, `swap`) | 47.7KB |
| `motion.ts` + `uisfx` compilado | 56.3KB → **16.9KB gzip** |
| `veil.ts` compilado | 5.4KB → **2.4KB gzip** |

Los dos entry points son todo el runtime del sitio. `veil.ts` no tiene
dependencias; `motion.ts` conserva `uisfx` deliberadamente para el feedback
sonoro opcional. El HTML creció a propósito: los casos y las catorce
entradas del recorrido viajan renderizados adentro (§8, §9).

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

La columna derecha tiene dos vistas y una sola URL: el índice (la grilla, con una
barra arriba que sólo aparece si hay un filtro puesto) y un caso abierto. Las dos
están en el HTML a la vez y `data-view` en `.projects` elige una, el mismo truco
que `html[data-lang]` hace con los dos idiomas. El hash `#caso/<slug>` es todo el
router.

### El filtro vive en la otra columna

Los tres ejes estaban escritos dos veces: como chips de capacidad a la izquierda
y como una fila de píldoras arriba de la grilla. Eran el mismo control nombrando
las mismas tres disciplinas a 60cm de distancia, y la fila se sacó en vez de
mantenerla sincronizada. Los chips de `.axes` son ahora el control:

- **Hover es preview.** Atenúa en la grilla lo que no comparte el eje
  (`.bento[data-highlight]`) y se deshace solo cuando el puntero se va. No es
  estado: no hay nada que borrar después.
- **Click es compromiso.** `aria-pressed` en el chip, `data-filter` en el bento,
  y las tiles que no entran salen del flujo. Volver a apretar el chip prendido lo
  apaga — es la única salida que tiene un puntero que nunca soltó el chip.
- **Prendido no se dibuja como hover con más fuerza.** Un hover más oscuro y un
  filtro puesto se confunden, y son cosas distintas: una se va sola y la otra no.
  El chip prendido se rellena con `--color-primary-ink` y da vuelta el texto a
  `--color-bg` (7.7:1) — el mismo tratamiento que tenía la píldora activa de la
  fila vieja, que era el único lugar de la página donde el primario es fondo.
- **Con un filtro puesto el preview se apaga.** Todo lo que quedó en la grilla ya
  es ese eje: atenuar "lo que no coincide" o no hace nada, o apaga la grilla
  entera mientras se pasea por otro chip.

Lo que queda del lado derecho es el **recibo**, no el control: qué eje está
puesto y cómo salir. Existe porque el chip que lo prendió está en una columna que
se va con el scroll, y porque un `role="status"` es la forma de que apretar algo
en una columna se anuncie en la otra. Sin filtro está `hidden`, así que la grilla
conserva su borde superior en el caso normal.

### Los tres tiers

El tamaño **es** la afirmación. No hay otra señal de jerarquía: ni badges, ni
"destacado", ni orden implícito.

| Tier | ≥62rem (3 casos/fila) | 34–62rem (2 col) | <34rem (1 col) |
|---|---|---|---|
| `primary` | 1 × 3 | 2 × 3 | fila de 8.75rem |
| `secondary` + `horizontal` | 1 × 2 | 2 × 2 | fila de 8.75rem |
| `secondary` + `vertical` | 1 × 2 | 1 × 2 | fila de 8.75rem |
| `tertiary` | 1 × 2 | 1 × 2 | fila de 8.75rem |

**Dos filas es el piso.** Un tile de una
sola fila deja los ~105px de copia sobre una astilla de arte, y al lado de un
vecino de dos filas esa astilla no se lee como "menos importante" sino como
sobra: la grilla parece rota, no jerarquizada. El piso vive en `.tile` dentro del
media query de 34rem y cada tier declara sólo lo que agrega encima.

A dos columnas la jerarquía todavía combina ancho y alto. Desde 62rem ningún caso
ocupa más de una de las tres columnas: una fila completa muestra al menos tres
casos, y `primary` conserva jerarquía con una tercera fila en lugar de ensancharse.
El resto comparte una caja compacta de dos filas.

En una sola columna el bento se vuelve lista: todos los tiers comparten una fila
de 8.75rem, la imagen sigue siendo fondo y la bajada se oculta. La jerarquía por
tamaño se recupera desde 34rem; en teléfono importa más poder recorrer los casos
rápido que sostener proporciones distintas en una columna donde los spans no
significan nada. Las proporciones base se conservan como fallback y el bloque
mobile las apaga con `aspect-ratio: auto`.

`grid-auto-flow: dense` es lo que evita que la grilla se lea como una escalera:
un tile vertical detrás de uno horizontal rellena el hueco en vez de dejarlo.
El costo es que `dense` desacopla el orden visual del orden del DOM, así que el
`order` de `projects.json` tiene que quedar cerca del orden de lectura; dense
sólo rellena huecos, no baraja.

**El índice empaqueta exacto.** Hoy son tres proyectos `secondary`; desde 62rem
cierran una fila de tres casos, todos con dos unidades de alto:

```
filas 1–2   Asofix  Gordo  Mendio
```

Agregar o sacar proyectos puede dejar una cola incompleta, y el filtrado por un
solo eje también. Está bien que así sea; ninguna tarjeta crece para llenar ese
hueco y romper el límite de un tercio del ancho.

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

El peor caso sigue siendo un frame blanco puro; el arte actual es más oscuro,
así que ese presupuesto conserva margen sin depender de una captura concreta.

**Cómo re-medirlo** si se toca el 0.93 o el sangrado de 3.5em: componer blanco
contra el alfa efectivo de las dos capas, pasar a luminancia relativa y sacar la
razón contra cada token. El chevron va aparte: está arriba del tile, donde el
scrim ya soltó, y por eso su fondo es oscuro (`rgb(18 9 6 / 0.55)`) y no un lavado
blanco, que sobre arte claro se lo llevaría puesto.

### El alto de fila

En desktop, `grid-auto-rows: clamp(7.25rem, 8.5vw, 8.5rem)` es media caja común:
con el piso de dos filas cada caso mide entre 14.5rem y 17rem. El `primary` suma
una tercera fila. Ese mínimo deja entrar eje + título + bajada sin que el scrim
se coma la imagen y achica claramente la escala anterior de 20–27rem.

### Los tiles no llevan marca

Misma razón que los ejes (§4): el tile ya tiene su propia estructura — hairline,
radio, scrim — y una anotación encima compite con eso en vez de sumarle. La
única marca del bento es el chevron, que es afordancia, no anotación.

### El encabezado del caso separa contexto y contribución

El kicker no clasifica el trabajo: dice únicamente **“Caso” + año**. El eje
(`engineering`, `motion`, `ops`) ya organiza y filtra el bento, pero dentro del
detalle repetía roles más precisos —“Front-end Development” contra “Desarrollo
front-end”, por ejemplo— y convertía el encabezado en una taxonomía duplicada.
El cliente tampoco entra ahí porque ya abre el título y, cuando existe el
recurso, vuelve como marca visual.

Los roles responden otra pregunta: **qué hice**. Por eso se leen como etiquetas
estáticas con forma de chip, después de la bajada. Usan inset-ring, sin hover ni
relleno de estado: se parecen a `.track-tag` porque son metadata, y no al `.chip`
del filtro, cuya forma tiene que comunicar que se puede accionar y quedar
prendido.

### Peso

Los tres casos actuales se renderizan en build y viajan ocultos en el HTML: sin fetch, sin
plantilla en cliente, y con JS apagado un `#caso/slug` no rompe nada. El costo es
real y está acá para que se vea:

Lo que costó **cuando aterrizó** — es historia, no el total de hoy, que vive en
§6 y es el único lugar donde se mide:

| Qué | Antes del bento | Al aterrizar |
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

Antes de las tres métricas, `GitHubActivity.astro` trae el último año de
actividad pública de `@limayamil` como SVG desde GitHub Heat. No suma runtime ni
token al sitio: la imagen carga en diferido, viaja sin referrer, usa una paleta
derivada de `--color-primary` y no expone un enlace ni el usuario en la interfaz.
Meses, días y leyenda se esconden en el SVG porque a 19rem serían ruido; el
caption bilingüe conserva el contexto aunque la imagen externa no llegue.

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

Misma clave que usan el panel de capacidades y el filtro del bento
(`Capability.icon` = `TrackEntry.axis` = `axis` en projects.json). Un valor
fuera de la unión rompe el build. Sólo llega como el glifo del nodo y una
etiqueta `sr-only`; hoy nada en esta vista filtra o resalta por él — se probaron
una leyenda de tres chips que atenuaba las filas que no compartían disciplina y
una regla por entrada con la duración a escala, y las dos se sacaron a pedido
antes de llegar a producción. La clave se dejó puesta porque es gratis y es la
que ata las tres pantallas entre sí; si alguna vuelve a necesitar filtrar o
resaltar el recorrido, el dato ya está ahí.

### Los wordmarks son la única marca que no dibujamos

La empresa de cada entrada entra como logotipo, no como texto
([CompanyLogo.astro](src/components/CompanyLogo.astro) +
[CompanyLogoSprite.astro](src/components/CompanyLogoSprite.astro) +
[company-logos.ts](src/lib/company-logos.ts)) — la cuarta clase de marca de §5,
y la única cuya forma es ajena. Van en `currentColor` sobre
`--color-primary-ink`, que es lo que las devuelve a la paleta sin pedirle a nadie
que altere su marca.

Las ocho trazas se emiten una sola vez como `<symbol>` y las catorce entradas
las reutilizan con `<use>`. Cada instancia conserva su propio `role="img"` y
`aria-label`; sólo el sprite de definiciones está oculto para accesibilidad.

**Encajarlas a una altura común fue el bug de la primera versión.** Los
wordmarks reales no comparten proporción: ECONOMIX es ~8.9:1 y Comprando en
Grupo ~1.2:1, así que una altura fija trata a todos como si fueran tan anchos
como el más ancho y achica el cuadrado a un borrón.

Lo que funciona es `width`/`height: auto` más el `aspect-ratio` que el
componente escribe inline, calculado del `viewBox` propio de cada marca y no
estimado. Con eso `max-width: 9rem` y `max-height: 1.75rem` actúan juntos como
un `object-fit: contain`: el wordmark ancho topa contra el ancho y queda bajo,
el casi-cuadrado topa contra el alto y crece en vez de encogerse. **Las tres
piezas tienen que estar** — las dos cotas y la proporción. Sacando el
`aspect-ratio`, `auto`/`auto` deja de tener con qué relacionarlas y las cotas
vuelven a recortar cada una por su lado.

Es además la única de las cuatro clases de marca que **no** va `aria-hidden`:
lleva `role="img"` y un `aria-label` con el nombre de la empresa, porque acá el
logotipo reemplazó al texto en vez de decorarlo. Un nombre de empleador que sólo
existe como dibujo es un dato perdido, no una decoración de más.

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

Igual que §8: lo que costó **cuando aterrizó**. El total de hoy está en §6.

| Qué | Antes del recorrido | Al aterrizar |
|---|---|---|
| `index.html` | 90.5KB → 20.1KB gzip | 112.2KB → **22.8KB gzip** |
| `motion.ts` compilado | 7.8KB → 2.8KB gzip | 9.1KB → **3.2KB gzip** |

Cero dependencias nuevas: los glifos ya estaban en `Icon.astro`, la flecha ya
estaba en `doodles.ts`, y las fechas se arman con dos arrays de doce strings en
vez de con `Intl` (ICU escribe los meses cortos en español con punto y deletrea
septiembre como "sept", así que la columna cargaría dos anchos de etiqueta
distintos sin motivo).

---

## 10. Controles

Todo lo que se puede tocar. La regla que ordena la sección: **la forma dice qué
hace, no cuánto importa.** Un link se ve como link en las tres columnas; lo que
cambia entre uno y otro es el peso, y el peso lo decide el trabajo que hace.

### Links: una forma y tres pesos

`.link` es la forma —`inline-flex`, y una regla en primario de 1.5px que crece
desde la izquierda en hover y en focus— y es **deliberadamente incolora**:
declara la transición de `color` sin declarar `color`, así hereda de donde caiga
y cada variante sólo tiene que decir en qué se diferencia.

| Clase | Peso | Trabajo |
|---|---|---|
| `.link` | Lo que herede | La forma base. Links inline |
| `.track-out` | `--color-muted`, 13px | La salida al pie de una lista de catorce entradas |
| `.case-link` | `--color-ink`, 15px | La URL viva del proyecto — el link más fuerte de la página |

Que `.track-out` y `.case-link` pesen distinto es a propósito: son el mismo
lugar estructural en columnas opuestas pero no el mismo pedido. Uno es una nota
al pie, el otro es lo que el caso entero está argumentando que vayas a ver. Los
dos lo **declaran**; ninguno lo hereda por descuido.

Los accesos de contacto son la excepción: `.contact-link` los convierte en
botones píldora con fondo primario, el icono del canal y, cuando corresponde,
la flecha externa. En hover y `:focus-visible` repiten el mismo barrido espectral
que cruza una vez el contenedor `.now` al entrar.

**Todo lo que sale del sitio lleva `<ExternalArrow />`.** Es regla, no decisión
por instancia — la diagonal de 8px con las mismas reglas de dibujo que
`Icon.astro`. La flecha se empuja 2px en diagonal en hover *y* en focus.

`.link-em` no es una variante sino su propia clase: el empleador de la línea de
experiencia, que además de link es el sustantivo de su oración. Tres señales a
la vez y cada una hace algo distinto — el color dice "este es el dato", el
subrayado permanente dice "esto es un link" antes de cualquier hover, y en hover
sube de `--color-primary` a `--color-primary-ink` sin que el texto baje nunca de
4.5:1. Tuvo un resaltador y lo perdió; el porqué está en §4.

**`.gloss` se parece a un link y no lo es**, y la diferencia está dibujada:
subrayado punteado de **1px** contra los 1.5px sólidos de `.link-em`, y
`cursor: help`. Es la señal de que abre una nota, no de que navega.

### Botones: cinco registros

| Control | Forma | Dónde |
|---|---|---|
| `.axis` | Fila con borde inferior, glifo + título + chevron que aparece | Lista de capacidades |
| `.chip` | Píldora — el mismo `.axis` cuando es uno de un conjunto | Filtro del bento |
| `.filter-clear` | Píldora con inset-ring y lavado | El recibo del filtro, columna derecha |
| `.case-back` | Texto pelado con chevron que se corre 3px | "Volver", en las dos columnas |
| `.lang-option` | Texto pelado, faint → ink | ES / EN |
| `.skip-link` | Bloque invertido sólido | Salta al contenido, sólo con foco |

`.chip` **cabalga sobre `.axis`** y cada regla suya cancela algo que `.axis`
hace, así que tiene que quedar después en el archivo: las dos tienen la misma
especificidad y lo único que las ordena es el orden de fuente. Es frágil por
construcción y está anotado en el CSS.

El chip prendido se rellena con `--color-primary-ink` y da vuelta el texto a
`--color-bg` (7.7:1). Es el único lugar de la página donde el primario es fondo,
y el porqué está en §8: un filtro puesto no se puede dibujar como un hover más
fuerte, porque uno se va solo y el otro no.

### Tres recetas de píldora, y es una de más

Las tres tienen el mismo radio (`999px`, que sí es coherente) y tres bordes
distintos:

| Control | Borde | Fondo |
|---|---|---|
| `.chip` | `border: 1px solid var(--color-line)` | — |
| `.filter-clear` | `box-shadow: inset 0 0 0 1px var(--color-line)` | `rgb(255 255 255 / 0.04)` |
| `.track-tag`, `.case-roles li` | `box-shadow: inset 0 0 0 1px var(--color-line)` | — |

`.chip` y `.filter-clear` son **la misma interacción** —poner el filtro, sacar
el filtro— en columnas opuestas, y no se parecen. `.track-tag` y los roles del
caso ni siquiera son controles: son etiquetas y comparten receta. Es deuda
conocida y está acá para que se vea; si se unifica, el inset-ring es el que gana,
porque no ocupa caja.

### Focus

Anillo global: `outline: 2px solid var(--color-ink)` con `outline-offset: 3px`,
y **sin `border-radius` propio**. Tener uno ablandaba la esquina de los links
inline, pero le ganaba al radio del elemento enfocado: cada píldora y cada tile
cuadraba sus esquinas al recibir foco de teclado. El navegador ya dibuja el
anillo siguiendo el radio que el elemento tenga.

**Todo gesto de hover tiene su gemelo en `:focus-visible`**, con dos huecos que
son deliberados:

- **Los nombres de herramienta** arriba de 62rem sólo se revelan con hover
  (`.tool-name` es `display: none` ahí y el tooltip es el `<title>` del SVG).
  Las marcas no son enfocables a propósito: el panel es `aria-hidden` y cada
  botón de eje ya lista su stack completo como texto `sr-only`, así que un
  lector de pantalla tiene el dato y hacerlas enfocables lo diría dos veces. El
  hueco es sólo para el teclado vidente, y abajo de 62rem no existe: ahí los
  nombres se ven como texto, porque un teléfono no tiene hover con qué
  alcanzar un tooltip.
- **`.track-entry:hover .track-node`** no tiene gemelo porque no hay nada que
  enfocar: una entrada del recorrido es contenido, no un control.

### Radios

Ocho valores. Las píldoras son coherentes; los paneles no tanto.

| Valor | Dónde |
|---|---|
| `6px` | `.skip-link` |
| `8px` | `.gloss-note` |
| `12px` / `0.75rem` | `.case-shot img` / `.now` — **el mismo número en dos unidades** |
| `14px` | `.tile`, `.case-hero` |
| `50%` | `.track-node` |
| `999px` | Las cuatro píldoras |

---

## 11. Motion

### Dos curvas, y nada más

| Token | Valor | Para qué |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Todo lo que **entra o se mueve**: transforms, revelados, FLIPs |
| `--ease-io` | `cubic-bezier(0.65, 0, 0.35, 1)` | Todo lo que **cambia de estado**: color, opacidad |

**No hay una sola keyword suelta en las 2500 líneas de `global.css`** — ni
`ease`, ni `linear`, ni un cubic-bezier inline. Eso es contrato, no casualidad:
una curva nueva es una decisión de diseño y tiene que pasar por acá.

La división es la regla que hay que sostener: si se mueve, `--ease-out`; si sólo
cambia, `--ease-io`.

### La escalera de duraciones

Estos son los pasos que hay hoy. **La escalera tiene dos irregularidades y están
marcadas**, porque lo próximo que se agregue tiene que agarrarse de un paso que
ya existe:

| Gesto | Paso canónico | Irregularidad |
|---|---|---|
| Cambio de color | `0.3s` | Convive con `0.35s`. **No es por columna:** los controles del núcleo (`.link`, `.axis`, `.chip`, `.lang-option`) quedaron en `0.35s` y todo lo que se agregó después —panel de herramientas, recorrido, filtro, caso— usa `0.3s`. Es una escalera vieja y una nueva |
| Empujón de 2–3px | `0.45s` | Corre a `0.4s`, `0.45s` y `0.5s` según el componente |
| Opacidad de estado | `0.3s` – `0.4s` | — |
| Zoom de media en tile | `0.7s` | Sale a destiempo de lo que dispara con él (título `0.5s`, chevron `0.4s`): la tarjeta resuelve en tres tiempos |
| Revelado por scroll | `0.85s` | — |
| Entrada `.enter` | `0.9s` | `.case-enter` toca el mismo keyframe a `0.7s` |
| Entrada lateral del recorrido | `0.7s` | — |

Lo que maneja `motion.ts` con la Web Animations API va aparte, porque son
gestos de una sola vez y no estados:

| Gesto | Duración | Curva |
|---|---|---|
| Re-empaquetado del bento (FLIP) | `520ms` | `--ease-out` |
| Apertura de un caso (FLIP del hero) | `560ms` | `--ease-out` |
| Swap bio ↔ recorrido | `190ms` | `--ease-io` |
| Fundido corto | `160ms` | — |

Si hay que elegir para algo nuevo: **`0.3s` para color, `0.45s` para movimiento
chico.** Son los que más se repiten, y son el lado nuevo de la escalera.

### Stagger

Tres pasos, y cada uno pertenece a una entrada distinta:

| Paso | Offset | Qué escalona |
|---|---|---|
| `45ms` | `120ms` | Entradas del recorrido; tiles del bento (sin offset) |
| `60ms` | `180ms` | Bloques de un caso |
| `65ms` | `60ms` | Bloques del intro; doodles, con `700ms` de offset |

Los doodles arrancan tarde a propósito: anotar algo antes de que exista se lee
al revés (§2).

### `prefers-reduced-motion`

El contrato, que ya está implementado y hasta acá sólo vivía como una regla de
§5: **toda animación nueva se resuelve en ese bloque.** Con la query activa las
marcas aparecen dibujadas, los tiles y las entradas aparecen puestos, el shader
dibuja un frame y para (§7), y el stagger se va a cero. Lo que se pierde es el
recorrido de la pluma; lo que se conserva es todo lo que significaba algo.
