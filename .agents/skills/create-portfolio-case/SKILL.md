---
name: create-portfolio-case
description: Crear o actualizar casos de éxito bilingües del portfolio, sus imágenes y logos de cliente. Usar cuando el usuario entregue una imagen principal, capturas adicionales, recursos de marca e información de un proyecto para convertir `docs/case-template.json` en una entrada real de `src/data/projects.json`, mantener la grilla, optimizar los recursos y validar el sitio Astro.
---

# Crear un caso de portfolio

Convertir la información y las imágenes entregadas por el usuario en un caso completo, bilingüe y listo para producción. Trabajar dentro del repositorio actual y tratar `docs/case-template.json` como contrato editorial.

## 1. Inspeccionar antes de editar

1. Localizar la raíz que contiene `docs/case-template.json`.
2. Leer completos:
   - `docs/case-template.json`.
   - `src/content.config.ts`.
   - `src/data/projects.json`.
   - `CLAUDE.md`, si existe.
3. Inspeccionar las imágenes y logos entregados; obtener formato, dimensiones y peso.
4. Revisar `ProjectCard.astro` y `ProjectDetail.astro` solo si el schema o la presentación no están claros.

No modificar la plantilla. Usarla para construir la entrada real, pero tomar `src/content.config.ts` como autoridad para campos opcionales más nuevos que todavía no estén documentados en la plantilla.

## 2. Elegir el espacio del caso

- Contar los casos destacados y respetar el presupuesto de la grilla documentado por el proyecto.
- No borrar un caso real para abrir espacio.
- Los tres casos actuales son `secondary` y cierran una fila de tres columnas en desktop. Si sumar otro caso rompe la composición solicitada, pedir una decisión antes de cambiar tiers u orden.
- Crear un `id` único, descriptivo y en kebab-case.

## 3. Redactar el contenido

- Completar todos los textos visibles como pares `{ es, en }`.
- Escribir primero una versión española natural y concisa; traducirla al inglés sin literalidad torpe.
- Mantener `summary` en una oración apta para la tarjeta.
- Organizar el detalle, cuando la información lo permita, en:
  1. problema o punto de partida;
  2. solución o implementación;
  3. trazabilidad, proceso o decisiones relevantes;
  4. resultado.
- Elegir `axis` únicamente entre `engineering`, `motion` y `ops`, según el trabajo predominante.
- Usar `roles` para las disciplinas realmente ejercidas.
- Incluir en `facts` rol, stack, alcance, flujo o duración solo cuando estén respaldados por la información recibida.
- Usar métricas únicamente si el usuario dio el dato. No inventar porcentajes, ahorros, tiempos ni resultados.
- Si un dato imprescindible como el año no puede inferirse con seguridad, pedirlo. Resolver por criterio editorial cualquier detalle no crítico.

## 4. Preparar las imágenes

- Usar la imagen principal como `poster`.
- Incorporar las imágenes restantes en `detail.gallery`, en el orden entregado.
- Escribir `alt` descriptivo en español e inglés. Añadir `caption` solo cuando aporte contexto; no repetir el título.
- Usar `wide: true` para capturas panorámicas o piezas que necesiten legibilidad a ancho completo.
- Generar nombres en kebab-case dentro de `public/media/`, con el cliente y la función de la imagen.
- Normalizar cada poster y captura raster a un WebP canónico de 1920×1080 con `scripts/optimize-image.mjs`:

```powershell
node .agents/skills/create-portfolio-case/scripts/optimize-image.mjs <entrada> <salida.webp>
```

El script limita el ancho a 1920 px y usa calidad 82 de forma predeterminada. Si la fuente no está en 16:9, resolver el encuadre antes: las dimensiones intrínsecas del sitio asumen 1920×1080. Conservar los originales en `procesar/`; no reemplazarlos ni borrarlos.

- Para cada WebP canónico publicado, generar también las dos variantes que consume la grilla. No agregar estos campos al schema: `ProjectCard.astro` deriva sus URLs automáticamente.

```powershell
node .agents/skills/create-portfolio-case/scripts/optimize-image.mjs public/media/nombre.webp public/media/nombre-card-640.webp --width 640
node .agents/skills/create-portfolio-case/scripts/optimize-image.mjs public/media/nombre.webp public/media/nombre-card-960.webp --width 960
```

### Logos de cliente

- Si el usuario entrega uno o más logos y el schema expone `detail.clientLogos`, incorporarlos allí; no relegarlos a la galería.
- Conservar SVG como vector y publicarlo en `public/media/logos/` con un nombre kebab-case. Convertir a WebP únicamente los logos raster.
- Cada entrada usa `{ "src": "/media/logos/cliente.svg", "alt": "Nombre del cliente" }`. `alt` es un nombre propio sin par bilingüe.
- No inventar variantes ni separar un lockup en piezas salvo que los archivos entregados ya las incluyan.
- Omitir `clientLogos` cuando no haya recursos de marca; el schema lo completa como arreglo vacío.

## 5. Integrar el caso

- Actualizar solo la entrada elegida de `src/data/projects.json`.
- Mantener el JSON en UTF-8 y preservar caracteres españoles; comprobar que no aparezcan `?` de reemplazo.
- No añadir `_readme` ni campos ajenos al schema.
- Omitir `video` y `link` si el usuario no los proporcionó.
- Incluir `detail.clientLogos` cuando el usuario haya entregado logos y el schema lo admita.
- Evitar duplicar el poster en la galería salvo que el usuario lo pida.
- No cambiar componentes, estilos o rutas salvo que el nuevo contenido lo exija realmente.

## 6. Validar

1. Parsear `src/data/projects.json` y confirmar que el nuevo `id`, el poster, la galería, cada par `*-card-640.webp` / `*-card-960.webp` y cada `clientLogos[].src` existen.
2. Ejecutar `npm run test`.
3. Ejecutar `npm run check`.
4. Ejecutar `npm run build`.
5. Confirmar en `dist/index.html` que aparecen el `data-case`, las rutas WebP y los textos con Unicode correcto.
6. Revisar `git diff --check` y el diff del caso; no mezclar cambios ajenos.

Entregar un resumen breve con el slug creado o reemplazado, las imágenes y logos publicados, la reducción de peso y el estado de las validaciones.
