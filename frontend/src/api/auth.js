const TOKEN_KEY = 'shoumingapp_token';
const USER_KEY = 'shoumingapp_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function login(username, pin) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '登录失败');
  return data; // { token, user }
}

export async function logout(token) {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createUser(name, username, pin, token) {
  const res = await fetch('/api/auth/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name, username, pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '创建失败');
  return data;
}

export async function changePin(currentPin, newPin, token) {
  const res = await fetch('/api/auth/pin', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ current_pin: currentPin, new_pin: newPin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '修改失败');
  return data;
}
