import type { Product } from './supabase/client';

export const mockProducts: Product[] = [];
export const mockBusinesses: any[] = [];

export function getProductsByCategory(category: string): Product[] {
  return mockProducts.filter(p => p.category === category);
}

export function searchProducts(q: string): Product[] {
  const query = q.toLowerCase();
  return mockProducts.filter(p => (p.name + ' ' + (p.description || '')).toLowerCase().includes(query));
}

let mockMode = false;
export function isMockDataMode() { return mockMode; }
export function setMockDataMode(v: boolean) { mockMode = v; }
