import axios from 'axios';
import { env } from '../config/environment';
import { attachAuthInterceptors } from './authInterceptors';

export const resourceAxiosClient = axios.create({
  baseURL: env.resourceBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

attachAuthInterceptors(resourceAxiosClient);
