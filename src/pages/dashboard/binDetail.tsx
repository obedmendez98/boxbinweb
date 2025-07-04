import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Plus, 
  Trash2, 
  MapPin, 
  Calendar,
  Package,
  ImageIcon,
  X,
  Minus,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { addDoc, collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

export const uploadImage = async (file: File): Promise<string> => {
  const storage = getStorage();
  const storageRef = ref(storage, `items/${Date.now()}-${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};

const extractStoragePath = (url: string | null): string | null => {
    if (!url) return null;
  
    // 1. Si ya es un path válido (sin dominios ni tokens)
    if (!url.includes('http') && !url.startsWith('gs://')) {
      return url;
    }
  
    // 2. Si es una URL pública de Firebase Storage
    if (url.includes('firebasestorage.googleapis.com')) {
      const match = decodeURIComponent(url).match(/\/o\/(.*?)\?/);
      return match?.[1] || null;
    }
  
    // 3. Si es una URL gs://bucket/path
    if (url.startsWith('gs://')) {
      const parts = url.replace('gs://', '').split('/');
      parts.shift(); // remove bucket name
      return parts.join('/');
    }
  
    // Si no coincide con ningún formato conocido
    return null;
};  

// types.ts
export interface BinDetails {
  id: string;
  name: string;
  description: string;
  address: string;
  createdAt: string;
  location?: {
    name: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
}

export interface Item {
  id: string;
  name: string;
  description: string;
  tags: string[];
  createdAt: string;
  binId: string;
  imageUrl?: string;
  cuantity: string;
  value: string;
}

const BinDetailsScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
   const { currentUser } = useAuth();
  
  // States
  const [bin, setBin] = useState<BinDetails | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isEditBinOpen, setIsEditBinOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  
  const incrementQuantity = () => setItemCuantity((prev: any) => prev + 1);
  const decrementQuantity = () => setItemCuantity((prev: any) => Math.max(0, prev - 1));
  // Form states
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemCuantity, setItemCuantity] = useState<number>(0);
  const [itemValue, setItemValue] = useState<any>('');
  const [itemTags, setItemTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  
  // Bin form states
  const [binName, setBinName] = useState('');
  const [binDescription, setBinDescription] = useState('');
  const [binAddress, setBinAddress] = useState('');

  const [error, setError] = useState('');

  useEffect(() => {
    console.log(error);
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const binDocRef = doc(db, 'bins', id!);
        const binSnap = await getDoc(binDocRef);

        if (!binSnap.exists()) {
          setError('Bin not found');
          setLoading(false);
          return;
        }

        const binData = binSnap.data() as Omit<BinDetails, 'id'>;
        setBin({ id: binSnap.id, ...binData });

        const itemsQuery = query(
          collection(db, 'items'),
          where('binId', '==', id)
        );
        const itemsSnap = await getDocs(itemsQuery);

        const itemsData = itemsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Item[];

        setItems(itemsData);
      } catch (err) {
        console.error('Error fetching bin data:', err);
        setError('Error fetching bin data');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const handleAddTag = () => {
    if (newTag.trim() && !itemTags.includes(newTag.trim())) {
      setItemTags([...itemTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setItemTags(itemTags.filter(tag => tag !== tagToRemove));
  };

  const handleEditItem = (item: any) => {
    console.log(currentItem)
    console.log(item)
    setCurrentItem(item);
    setItemName(item.name);
    setItemDescription(item.description);
    setItemCuantity(Number(item.cuantity));
    setItemValue(Number(item.value));
    setItemTags(item.tags);
    setSelectedImage(item.imageUrl || null);
    setIsEditItemOpen(true);
  };

  const handleUpdateItem = async () => {
    if (!itemName.trim()) {
      alert("Please enter an item name");
      return;
    }

    //setIsUploading(true);

    try {
      if (!currentItem) {
        alert("No item selected");
        //setIsUploading(false);
        return;
      }

      const itemRef = doc(db, "items", currentItem.id);

      // Prepara datos a actualizar
      const updateData: Partial<Item> = {
        name: itemName.trim(),
        description: itemDescription.trim(),
        tags: itemTags,
        value: itemValue?.toString(),
        cuantity: itemCuantity?.toString()
      };

      // Si la imagen cambió y hay una imagen anterior
      if (selectedFile && selectedImage !== currentItem.imageUrl) {
        if (currentItem.imageUrl) {
          try {
            const storage = getStorage();
            // Extraer ruta relativa en storage para eliminar
            const oldImagePath = extractStoragePath(currentItem?.imageUrl ?? null);
            if (oldImagePath) {
              const oldImageRef = ref(storage, oldImagePath);
              await deleteObject(oldImageRef);
              console.log('Old image deleted');
            } else {
              console.warn('No se pudo extraer un path válido de la URL');
            }

            console.log("Old image deleted");
          } catch (error) {
            console.warn("Error deleting old image", error);
          }
        }

        // Subir nueva imagen
        const newImageUrl = await uploadImage(selectedFile);
        updateData.imageUrl = newImageUrl;
      }

      // Actualizar Firestore
      await updateDoc(itemRef, updateData);

      // Actualizar estado local
      setItems((prev) =>
        prev.map((item) => (item.id === currentItem.id ? { ...item, ...updateData } : item))
      );

      // Reset form y cerrar modal
      resetItemForm();
      setIsEditItemOpen(false);

      alert("Item updated successfully");
    } catch (error) {
      console.error("Error updating item", error);
      alert("Failed to update item");
    } finally {
      //setIsUploading(false);
    }
  };

  const handleEditBin = () => {
    if (bin) {
      setBinName(bin.name);
      setBinDescription(bin.description);
      setBinAddress(bin.address);
      setIsEditBinOpen(true);
    }
  };

  const resetItemForm = () => {
    setItemName('');
    setItemDescription('');
    setItemTags([]);
    setSelectedImage(null);
    setCurrentItem(null);
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      setSelectedFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitItem = async () => {
    if (!itemName.trim()) {
      toast.error('Please enter an item name'); // o un alert nativo
      return;
    }

    //setIsUploading(true);

    try {
      let imageUrl: string | null = null;

      console.log(selectedFile, " archivo")
      if (selectedFile) {
        try {
          imageUrl = await uploadImage(selectedFile);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          const proceed = window.confirm(
            'Image upload failed. Do you want to continue without an image?'
          );
          if (!proceed) {
            //setIsUploading(false);
            return;
          }
        }
      }

      await createItem(imageUrl);
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    } finally {
      //setIsUploading(false);
    }
  };

  const createItem = async (imageUrl: string | null = null) => {
    try {
      const itemData = {
        name: itemName.trim(),
        description: itemDescription.trim(),
        cuantity: itemCuantity?.toString()?.trim(),
        value: itemValue?.toString()?.trim(),
        tags: itemTags,
        createdAt: new Date().toISOString(),
        binId: id,
        userId: currentUser?.uid,
        ...(imageUrl && { imageUrl })
      };

      const docRef = await addDoc(collection(db, 'items'), itemData);
      const newItem = { id: docRef.id, ...itemData };
      
      setItems((prevItems: any) => [...prevItems, newItem]);
      setIsAddItemOpen(false);
      resetItemForm();
      
      toast.success('Item added successfully'); 
    } catch (error) {
      console.log(error);
    }
  };


  const handleUpdateBin = async () => {
    // aquí va tu lógica de update en Firestore…
  }

  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setSelectedLocation(null);
    setIsUploading(false);
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading bin details...</p>
        </div>
      </div>
    );
  }

  if (!bin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Package className="h-16 w-16 text-gray-400 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">Bin not found</h2>
          <p className="text-gray-600">The requested bin could not be found.</p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/')}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">Bin Details</h1>
            </div>
            <Button onClick={() => navigate('/')} variant="outline" size="sm">
              Done
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Bin Information Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">{bin.name}</h2>
                  <p className="text-gray-600">{bin.description}</p>
                  {bin.location && (
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-1" />
                      {bin.location.name}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    Created: {new Date(bin.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleEditBin}
                  className="shrink-0"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label>Image</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      {selectedImage ? (
                        <div className="space-y-4">
                          <img 
                            src={selectedImage} 
                            alt="Preview" 
                            className="max-w-full h-32 object-cover rounded-lg mx-auto"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedImage(null)}
                          >
                            Remove Image
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <ImageIcon className="h-8 w-8 text-gray-400 mx-auto" />
                          <div>
                            <label className="cursor-pointer">
                              <span className="text-sm text-blue-600 hover:text-blue-500">
                                Click to upload an image
                              </span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itemName">Name *</Label>
                    <Input
                      id="itemName"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="Enter item name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itemDescription">Description</Label>
                    <Textarea
                      id="itemDescription"
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="Enter item description"
                      rows={3}
                    />
                  </div>

                  {/* Cantidad */}
                  <div className="space-y-2">
                    <Label htmlFor="itemQuantity">Quantity</Label>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="icon" onClick={decrementQuantity}>
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        id="itemQuantity"
                        type="number"
                        min={0}
                        value={itemCuantity}
                        onChange={(e) => setItemCuantity(Number(e.target.value))}
                        className="w-20 text-center"
                      />
                      <Button variant="outline" size="icon" onClick={incrementQuantity}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Valor */}
                  <div className="space-y-2">
                    <Label htmlFor="itemValue">Value</Label>
                    <Input
                      id="itemValue"
                      type="number"
                      min={0}
                      step={0.01}
                      value={itemValue}
                      onChange={(e) => setItemValue(Number(e.target.value))}
                      placeholder="Enter item value"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add a tag"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      />
                      <Button onClick={handleAddTag} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {itemTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {itemTags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="pr-1">
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsAddItemOpen(false);
                        resetItemForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => handleSubmitItem()} disabled={!itemName.trim()}>
                      Add Item
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex-1 sm:flex-none">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Bin
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Bin</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this bin? This action cannot be undone and will also delete all items in this bin.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Items ({items.length})
              </h3>
            </div>

            {items.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No items yet</h4>
                  <p className="text-gray-500 mb-4">Add your first item to get started</p>
                  <Button onClick={() => setIsAddItemOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-video bg-gray-100 relative">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 truncate flex-1">{item.name}</h4>
                        <div className="flex space-x-1 ml-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditItem(item)}
                            className="p-1 h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="p-1 h-8 w-8 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Item</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{item.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                      
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Item Modal */}
      <Dialog open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Similar form as Add Item but with update functionality */}
            <div className="space-y-2">
              <Label>Image</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                {selectedImage ? (
                  <div className="space-y-4">
                    <img 
                      src={selectedImage} 
                      alt="Preview" 
                      className="max-w-full h-32 object-cover rounded-lg mx-auto"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedImage(null)}
                    >
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="h-8 w-8 text-gray-400 mx-auto" />
                    <div>
                      <label className="cursor-pointer">
                        <span className="text-sm text-blue-600 hover:text-blue-500">
                          Click to upload an image
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editItemName">Name *</Label>
              <Input
                id="editItemName"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Enter item name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editItemDescription">Description</Label>
              <Textarea
                id="editItemDescription"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="Enter item description"
                rows={3}
              />
            </div>

            {/* Cantidad */}
                  <div className="space-y-2">
                    <Label htmlFor="itemQuantity">Quantity</Label>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="icon" onClick={decrementQuantity}>
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        id="itemQuantity"
                        type="number"
                        min={0}
                        value={itemCuantity}
                        onChange={(e) => setItemCuantity(Number(e.target.value))}
                        className="w-20 text-center"
                      />
                      <Button variant="outline" size="icon" onClick={incrementQuantity}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Valor */}
                  <div className="space-y-2">
                    <Label htmlFor="itemValue">Value</Label>
                    <Input
                      id="itemValue"
                      type="number"
                      min={0}
                      step={0.01}
                      value={itemValue}
                      onChange={(e) => setItemValue(Number(e.target.value))}
                      placeholder="Enter item value"
                    />
                  </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex space-x-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button onClick={handleAddTag} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {itemTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {itemTags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="pr-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditItemOpen(false);
                  resetItemForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={() =>  handleUpdateItem()} disabled={!itemName.trim()}>
                Update Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Bin Modal */}
       <Dialog open={isEditBinOpen} onOpenChange={setIsEditBinOpen}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bin</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="binName">Name *</Label>
            <Input
              id="binName"
              value={binName}
              onChange={(e) => setBinName(e.target.value)}
              placeholder="Enter bin name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="binDescription">Description</Label>
            <Textarea
              id="binDescription"
              value={binDescription}
              onChange={(e) => setBinDescription(e.target.value)}
              placeholder="Enter bin description"
              rows={3}
            />
          </div>

          {/* Address (si lo necesitas) */}
          <div className="space-y-2">
            <Label htmlFor="binAddress">Address</Label>
            <Input
              id="binAddress"
              value={binAddress}
              onChange={(e) => setBinAddress(e.target.value)}
              placeholder="Enter bin address"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location { !selectedLocation && <span className="text-red-500">*</span> }</Label>
            {!selectedLocation ? (
              <Button variant="outline" onClick={() => {}}>
                + Add Location
              </Button>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={() =>{}}>
                  Change Location
                </Button>
                <div className="inline-flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded">
                  <MapPin className="w-4 h-4 text-gray-600" />
                  <span>{selectedLocation?.name}</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditBinOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isUploading || !binName.trim()}
              onClick={handleUpdateBin}
            >
              {isUploading ? (
                <span className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </span>
              ) : (
                'Update Bin'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </div>
  );
};

export default BinDetailsScreen;