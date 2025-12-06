import axios from 'axios';

// Define la URL base para localhost y para producción
const LOCAL_API_BASE_URL = 'http://localhost:3000';
const ONLINE_API_BASE_URL = 'https://vps-aff6ee56.vps.ovh.ca/correo-api';

// Detecta si estás en desarrollo local
const isLocalhost =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Selecciona la URL base
export const API_BASE_URL = isLocalhost ? LOCAL_API_BASE_URL : ONLINE_API_BASE_URL;

// Crea una instancia de Axios preconfigurada
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
