/**
 * SmartCare API configuration
 *
 * DEV  — Android emulator: 10.0.2.2 maps to your host machine's localhost.
 *         iOS simulator:   use 127.0.0.1 or localhost.
 *         Physical device: use your machine's LAN IP, e.g. http://192.168.1.x:8000
 *
 * PROD — set EXPO_PUBLIC_API_URL in your EAS environment variables or .env file.
 *        e.g. https://api.smartcare.health
 *
 * Expo exposes any variable prefixed with EXPO_PUBLIC_ to the JS bundle at
 * build time, so it is safe to reference here.
 */

const DEV_URL  = 'http://10.0.2.2:8000';
const PROD_URL = process.env.EXPO_PUBLIC_API_URL ?? DEV_URL;

// Use the production URL when the app is built in release/production mode,
// fall back to the dev URL during local development.
export const API_BASE: string = __DEV__ ? DEV_URL : PROD_URL;
