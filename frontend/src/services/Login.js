import { loginClient } from './api';

export const loginUser = async (email, password) => {
  const response = await loginClient.post('/auth/login', { email, password });
  return response.data; // { access_token }
};