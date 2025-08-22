import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { 
  ArrowLeft, 
  Upload, 
  X, 
  Package, 
  Loader2, 
  AlertCircle,
  Image as ImageIcon,
  Save
} from 'lucide-react';

interface Product {
  id: string;
  seller_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock_quantity: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

const CATEGORIES = [
  'Alimentos',
  'Bebidas', 
  'Ropa',
  'Electrónicos',
  'Hogar',
  'Belleza',
  'Deportes',
  'Libros',
  'Juguetes',
  'Mascotas',
  'Salud',
  'Herramientas',
  'Jardín',
  'Música',
  'Arte',
  'Otros'
];

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    category: product?.category || '',
    stock_quantity: product?.stock_quantity || 0,
    is_public: product?.is_public !== false
  });
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(product?.image_url || '');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('No autorizado - sesión inválida');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      // Intentar subir 3 veces
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          // Upload file to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('products')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            // Si es error de autenticación, intentar refrescar
            if (uploadError.message.includes('JWT') || uploadError.message.includes('token')) {
              await supabase.auth.refreshSession();
              continue;
            }
            throw uploadError;
          }

          // Get public URL
          const { data } = supabase.storage
            .from('products')
            .getPublicUrl(filePath);

          if (!data.publicUrl) {
            throw new Error('No se pudo obtener la URL pública');
          }

          return data.publicUrl;
        } catch (err) {
          if (attempt === 2) throw err; // En el último intento, propagar el error
          await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar antes de reintentar
          continue;
        }
      }
      throw new Error('No se pudo subir la imagen después de 3 intentos');      return data.publicUrl;
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
      const bucket = urlParts[urlParts.length - 3];
      const folder = urlParts[urlParts.length - 2];
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${folder}/${fileName}`;

      if (bucket === 'products') {
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

    if (formData.price <= 0) {
      setError('El precio debe ser mayor a 0');
      return;
    }

    if (!formData.category) {
      setError('Selecciona una categoría');
      return;
    }

    if (formData.stock_quantity < 0) {
      setError('La cantidad no puede ser negativa');
      return;
    }

    if (!product && !selectedImage && !imagePreview) {
      setError('Selecciona una imagen para el producto');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = product?.image_url || '';

      // Upload new image if selected
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
        
        // Delete old image if updating
        if (product?.image_url) {
          await deleteOldImage(product.image_url);
        }
      }

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: formData.price,
        category: formData.category,
        stock_quantity: formData.stock_quantity,
        is_public: formData.is_public,
        image_url: imageUrl,
        seller_id: user?.id
      };

      if (product) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);

        if (error) throw error;
      } else {
        // Create new product
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving product:', error);
      setError(error.message || 'Error al guardar el producto');
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
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-2 rounded-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {product ? 'Editar Producto' : 'Agregar Producto'}
                </h1>
                <p className="text-sm text-gray-600">
                  {product ? 'Modifica la información de tu producto' : 'Crea un nuevo producto para tu tienda'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Información del Producto
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
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Haz clic para seleccionar una imagen</p>
                    <p className="text-sm text-gray-500">PNG, JPG, WEBP hasta 5MB</p>
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
                    className="w-full"
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
                  placeholder="Ej: Manzanas Rojas Orgánicas"
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
                  placeholder="Describe las características y beneficios de tu producto..."
                  rows={4}
                />
              </div>

              {/* Price and Stock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio (Q) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Cantidad Disponible</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Categoría *</Label>
                <Select onValueChange={(value: string) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={formData.category || "Selecciona una categoría"} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Visibility */}
              <div className="space-y-3">
                <Label>Visibilidad</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant={formData.is_public ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, is_public: true })}
                    className="flex-1"
                  >
                    Público
                    {formData.is_public && <Badge variant="secondary" className="ml-2">Activo</Badge>}
                  </Button>
                  <Button
                    type="button"
                    variant={!formData.is_public ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, is_public: false })}
                    className="flex-1"
                  >
                    Privado
                    {!formData.is_public && <Badge variant="secondary" className="ml-2">Activo</Badge>}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Los productos públicos aparecen en el catálogo general. Los privados solo los ves tú.
                </p>
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
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {product ? 'Actualizar' : 'Crear'} Producto
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