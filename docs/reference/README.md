# Referencia

Material de origen. **Nada de acá se compila ni se publica** — está excluido en
`tsconfig.json` justamente porque no puede type-checkear: son archivos escritos
contra dependencias que este proyecto no tiene.

| Archivo | Qué es |
|---|---|
| `solar-veil-background.tsx` | El componente React + `ogl` del que salió el shader del fondo. Se conserva por el preset completo y por los ~40 uniforms del uber-shader original, de los que [src/scripts/veil.ts](../../src/scripts/veil.ts) sólo quedó con el camino que ese preset realmente ejecutaba. |

Vivía en `public/procesar/`, donde Astro lo copiaba tal cual y terminaba
sirviéndose el `.tsx` crudo desde `dist/`.
