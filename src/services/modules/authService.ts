import { http, extractErrorMessage } from '../httpClient';

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload { name: string; email: string; password: string; role?: string; studentId?: string; phone?: string; }

export interface AuthUser { id: string; name: string; email: string; role: string; studentId?: string; phone?: string; }

export async function login(data: LoginPayload) {
  try {
    const res = await http.post('/auth/login', data);
    return res.data;
  } catch (e) {
    throw new Error(extractErrorMessage(e));
  }
}

export async function register(data: RegisterPayload) {
  try {
    const res = await http.post('/auth/register', data);
    return res.data;
  } catch (e) {
    throw new Error(extractErrorMessage(e));
  }
}

export async function getMe() {
  try {
    const res = await http.get('/auth/me');
    return res.data.user as AuthUser;
  } catch (e) {
    throw new Error(extractErrorMessage(e));
  }
}

export async function updateProfile(payload: Partial<AuthUser>) {
  try {
    const res = await http.put('/auth/profile', payload);
    return res.data.user as AuthUser;
  } catch (e) { throw new Error(extractErrorMessage(e)); }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  try {
    const res = await http.post('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  } catch (e) { throw new Error(extractErrorMessage(e)); }
}
