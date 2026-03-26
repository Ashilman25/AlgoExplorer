import { client } from './client'


export const authService = {
  register: (body) => client.post('/api/auth/register', body),
  login: (body) => client.post('/api/auth/login', body),
  logout: () => client.post('/api/auth/logout', {}),
  me: () => client.get('/api/auth/me'),
}
