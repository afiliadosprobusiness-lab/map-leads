/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_FUNCTIONS_REGION?: string;
  readonly VITE_SUPERADMIN_EMAIL?: string;
  readonly VITE_PAYPAL_STARTER_URL?: string;
  readonly VITE_PAYPAL_GROWTH_URL?: string;
  readonly VITE_PAYPAL_PRO_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
