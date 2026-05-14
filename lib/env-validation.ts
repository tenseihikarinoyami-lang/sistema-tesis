export interface EnvConfig {
  isValid: boolean;
  missingKeys: string[];
  firebaseConfigured: boolean;
  aiConfigured: boolean;
}

export function validateEnv(): EnvConfig {
  const missingKeys: string[] = [];
  
  const requiredKeys = [
    'GEMINI_API_KEY',
    'GROQ_API_KEY',
    'OPENROUTER_API_KEY',
    'COHERE_API_KEY',
    'HUGGINGFACE_API_KEY',
    'REPLICATE_API_KEY',
    'FIREBASE_SERVICE_ACCOUNT',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  ];

  for (const key of requiredKeys) {
    const value = process.env[key];
    if (!value || value.includes('your_') || value.includes('undefined')) {
      missingKeys.push(key);
    }
  }

  const hasAI = !!(process.env.GEMINI_API_KEY && process.env.GROQ_API_KEY && process.env.COHERE_API_KEY) 
    && !missingKeys.includes('GEMINI_API_KEY') 
    && !missingKeys.includes('GROQ_API_KEY') 
    && !missingKeys.includes('COHERE_API_KEY');

  const hasFirebase = !!(process.env.FIREBASE_SERVICE_ACCOUNT) 
    && !missingKeys.includes('FIREBASE_SERVICE_ACCOUNT');

  return {
    isValid: missingKeys.length === 0,
    missingKeys,
    firebaseConfigured: hasFirebase,
    aiConfigured: hasAI,
  };
}

export function checkEnvOrFail(): void {
  const config = validateEnv();
  
  if (!config.isValid) {
    const envVars = config.missingKeys.join(', ');
    console.error(`[ThesisForge] Missing critical environment variables: ${envVars}`);
    console.error('[ThesisForge] Deploy will fail without these keys.');
    console.error('[ThesisForge] Please configure environment variables in Vercel dashboard.');
  }
  
  if (!config.aiConfigured) {
    console.warn('[ThesisForge] No AI API keys configured. AI generation will not work.');
  }
}

let checked = false;

export function initEnvValidation(): void {
  if (checked) return;
  checked = true;
  
  if (process.env.NODE_ENV === 'production') {
    checkEnvOrFail();
  }
}