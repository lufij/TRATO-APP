import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';

interface VerificationStatus {
  locationVerified: boolean;
  businessLocationVerified: boolean;
  profileCompleted: boolean;
  canPublish: boolean;
  canPurchase: boolean;
  canWork: boolean;
  requirements: {
    phone: boolean;
    profileImage: boolean;
    coverImage: boolean;
    location: boolean;
    businessLocation: boolean;
    vehicleType: boolean;
    licenseNumber: boolean;
    adminApproval: boolean;
  };
}

export function useVerificationStatus(userRole: 'comprador' | 'vendedor' | 'repartidor') {
  const { user } = useAuth();
  const [status, setStatus] = useState<VerificationStatus>({
    locationVerified: false,
    businessLocationVerified: false,
    profileCompleted: false,
    canPublish: false,
    canPurchase: false,
    canWork: false,
    requirements: {
      phone: false,
      profileImage: false,
      coverImage: false,
      location: false,
      businessLocation: false,
      vehicleType: false,
      licenseNumber: false,
      adminApproval: false
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkStatus();
    }
  }, [user, userRole]);

  const checkStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Obtener datos del usuario
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      let sellerData = null;
      if (userRole === 'vendedor') {
        const { data, error } = await supabase
          .from('sellers')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (!error) sellerData = data;
      }

      // Verificar requisitos específicos por rol
      const requirements = {
        phone: !!(userData.phone && userData.phone.trim() !== ''),
        profileImage: !!(userData.profile_image_url && userData.profile_image_url.trim() !== ''),
        coverImage: userRole === 'vendedor' ? !!(sellerData?.cover_image_url && sellerData.cover_image_url.trim() !== '') : true,
        location: !!(userData.location_verified && userData.latitude && userData.longitude && userData.address),
        businessLocation: userRole === 'vendedor' ? !!(sellerData?.business_location_verified && sellerData.business_latitude && sellerData.business_longitude && sellerData.business_address) : true,
        vehicleType: userRole === 'repartidor' ? !!(userData.vehicle_type && userData.vehicle_type !== 'No especificado') : true,
        licenseNumber: userRole === 'repartidor' ? !!(userData.license_number && userData.license_number !== 'No especificado') : true,
        adminApproval: userRole === 'repartidor' ? !!(userData.is_verified && userData.is_active) : true
      };

      // Verificar si puede realizar acciones
      let canDoAction = false;
      if (userRole === 'vendedor') {
        const { data, error } = await supabase.rpc('check_seller_can_publish', {
          seller_user_id: user.id
        });
        if (!error) canDoAction = data;
      } else if (userRole === 'comprador') {
        const { data, error } = await supabase.rpc('check_buyer_can_purchase', {
          buyer_user_id: user.id
        });
        if (!error) canDoAction = data;
      } else if (userRole === 'repartidor') {
        const { data, error } = await supabase.rpc('check_driver_can_work', {
          driver_user_id: user.id
        });
        if (!error) canDoAction = data;
      }

      setStatus({
        locationVerified: userData.location_verified || false,
        businessLocationVerified: sellerData?.business_location_verified || false,
        profileCompleted: userData.profile_completed || false,
        canPublish: userRole === 'vendedor' ? canDoAction : false,
        canPurchase: userRole === 'comprador' ? canDoAction : false,
        canWork: userRole === 'repartidor' ? canDoAction : false,
        requirements
      });

    } catch (error) {
      console.error('Error checking verification status:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = () => {
    checkStatus();
  };

  const getCompletionPercentage = () => {
    const totalRequirements = Object.values(status.requirements).length;
    const completedRequirements = Object.values(status.requirements).filter(Boolean).length;
    return Math.round((completedRequirements / totalRequirements) * 100);
  };

  const getMissingRequirements = () => {
    const missing: string[] = [];
    
    if (!status.requirements.phone) missing.push('Teléfono');
    if (!status.requirements.profileImage) missing.push('Foto de perfil');
    if (!status.requirements.location) missing.push('Ubicación verificada');
    
    if (userRole === 'vendedor') {
      if (!status.requirements.coverImage) missing.push('Foto de portada');
      if (!status.requirements.businessLocation) missing.push('Ubicación del negocio');
    }
    
    if (userRole === 'repartidor') {
      if (!status.requirements.vehicleType) missing.push('Tipo de vehículo');
      if (!status.requirements.licenseNumber) missing.push('Número de licencia');
      if (!status.requirements.adminApproval) missing.push('Aprobación del administrador');
    }
    
    return missing;
  };

  const canPerformMainAction = () => {
    switch (userRole) {
      case 'vendedor':
        return status.canPublish;
      case 'comprador':
        return status.canPurchase;
      case 'repartidor':
        return status.canWork;
      default:
        return false;
    }
  };

  const getMainActionText = () => {
    switch (userRole) {
      case 'vendedor':
        return status.canPublish ? 'Puedes publicar productos' : 'No puedes publicar productos aún';
      case 'comprador':
        return status.canPurchase ? 'Puedes realizar compras' : 'No puedes comprar aún';
      case 'repartidor':
        return status.canWork ? 'Puedes tomar órdenes' : 'No puedes trabajar aún';
      default:
        return '';
    }
  };

  return {
    status,
    loading,
    refreshStatus,
    getCompletionPercentage,
    getMissingRequirements,
    canPerformMainAction,
    getMainActionText
  };
}
