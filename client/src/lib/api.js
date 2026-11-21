import axios from 'axios';

export const api = axios.create({ baseURL: '/api', timeout: 10000 });

export function errorMessage(error) {
  const detail = error.response?.data?.error ?? error.response?.data?.message;
  return typeof detail === 'string' ? detail : 'Could not connect to VoySync. Check that the server is running and try again.';
}
