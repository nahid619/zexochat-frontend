import axios from 'axios';
import { TOKEN_STORAGE_KEY } from '../constants';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach the session token (if we have one) to every outgoing request.
// Reading straight from localStorage here, rather than importing the
// Zustand store, avoids a circular import — the store itself imports this
// client to make its API calls.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;