Despliegue en Vercel (Vite + React)

Requisitos
- Cuenta Vercel conectada a GitHub
- Repositorio en GitHub con este código

Variables de entorno (Project Settings > Environment Variables)
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Build & Output Settings (en Vercel)
- Framework Preset: Vite
- Build Command: npm run build
- Install Command: npm install
- Output Directory: dist

SPA routing
- Incluido vercel.json con fallback a /index.html

Pasos
1. git init (si corresponde) y push a tu repo GitHub
2. En Vercel, Import Project > selecciona tu repo
3. Configura variables y despliega

Notas
- No se modificó ningún aspecto visual; solo configuración de despliegue.
