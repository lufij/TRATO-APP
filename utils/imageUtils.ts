import { supabase } from './supabase/client';

/**
 * Convierte una ruta de storage de Supabase a una URL pública completa
 */
export function getSupabaseImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  
  // Si ya es una URL completa, devolverla tal como está
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Si es una ruta de storage de Supabase, construir la URL pública
  if (path.startsWith('business-logos/') || path.startsWith('avatars/') || path.startsWith('products/')) {
    const bucket = path.startsWith('business-logos/') ? 'business-logos' : 
                   path.startsWith('avatars/') ? 'avatars' : 'products';
    
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
  
  // Si es solo el nombre del archivo, asumir que está en business-logos
  if (!path.includes('/')) {
    const { data } = supabase.storage.from('business-logos').getPublicUrl(path);
    return data.publicUrl;
  }
  
  return path;
}

/**
 * Obtiene la mejor imagen disponible para un comercio
 */
export function getBusinessImageUrl(business: { logo_url?: string; user?: { avatar_url?: string } }): string | null {
  // Priorizar logo_url del negocio
  if (business.logo_url) {
    return getSupabaseImageUrl(business.logo_url);
  }
  
  // Usar avatar del usuario como fallback
  if (business.user?.avatar_url) {
    return getSupabaseImageUrl(business.user.avatar_url);
  }
  
  return null;
}

/**
 * Obtiene la URL de imagen de un producto
 */
export function getProductImageUrl(product: { image_url?: string }): string | null {
  if (!product.image_url) return null;
  return getSupabaseImageUrl(product.image_url);
}

/**
 * Procesa cualquier URL de imagen para uso en componentes
 * Alias para getSupabaseImageUrl para compatibilidad
 */
export function processImageUrl(url: string | null | undefined): string | null {
  return getSupabaseImageUrl(url);
}