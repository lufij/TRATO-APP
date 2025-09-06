import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  ArrowLeft, 
  Upload, 
  X, 
  Clock, 
  Loader2, 
  AlertCircle,
  Image as ImageIcon,
  Save,
  Timer
} from 'lucide-react';

interface DailyProduct {
  id: string;
  seller_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock_quantity: number;
  expires_at: string;
  created_at: string;
}

interface DailyProductFormProps {
  dailyProduct?: DailyProduct;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DailyProductForm({ dailyProduct, onSuccess, onCancel }: DailyProductFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: dailyProduct?.name || '',
    description: dailyProduct?.description || '',
    price: dailyProduct?.price ? String(dailyProduct.price) : '',
    stock_quantity: dailyProduct?.stock_quantity ? String(dailyProduct.stock_quantity) : ''
  });
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(dailyProduct?.image_url || '');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getExpirationTime = () => {
    // CORREGIDO: Para Guatemala (UTC-6), medianoche local debe convertirse correctamente a UTC
    const today = new Date();
    
    // Crear medianoche LOCAL (23:59:59.999)
    const localMidnight = new Date(
      today.getFullYear(),
      today.getMonth(), 
      today.getDate(),
      23, 59, 59, 999
    );
    
    // JavaScript automáticamente convierte a UTC considerando la zona horaria
    // Guatemala UTC-6: 23:59 local = 05:59 UTC del día siguiente
    return localMidnight.toISOString();
  };

  const getTimeUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(23, 59, 59, 999);
    const diff = midnight.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Por favor selecciona una imagen válida');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen debe ser menor a 5MB');
        return;
      }

      setSelectedImage(file);
      setError('');
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    setUploadingImage(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${today}/${Date.now()}.${fileExt}`;
      const filePath = `daily-products/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      throw new Error('Error al subir la imagen: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteOldImage = async (imageUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'products');
      if (bucketIndex !== -1) {
        const pathParts = urlParts.slice(bucketIndex + 1);
        const filePath = pathParts.join('/');

        await supabase.storage
          .from('products')
          .remove([filePath]);
      }
    } catch (error) {
      console.error('Error deleting old image:', error);
      // Don't throw error, just log it
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('El nombre del producto es requerido');
      return;
    }

    if (parseFloat(formData.price) <= 0) {
      setError('El precio debe ser mayor a 0');
      return;
    }

    if (parseInt(formData.stock_quantity) < 0) {
      setError('La cantidad no puede ser negativa');
      return;
    }

    if (!dailyProduct && !selectedImage && !imagePreview) {
      setError('Selecciona una imagen para el producto');
      return;
    }

    // Check if there's enough time left in the day
    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour >= 23) {
      setError('Es muy tarde para crear productos del día. Inténtalo mañana temprano.');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = dailyProduct?.image_url || '';

      // Upload new image if selected
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
        
        // Delete old image if updating
        if (dailyProduct?.image_url) {
          await deleteOldImage(dailyProduct.image_url);
        }
      }

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price) || 0,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        image_url: imageUrl,
        seller_id: user?.id,
        expires_at: getExpirationTime()
      };

      if (dailyProduct) {
        // Update existing daily product
        const { error } = await supabase
          .from('daily_products')
          .update(productData)
          .eq('id', dailyProduct.id);

        if (error) throw error;
      } else {
        // Create new daily product
        const { error } = await supabase
          .from('daily_products')
          .insert([productData]);

        if (error) throw error;
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving daily product:', error);
      setError(error.message || 'Error al guardar el producto del día');
    } finally {
      setLoading(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {dailyProduct ? 'Editar Producto del Día' : 'Tu Venta del Día'}
                </h1>
                <p className="text-sm text-gray-600">
                  {dailyProduct ? 'Modifica tu oferta especial' : 'Crea una oferta especial que dura hasta medianoche'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Time Warning */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="w-5 h-5 text-orange-600" />
            <span className="font-medium text-orange-800">
              Tiempo restante: {getTimeUntilMidnight()}
            </span>
          </div>
          <p className="text-sm text-orange-700">
            Este producto se eliminará automáticamente a las 23:59:59 de hoy. 
            Las imágenes también se eliminarán del servidor.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Información del Producto del Día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image Upload */}
              <div className="space-y-4">
                <Label>Imagen del Producto *</Label>
                
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={removeImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                        <div className="bg-white p-3 rounded-lg flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Subiendo imagen...</span>
                        </div>
                      </div>
                    )}
                    <Badge variant="destructive" className="absolute bottom-2 left-2">
                      <Clock className="w-3 h-3 mr-1" />
                      Expira a medianoche
                    </Badge>
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed border-orange-300 rounded-lg p-8 text-center cursor-pointer hover:border-orange-500 transition-colors bg-orange-50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                    <p className="text-orange-700 mb-2">Haz clic para seleccionar una imagen</p>
                    <p className="text-sm text-orange-600">PNG, JPG, WEBP hasta 5MB</p>
                    <Badge variant="outline" className="mt-2 border-orange-300 text-orange-700">
                      Se elimina automáticamente
                    </Badge>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {!imagePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Seleccionar Imagen
                  </Button>
                )}
              </div>

              {/* Product Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Producto *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Combo Especial del Día"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe tu oferta especial del día..."
                  rows={4}
                />
              </div>

              {/* Price and Stock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio Especial (Q) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-orange-600">Precio especial válido solo hoy</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Cantidad Disponible</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    placeholder="0"
                  />
                  <p className="text-xs text-orange-600">¡Solo por hoy!</p>
                </div>
              </div>

              {/* Special Features */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Características de Productos del Día
                </h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Se elimina automáticamente a las 23:59:59</li>
                  <li>• Aparece marcado como "Oferta del Día" en el catálogo</li>
                  <li>• Las imágenes se almacenan en carpeta temporal</li>
                  <li>• Ideal para ofertas especiales y productos perecederos</li>
                </ul>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1"
                  disabled={loading || uploadingImage}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading || uploadingImage}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {dailyProduct ? 'Actualizar' : 'Crear'} Venta del Día
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}