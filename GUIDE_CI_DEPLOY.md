# CI/CD y Deploy a Vercel

Este repo migra de Firebase Hosting (Flutter) a Vite + React + Vercel.

## 1) Limpieza de workflows duplicados
- Se eliminaron los workflows de Firebase: `firebase-hosting-merge.yml` y `firebase-hosting-pull-request.yml`.
- Se reemplazó `main.yml` por `ci.yml` con build de Node/Vite y deploy a Vercel.

## 2) Variables de entorno en GitHub (Secrets)
En GitHub > Settings > Secrets and variables > Actions > New repository secret, crear:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VERCEL_TOKEN
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID

Los dos primeros se inyectan en la fase de `npm run build` para que el cliente de Supabase quede configurado.
Los de Vercel permiten que el job de deploy publique el `dist/` preconstruido.

## 3) Configuración Vercel (vercel.json)
Ya existe `vercel.json` para SPA Vite:
- buildCommand: `npm run build`
- outputDirectory: `dist`
- rewrites para SPA y archivos estáticos (robots.txt, sitemap.xml)
- headers de caché para assets

## 4) Despliegue manual (opcional)
Si deseas desplegar localmente:
1. Instala Vercel CLI y loguéate.
2. `vercel pull` para traer entorno.
3. `npm ci && npm run build`.
4. `vercel deploy --prebuilt --prod`.

## 5) Verificación post-deploy
- Abre la URL de producción que devuelve el job de GitHub Actions (en la pestaña de Run).
- En la app, visita `/?diag=1` para correr el diagnóstico.
- Confirma que Auth de Supabase funciona (login) y que Storage carga imágenes.

## Notas
- Si no configuras los secrets, el job fallará en `Build` (por variables Vite faltantes) o en `Deploy` (por token/org/project).
- La app no necesita Firebase; todo el hosting va por Vercel.
