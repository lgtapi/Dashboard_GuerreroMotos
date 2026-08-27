# Guerrero Motos · Panel comparativo (Next.js)

Dashboard que lee en vivo el Google Sheet `Data_GuerreroMotos` y compara
cualquier par de meses en todos los canales: Instagram, Facebook, TikTok,
WhatsApp, tráfico web, formulario de leads y encuesta post-atención.

**Una sección solo aparece en el dashboard si esa pestaña ya tiene datos
reales cargados** (no celdas "Pendiente"). Así, hoy mismo se ve Instagram,
Facebook y el formulario de leads; en cuanto agregues datos reales de
WhatsApp, TikTok, tráfico web o la encuesta post-atención, esas secciones
aparecen solas, sin tocar código.

Cuando agregas una fila nueva en el Google Sheet, el dashboard la detecta
solo — no hay que tocar código ni redeployar:

- El navegador vuelve a pedir los datos cada 30 segundos.
- Cada pestaña se lee directo desde Google Sheets, sin caché.
- El selector de meses se arma dinámicamente a partir de las fechas que
  encuentra en `Redes_LookerStudio`.

## 1. Preparar el Google Sheet

1. Comparte el Sheet como **"Cualquiera con el enlace"** con rol **Lector**.
2. Copia el ID desde la URL (`.../d/ESTE_ES_EL_ID/edit`).

Pestañas que el dashboard espera encontrar (nombres exactos):

| Pestaña | Para qué |
|---|---|
| `Redes_LookerStudio` | Comparativo cruzado por plataforma (arriba del todo) |
| `Instagram_Historico` | Tarjetas de métricas de Instagram |
| `Facebook_Historico` | Tarjetas de métricas de Facebook |
| `Facebook_Formatos` | Gráfico de formatos de contenido de Facebook |
| `TikTok_Historico` | Tarjetas de métricas de TikTok (oculto hasta tener datos) |
| `WhatsApp_Historico` | Tarjetas generales de WhatsApp (oculto hasta tener datos) |
| `WhatsApp_Canal` | Gráfico de canal de entrada de WhatsApp |
| `WhatsApp_Asesor` | Gráficos de asignación/cierre por asesor |
| `Trafico_Web_Historico` | Tarjetas de tráfico web (oculto hasta tener datos) |
| `Leads_Matriz_Meses` | Gráfico de leads por canal |
| `Campanas_Historico` | Comparativo de gasto + tarjetas de campañas de Instagram y Facebook (oculto hasta tener datos) |
| `Formulario_PostAtencion_Resumen` | Tarjetas de satisfacción post-atención (oculto hasta tener datos) |

## 2. Configurar el proyecto

```bash
npm install
cp .env.local.example .env.local
# edita .env.local y pega tu GOOGLE_SHEET_ID
npm run dev
```

Abre http://localhost:3000

## 3. Descargar como PDF

El botón "Descargar PDF" del header llama a `window.print()`. El proyecto
trae una hoja de estilos de impresión (`app/globals.css`, bloque
`@media print`) que oculta los controles interactivos y pasa el diseño a
fondo blanco / texto oscuro para que el PDF quede limpio para imprimir o
archivar. En el diálogo de impresión del navegador, elige "Guardar como
PDF".

## 4. Dejarlo siempre disponible (no solo en tu computador)

Despliega en [Vercel](https://vercel.com):

1. Sube esta carpeta a un repositorio de GitHub.
2. En Vercel: **Add New Project** → importa el repo.
3. En **Environment Variables**, agrega `GOOGLE_SHEET_ID`.
4. Deploy.

## Notas

- No se usa ninguna API key de Google ni cuenta de servicio: depende de que
  la hoja esté compartida como pública de solo lectura.
- Si quieres agregar una plataforma nueva más adelante (ej. YouTube), copia
  el patrón de `TikTok_Historico` en el Sheet y agrega una línea más de
  `<PlatformSection ... />` en `app/page.tsx` apuntando a esa pestaña — se
  autooculta sola mientras no tenga datos, igual que las demás.

