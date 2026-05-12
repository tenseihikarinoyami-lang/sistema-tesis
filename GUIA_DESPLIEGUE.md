# Despliegue de OBELISCO en Vercel

## Variables de Entorno

Configura estas variables en **Vercel > Settings > Environment Variables**:

### IA y Modelos
- `GEMINI_API_KEY`: Tu llave de Google AI Studio
- `GROQ_API_KEY`: Tu llave de Groq AI

### Firebase Public (Frontend)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Firebase Admin (Backend)
- `FIREBASE_SERVICE_ACCOUNT`: JSON completo del Service Account

## Pasos

1. Sube los cambios a GitHub
2. Importa el proyecto en Vercel desde GitHub
3. Configura todas las variables de entorno
4. Deploy automático

## Solución de Problemas

**Error: "múltiples servicios"**
- `.vercelignore` ignora la carpeta `backend/`
- Asegúrate de que `.vercelignore` esté en GitHub