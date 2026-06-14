import type { BloomData } from './cycle';

const API_URL = process.env.NEXT_PUBLIC_BLOOM_API_URL || '';

async function post(payload: Record<string, unknown>) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function apiRegister(username: string, password: string) {
  return post({ action: 'register', username, password });
}

export async function apiLogin(username: string, password: string) {
  return post({ action: 'login', username, password });
}

export async function apiSaveData(username: string, password: string, data: BloomData) {
  return post({ action: 'saveData', username, password, data });
}

export async function apiLoadData(username: string, password: string) {
  return post({ action: 'loadData', username, password });
}
