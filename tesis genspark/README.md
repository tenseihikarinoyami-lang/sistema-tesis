# ThesisForge AI v2.0 — Sistema Inteligente de Tesis

## Descripción
Sistema completo para generación de tesis y trabajos académicos con IA, diseñado para instituciones venezolanas. Cumple con normas IUTA, IUTAR, PNF y APA 7. Ahora optimizado para **Vercel** y **Neon PostgreSQL**.

## ✅ Funcionalidades Implementadas

### Autenticación y Usuarios
- Login/logout con sesiones seguras en PostgreSQL
- Admin crea usuarios con planes: 3d, 5d, 7d, 15d, 30d
- Control de expiración automático
- Aislamiento: cada usuario solo ve sus propias tesis

### Generación de Tesis con IA
- AI Router con fallback automático: **Gemini → Groq → OpenRouter**
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

## 🔑 Credenciales por Defecto (Producción)
```
Admin: admin / Admin@2024!
Demo: demo / Demo@2024!
```

## 📁 Estructura del Proyecto
```
├── api/
│   └── index.ts            # Punto de entrada Serverless para Vercel
├── src/
│   ├── index.ts            # App principal Hono + Lógica central
│   ├── lib/
│   │   ├── db.ts           # Cliente Neon PostgreSQL
│   │   ├── ai-router.ts    # Fallback multi-proveedor IA
│   │   ├── academic-engine.ts  # Motor normas venezolanas
│   │   └── ...
│   └── routes/             # Rutas de API (auth, admin, thesis)
├── migrations/
│   └── 0001_init.sql       # Esquema de base de datos SQL
├── scripts/
│   ├── migrate.ts          # Script de migración
│   └── seed.ts             # Script de datos iniciales
└── vercel.json             # Configuración de despliegue
```

## 🔧 Requerimientos (Vercel)

### Variables de Entorno
```env
POSTGRES_URL=postgresql://... (URL de Neon)
GEMINI_API_KEY=tu_key_gemini
GROQ_API_KEY=tu_key_groq
OPENROUTER_API_KEY=tu_key_openrouter
```

## 🚀 Despliegue Rápido

### 1. Preparar Base de Datos (Neon)
1. Crea un proyecto en [Neon.tech](https://neon.tech/).
2. Copia la connection string a tu `.env` como `POSTGRES_URL`.
3. Ejecuta localmente para inicializar las tablas:
   ```bash
   npm run db:setup
   ```

### 2. Desplegar en Vercel
1. Conecta tu repositorio de GitHub a Vercel.
2. Agrega las variables de entorno mencionadas arriba.
3. Vercel detectará `vercel.json` y desplegará la API automáticamente.

## 📖 Áreas de Investigación Soportadas
Informática · Producción Industrial · Administración · Contabilidad · Electrónica · Construcción Civil · Enfermería y Salud · Turismo y Hotelería · Educación · Química · Gestión Ambiental · Mecánica Industrial

## Tecnologías
- **Backend**: Hono v4 + Node.js (Vercel Serverless)
- **Base de Datos**: Neon PostgreSQL (Serverless)
- **Frontend**: HTML/CSS/JS vanilla con Tailwind CDN
- **Build**: Vite + TSX
- **IA**: Gemini 2.0 Flash, Llama 3.3 70B (Groq), Qwen 2.5 72B (OpenRouter)
