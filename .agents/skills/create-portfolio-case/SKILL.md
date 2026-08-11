---
name: create-portfolio-case
description: Crear o actualizar casos de éxito bilingües del portfolio y sus imágenes. Usar cuando el usuario entregue una imagen principal, capturas adicionales e información de un proyecto para convertir `docs/case-template.json` en una entrada real de `src/data/projects.json`, reemplazar un placeholder sin romper la grilla, optimizar los recursos a WebP y validar el sitio Astro.
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
3. Inspeccionar las imágenes entregadas y obtener formato, dimensiones y peso.
4. Revisar `ProjectCard.astro` y `ProjectDetail.astro` solo si el schema o la presentación no están claros.

No modificar la plantilla. Usarla para construir la entrada real.

## 2. Elegir el espacio del caso

- Contar los casos destacados y respetar el presupuesto de la grilla documentado por el proyecto.
- Si existen placeholders y la grilla tiene nueve posiciones cerradas, reemplazar el placeholder temáticamente más cercano. Conservar su `tier`, `shape` y `order` para no alterar el empaquetado.
- No borrar un caso real para abrir espacio.
- Si no quedan placeholders y sumar otro caso rompe la grilla, pedir una decisión antes de cambiar la composición.
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
- Convertir imágenes raster a WebP con `scripts/optimize-image.mjs`:

```powershell
node .agents/skills/create-portfolio-case/scripts/optimize-image.mjs <entrada> <salida.webp>
```

El script limita el ancho a 1920 px y usa calidad 82 de forma predeterminada. Conservar los originales en `procesar/`; no reemplazarlos ni borrarlos.

## 5. Integrar el caso

- Actualizar solo la entrada elegida de `src/data/projects.json`.
- Mantener el JSON en UTF-8 y preservar caracteres españoles; comprobar que no aparezcan `?` de reemplazo.
- No añadir `_readme` ni campos ajenos al schema.
- Omitir `video` y `link` si el usuario no los proporcionó.
- Evitar duplicar el poster en la galería salvo que el usuario lo pida.
- No cambiar componentes, estilos o rutas salvo que el nuevo contenido lo exija realmente.

## 6. Validar

1. Parsear `src/data/projects.json` y confirmar que el nuevo `id`, el poster y la galería existen.
2. Ejecutar `npm run check`.
3. Ejecutar `npm run build`.
4. Confirmar en `dist/index.html` que aparecen el `data-case`, las rutas WebP y los textos con Unicode correcto.
5. Revisar `git diff --check` y el diff del caso; no mezclar cambios ajenos.

Entregar un resumen breve con el slug creado o reemplazado, las imágenes generadas, la reducción de peso y el estado de las validaciones.