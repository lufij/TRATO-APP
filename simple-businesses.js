// FUNCIÓN SIMPLIFICADA PARA DEBUG
const fetchBusinessesSimple = async () => {
  try {
    console.log('🔍 INICIANDO fetchBusinesses SIMPLIFICADO...');

    const { data, error } = await supabase
      .from('sellers')
      .select('id, business_name, logo_url, is_verified')
      .not('business_name', 'is', null)
      .order('is_verified', { ascending: false });
      
    console.log('📊 Respuesta:', { data, error, count: data?.length });

    if (error) {
      console.error('❌ Error:', error);
      return [];
    }

    console.log('✅ Negocios encontrados:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('💥 Error general:', error);
    return [];
  }
};

// USAR ESTA FUNCIÓN EN LA CONSOLA DEL NAVEGADOR
// fetchBusinessesSimple().then(console.log);
