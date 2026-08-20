import { createClient } from '@supabase/supabase-js';

const getEnvVar = (name: string): string => {
  // Try import.meta.env first
  let val = (import.meta as any).env ? (import.meta as any).env[name] : '';
  // Try process.env if available (or mapped via define configuration)
  if (!val && typeof process !== 'undefined' && process.env) {
    val = (process.env as any)[name];
  }
  return val || '';
};

// Use direct literals so Vite's static "define" replacement works flawlessly!
const supabaseUrl = 
  (import.meta as any).env?.VITE_SUPABASE_URL || 
  process.env.VITE_SUPABASE_URL || 
  '';

const supabaseAnonKey = 
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  (import.meta as any).env?.VITE_SUPABASE_ANON || 
  process.env.VITE_SUPABASE_ANON || 
  (import.meta as any).env?.VITE_SUPABASE_ANO || 
  process.env.VITE_SUPABASE_ANO || 
  '';

const cleanUrl = supabaseUrl
  .trim()
  .replace(/^['"]|['"]$/g, '')        // Remove surrounding quotes if any
  .replace(/\/+$/, '')                // Remove trailing slash
  .replace(/\/rest\/v1$/, '')         // Remove trailing /rest/v1 if pasted
  .replace(/\/+$/, '');               // Remove trailing slash again if any left

const cleanKey = supabaseAnonKey.trim().replace(/^['"]|['"]$/g, '');

export const isSupabaseConfigured = cleanUrl !== '' && cleanKey !== '' && cleanUrl.startsWith('http');

export const getMaskedUrl = () => {
  if (!cleanUrl) return 'ยังไม่ได้กำหนดค่า (กรุณาใส่ VITE_SUPABASE_URL)';
  try {
    const url = new URL(cleanUrl);
    return `${url.protocol}//${url.hostname.slice(0, 4)}***${url.hostname.slice(-8)}`;
  } catch (e) {
    return `${cleanUrl.slice(0, 10)}... (URL ไม่ถูกต้อง)`;
  }
};

export const getMaskedKey = () => {
  if (!cleanKey) return 'ยังไม่ได้กำหนดค่า (กรุณาใส่ VITE_SUPABASE_ANON_KEY)';
  if (cleanKey.length < 15) return 'รหัส Key สั้นเกินไป';
  return `${cleanKey.slice(0, 6)}...${cleanKey.slice(-6)}`;
};

// Safe, non-blocking creation
export const supabase = isSupabaseConfigured
  ? createClient(cleanUrl, cleanKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;
