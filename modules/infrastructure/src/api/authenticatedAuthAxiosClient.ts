import axios from 'axios';
import { env } from '../config/environment';
import { attachAuthInterceptors } from './authInterceptors';

// WARNING: authAxiosClient is documented as unauthenticated (OAuth token exchange, register),
// but auth-service routes for profile pictures and user batch lookup require Bearer auth on the
// same host — this is that authenticated variant, sharing resourceAxiosClient's interceptors via
// attachAuthInterceptors — verify before merging
export const authenticatedAuthAxiosClient = axios.create({
  baseURL: env.authBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

attachAuthInterceptors(authenticatedAuthAxiosClient);
