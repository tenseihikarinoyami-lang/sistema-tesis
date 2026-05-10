# 🚀 Guía de Despliegue en Vercel - OBELISCO

He migrado el backend de Python directamente a **Next.js API Routes**. Esto significa que ya no necesitas un servidor separado (como Render); ahora todo funciona dentro de Vercel de manera gratuita, rápida y estable.

## 🛠️ Requisitos Previos

1. Una cuenta en [Vercel](https://vercel.com/).
2. Tu proyecto subido a un repositorio de **GitHub**.
3. Acceso a tu consola de **Firebase**.
4. Una API Key de **Google AI Studio (Gemini)**.

---

## 🔑 Variables de Entorno (API Keys) que debes agregar en Vercel

Cuando configures el proyecto en Vercel, ve a **Settings > Environment Variables** y agrega las siguientes:

### 1. Google Gemini
*   `GEMINI_API_KEY`: Tu llave de Google AI Studio.

### 2. Firebase Public Keys (Frontend)
Estas ya las tienes en tu archivo `.env` local:
*   `NEXT_PUBLIC_FIREBASE_API_KEY`
*   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
*   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
*   `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
*   `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
*   `NEXT_PUBLIC_FIREBASE_APP_ID`

### 3. Firebase Admin SDK (Backend) - **CRUCIAL**
Para que el servidor pueda escribir en la base de datos sin errores de permisos, necesitas el **Service Account JSON**:

1. Ve a **Firebase Console > Project Settings > Service Accounts**.
2. Haz clic en **Generate New Private Key**. Se descargará un archivo `.json`.
3. Abre ese archivo, copia todo su contenido (el JSON completo).
4. En Vercel, crea una variable llamada:
    *   `FIREBASE_SERVICE_ACCOUNT`: (Pega aquí todo el contenido del JSON).

---

## 🚀 Pasos para Subir a Vercel

1. **Subir cambios a GitHub:**
   Asegúrate de que todos los archivos nuevos que creé (`app/api/thesis/...`, `lib/academic-engine.ts`, etc.) estén en tu repositorio.

2. **Importar en Vercel:**
   *   Haz clic en **"Add New" > "Project"**.
   *   Selecciona tu repositorio de GitHub.
   *   En la sección **"Environment Variables"**, agrega todas las llaves mencionadas arriba.

3. **Desplegar:**
   *   Haz clic en **"Deploy"**. Vercel detectará automáticamente que es un proyecto de Next.js.

---

## 💡 ¿Por qué esta solución es mejor?

*   **Gratis Total:** No pagas por un servidor backend aparte.
*   **Sin Latencia:** Al estar todo en Vercel, la comunicación es instantánea.
*   **Estabilidad:** He implementado una técnica de **Orquestación Secuencial**. En lugar de pedirle a Vercel que haga toda la tesis en un solo proceso (que fallaría por el límite de 10 segundos), el sistema ahora genera capítulo por capítulo de forma inteligente.
*   **Fácil Mantenimiento:** Solo tienes un proyecto que gestionar.

---

**¡Listo! Con esto tu sistema OBELISCO estará en producción y funcionando perfectamente.**
