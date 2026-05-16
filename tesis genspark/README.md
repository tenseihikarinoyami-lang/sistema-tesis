# ThesisForge AI v2.0 — Sistema Inteligente de Tesis

## Descripción
Sistema completo para generación de tesis y trabajos académicos con IA, diseñado para instituciones venezolanas. Cumple con normas IUTA, IUTAR, PNF y APA 7.

## ✅ Funcionalidades Implementadas

### Autenticación y Usuarios
- Login/logout con sesiones D1
- Admin crea usuarios con planes: 3d, 5d, 7d, 15d, 30d
- Control de expiración automático
- Aislamiento: cada usuario solo ve sus propias tesis

### Generación de Tesis con IA
- AI Router con fallback automático: **Gemini → Groq → OpenRouter → Cohere**
- Generación por capítulos (sin agotar cuota)
- Normas venezolanas integradas por sección:
  - Capítulo I: El Problema (embudo contextual + objetivos)
  - Capítulo II: Marco Teórico/Referencial (antecedentes APA)
  - Capítulo III: Metodología (diseño, tipo, nivel, población)
  - Capítulo IV: Resultados (cuadros de frecuencia)
  - Capítulo V/VI: Propuesta (factibilidad técnica, operativa, económica)
- Voz pasiva refleja automática
- Párrafos de 5-12 líneas

### Instituciones y Normas
- **IUTA**: Times New Roman 12, márgenes 3/2.5cm, interlineado 1.5
- **IUTAR**: Arial 12, márgenes 3/2.5cm, interlineado 1.5
- **PNF**: Arial 12, márgenes 4/3cm, interlineado 1.5

### Buscador Académico
- Búsqueda en Semantic Scholar
- Validación de DOI con Crossref
- Formato APA 7 automático
- Copiar citas con un click

### Exportación
- Export a HTML formateado (abre en Word → Guardar como .docx)
- Portada institucional venezolana
- Resumen automático con IA
- Referencias bibliográficas incluidas

### Panel Admin
- Dashboard con estadísticas
- Crear/editar/desactivar usuarios
- Ver todas las tesis del sistema
- Log de actividad reciente

## 🌐 URLs
- **Aplicación**: https://3000-iqoo7e6ocms3iofuwvr39-5634da27.sandbox.novita.ai
- **Health**: /api/health

## 🔑 Credenciales por Defecto
```
Admin: admin / Admin2024!
```

## 📁 Estructura del Proyecto
```
webapp/
├── src/
│   ├── index.tsx          # App principal + UI SPA completa
│   ├── lib/
│   │   ├── auth.ts         # Autenticación con Web Crypto
│   │   ├── ai-router.ts    # Fallback multi-proveedor IA
│   │   ├── academic-engine.ts  # Motor normas venezolanas
│   │   ├── citation-validator.ts  # Crossref + Semantic Scholar
│   │   └── docx-generator.ts  # Exportación HTML/DOCX
│   └── routes/
│       ├── auth.ts         # /api/auth/*
│       ├── admin.ts        # /api/admin/*
│       └── thesis.ts       # /api/thesis/*
├── migrations/
│   └── 0001_init.sql      # Schema D1
└── ecosystem.config.cjs   # PM2
```

## 🔧 API Endpoints

### Auth
- `POST /api/auth/login` — Iniciar sesión
- `POST /api/auth/logout` — Cerrar sesión
- `GET /api/auth/me` — Usuario actual

### Admin
- `GET /api/admin/users` — Listar usuarios
- `POST /api/admin/users` — Crear usuario
- `PUT /api/admin/users/:id` — Editar usuario
- `DELETE /api/admin/users/:id` — Eliminar usuario
- `GET /api/admin/stats` — Estadísticas

### Thesis
- `GET /api/thesis` — Listar proyectos
- `POST /api/thesis` — Crear proyecto
- `GET /api/thesis/:id` — Ver proyecto
- `POST /api/thesis/:id/generate-chapter` — Generar capítulo
- `POST /api/thesis/:id/generate-resumen` — Generar resumen
- `PUT /api/thesis/:id/chapters/:chapterId` — Editar capítulo
- `POST /api/thesis/:id/export` — Exportar documento
- `DELETE /api/thesis/:id` — Eliminar proyecto
- `POST /api/thesis/citations/search` — Buscar citas
- `POST /api/thesis/citations/validate-doi` — Validar DOI

## 🔐 Variables de Entorno Requeridas (para producción)
```env
GEMINI_API_KEY=tu_key_gemini
GROQ_API_KEY=tu_key_groq  
OPENROUTER_API_KEY=tu_key_openrouter
COHERE_API_KEY=tu_key_cohere
```

## 🚀 Deploy en Cloudflare
```bash
# 1. Crear DB
npx wrangler d1 create thesisforge-production

# 2. Actualizar wrangler.jsonc con el database_id

# 3. Aplicar migraciones
npm run db:migrate:prod

# 4. Deploy
npm run deploy

# 5. Configurar secrets
npx wrangler pages secret put GEMINI_API_KEY --project-name thesisforge
npx wrangler pages secret put GROQ_API_KEY --project-name thesisforge
npx wrangler pages secret put OPENROUTER_API_KEY --project-name thesisforge
```

## 📖 Áreas de Investigación Soportadas
Informática · Producción Industrial · Administración · Contabilidad · Electrónica · Construcción Civil · Enfermería y Salud · Turismo y Hotelería · Educación · Química · Gestión Ambiental · Mecánica Industrial

## Tecnologías
- **Backend**: Hono v4 + TypeScript en Cloudflare Workers
- **Base de Datos**: Cloudflare D1 (SQLite)
- **Frontend**: HTML/CSS/JS vanilla con Tailwind CDN
- **Build**: Vite + @hono/vite-cloudflare-pages
- **IA**: Gemini 2.0 Flash, Llama 3.3 70B (Groq), Qwen 2.5 72B (OpenRouter), Command R+ (Cohere)
