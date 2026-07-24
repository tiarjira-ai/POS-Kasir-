import jsonConfig from '../firebase-applet-config.json';

export interface FirebaseAppletConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId: string;
}

const metaEnv = (import.meta as any).env || {};

export const firebaseConfig: FirebaseAppletConfig = {
  projectId: (metaEnv.VITE_FIREBASE_PROJECT_ID as string) || jsonConfig.projectId || 'ais-asia-southeast1-aa8f2adc15',
  appId: (metaEnv.VITE_FIREBASE_APP_ID as string) || jsonConfig.appId || 'remixed-app-id',
  apiKey: (metaEnv.VITE_FIREBASE_API_KEY as string) || jsonConfig.apiKey || 'remixed-api-key',
  authDomain: (metaEnv.VITE_FIREBASE_AUTH_DOMAIN as string) || jsonConfig.authDomain || 'remixed-auth-domain',
  firestoreDatabaseId: (metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || jsonConfig.firestoreDatabaseId || 'remixed-firestore-database-id',
  storageBucket: (metaEnv.VITE_FIREBASE_STORAGE_BUCKET as string) || jsonConfig.storageBucket || 'remixed-storage-bucket',
  messagingSenderId: (metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || jsonConfig.messagingSenderId || 'remixed-messaging-sender-id',
  measurementId: (metaEnv.VITE_FIREBASE_MEASUREMENT_ID as string) || jsonConfig.measurementId || 'remixed-measurement-id',
};


export default firebaseConfig;
