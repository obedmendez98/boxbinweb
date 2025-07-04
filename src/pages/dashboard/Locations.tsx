import { useState, useEffect } from 'react';
import { Search, Plus, ArrowLeft, Check, Edit, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

// Mock data and functions (replace with your actual implementations)
const mockLocations = [
  { id: '1', name: 'Kitchen', address: '123 Main St', description: 'Main kitchen area', itemCount: 5, userId: 'user1' },
  { id: '2', name: 'Living Room', address: '123 Main St', description: 'Living room storage', itemCount: 3, userId: 'user1' },
  { id: '3', name: 'Garage', address: '123 Main St', description: 'Garage storage area', itemCount: 8, userId: 'user1' },
];

// Mock translation function
const useTranslation = () => ({
  t: (key: string) => {
    const translations: { [key: string]: string } = {
      'locations.title': 'Locations',
      'locations.searchPlaceholder': 'Search locations...',
      'locations.empty': 'No locations found',
      'locations.noMatches': 'No matching locations',
      'locations.emptyDescription': 'Create your first location to get started',
      'locations.createFirst': 'Create First Location',
      'locations.addTitle': 'Add New Location',
      'locations.editTitle': 'Edit Location',
      'form.namePlaceholder': 'Location Name',
      'form.addressLabel': 'Address',
      'form.addressPlaceholder': 'Enter address',
      'form.descriptionLabel': 'Description',
      'form.descriptionPlaceholder': 'Enter description',
      'form.adding': 'Adding...',
      'form.updating': 'Updating...',
      'form.addLocationButton': 'Add Location',
      'form.updateLocationButton': 'Update Location',
      'common.done': 'Done',
      'common.optional': 'optional',
      'alerts.selectLocation': 'Please select a location',
      'alerts.deleteTitle': 'Delete Location',
      'alerts.deleteConfirm': 'Are you sure you want to delete this location?',
      'alerts.cancel': 'Cancel',
      'alerts.delete': 'Delete',
      'alerts.deletedTitle': 'Deleted',
      'alerts.deletedMessage': 'Location deleted successfully',
      'alerts.deleteErrorTitle': 'Error',
      'alerts.deleteErrorMessage': 'Failed to delete location',
      'alerts.locationRequiredTitle': 'Location Required',
      'alerts.locationRequiredMessage': 'Please select a location to update',
      'alerts.loginErrorTitle': 'Login Required',
      'alerts.loginErrorMessage': 'Please login to continue',
    };
    return translations[key] || key;
  }
});

// Mock user hook
const useUser = () => ({
  activeUser: () => ({ uid: 'user1', name: 'John Doe' }),
  impersonatedUser: null
});

interface Location {
  id: string;
  name: string;
  address: string;
  description: string;
  itemCount: number;
  userId: string;
}

export default function LocationsManager() {
  const { t } = useTranslation();
  const { activeUser } = useUser();
  
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  //setError("");
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemAddress, setItemAddress] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [idLocation, setIdLocation] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  });

  // Load locations on component mount
  useEffect(() => {
    setError("");
    const currentUser = activeUser();
    if (!currentUser) {
      setLocations([]);
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLocations(mockLocations);
      setFilteredLocations(mockLocations);
      setLoading(false);
    }, 1000);
  }, []);

  // Filter locations based on search text
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredLocations(locations);
    } else {
      const filtered = locations.filter(location =>
        location.name.toLowerCase().includes(searchText.toLowerCase()) ||
        location.address.toLowerCase().includes(searchText.toLowerCase()) ||
        location.description.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredLocations(filtered);
    }
  }, [searchText, locations]);

  const showAlertMessage = (message: string, type: 'success' | 'error') => {
    setShowAlert({ show: true, message, type });
    setTimeout(() => setShowAlert({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleDeleteLocation = async (locationId: string) => {
    try {
      console.log(`Deleting location: ${locationId}`);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLocations(prev => prev.filter(loc => loc.id !== locationId));
      setSelectedLocation(null);
      showAlertMessage(t('alerts.deletedMessage'), 'success');
    } catch (error) {
      showAlertMessage(t('alerts.deleteErrorMessage'), 'error');
      console.error("Error deleting location:", error);
    }
  };

  const handleEditLocation = (locationId: string) => {
    const locationToEdit = locations.find(location => location.id === locationId);
    if (locationToEdit) {
      setIdLocation(locationId);
      setItemName(locationToEdit.name);
      setItemAddress(locationToEdit.address);
      setItemDescription(locationToEdit.description);
      setIsEditModalVisible(true);
    }
  };

  const confirmDeleteLocation = (locationId: string) => {
    if (window.confirm(`${t('alerts.deleteTitle')}\n${t('alerts.deleteConfirm')}`)) {
      handleDeleteLocation(locationId);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const currentUser = activeUser();

      if (!currentUser) {
        showAlertMessage(t('alerts.loginErrorMessage'), 'error');
        return;
      }

      const newLocation: Location = {
        id: Date.now().toString(),
        name: itemName,
        address: itemAddress,
        description: itemDescription,
        itemCount: 0,
        userId: currentUser.uid,
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setLocations(prev => [...prev, newLocation]);
      setItemName("");
      setItemAddress("");
      setItemDescription("");
      setIsLoading(false);
      setIsModalVisible(false);
      showAlertMessage('Location added successfully', 'success');
    } catch (error) {
      setIsLoading(false);
      showAlertMessage('Error adding location', 'error');
      console.log(error);
    }
  };

  const handleUpdateSubmit = async () => {
    try {
      if (!idLocation) {
        showAlertMessage(t('alerts.locationRequiredMessage'), 'error');
        return;
      }
      
      setIsLoading(true);
      const currentUser = activeUser();

      if (!currentUser) {
        showAlertMessage(t('alerts.loginErrorMessage'), 'error');
        return;
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setLocations(prev => prev.map(loc => 
        loc.id === idLocation 
          ? { ...loc, name: itemName, address: itemAddress, description: itemDescription }
          : loc
      ));
      
      setItemName("");
      setItemAddress("");
      setItemDescription("");
      setIsLoading(false);
      setIsEditModalVisible(false);
      showAlertMessage('Location updated successfully', 'success');
    } catch (error) {
      setIsLoading(false);
      showAlertMessage('Error updating location', 'error');
      console.log(error);
    }
  };

  const handleLocationSelect = (location: Location) => {

    if (selectedLocation?.id === location.id) {
      setSelectedLocation(null);
    } else {
      setSelectedLocation(location);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Alert */}
      {showAlert.show && (
        <Alert className={`fixed top-4 right-4 z-50 max-w-md ${
          showAlert.type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'
        }`}>
          <AlertDescription className={showAlert.type === 'error' ? 'text-red-700' : 'text-green-700'}>
            {showAlert.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      {locations.length > 0 && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">{t('locations.title')}</h1>
          </div>
          
        </div>
      )}

      {/* Search Bar */}
      {locations.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('locations.searchPlaceholder')}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchText && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
              onClick={() => setSearchText('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Content */}
      {filteredLocations.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {searchText.trim() ? t('locations.noMatches') : t('locations.empty')}
          </h2>
          {!searchText.trim() && (
            <>
              <p className="text-gray-600 mb-4">{t('locations.emptyDescription')}</p>
              <Button onClick={() => setIsModalVisible(true)} className="bg-blue-600 hover:bg-blue-700">
                {t('locations.createFirst')}
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.map((location) => (
            <Card
              key={location.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedLocation?.id === location.id
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:shadow-md'
              }`}
              onClick={() => handleLocationSelect(location)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0"></div>
                      <h3 className="font-semibold text-lg">{location.name}</h3>
                    </div>
                    
                    {location.address && (
                      <p className="text-sm text-gray-600 mb-2">{location.address}</p>
                    )}
                    
                    {location.description && (
                      <p className="text-sm text-gray-700 mb-2">{location.description}</p>
                    )}
                    
                    {location.itemCount > 0 && (
                      <Badge variant="secondary" className="mb-2">
                        {location.itemCount} items
                      </Badge>
                    )}
                  </div>
                  
                  {selectedLocation?.id === location.id && (
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-blue-600" />
                    </div>
                  )}
                </div>
                
                {selectedLocation?.id === location.id && (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditLocation(location.id);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDeleteLocation(location.id);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Floating Action Button */}
      <Button
        onClick={() => {
          setItemName("");
          setItemAddress("");
          setItemDescription("");
          setIsModalVisible(true);
        }}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 bg-blue-600 hover:bg-blue-700 shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Add Location Modal */}
      <Dialog open={isModalVisible} onOpenChange={setIsModalVisible}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('locations.addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('form.namePlaceholder')} *</Label>
              <Input
                id="name"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder={t('form.namePlaceholder')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">
                {t('form.addressLabel')} 
                <span className="text-gray-500 text-sm ml-1">({t('common.optional')})</span>
              </Label>
              <Input
                id="address"
                value={itemAddress}
                onChange={(e) => setItemAddress(e.target.value)}
                placeholder={t('form.addressPlaceholder')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">
                {t('form.descriptionLabel')} 
                <span className="text-gray-500 text-sm ml-1">({t('common.optional')})</span>
              </Label>
              <Textarea
                id="description"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder={t('form.descriptionPlaceholder')}
                rows={4}
              />
            </div>
            
            <Button
              onClick={handleSubmit}
              disabled={!itemName.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('form.adding')}
                </>
              ) : (
                t('form.addLocationButton')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Location Modal */}
      <Dialog open={isEditModalVisible} onOpenChange={setIsEditModalVisible}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('locations.editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('form.namePlaceholder')} *</Label>
              <Input
                id="edit-name"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder={t('form.namePlaceholder')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-address">
                {t('form.addressLabel')} 
                <span className="text-gray-500 text-sm ml-1">({t('common.optional')})</span>
              </Label>
              <Input
                id="edit-address"
                value={itemAddress}
                onChange={(e) => setItemAddress(e.target.value)}
                placeholder={t('form.addressPlaceholder')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">
                {t('form.descriptionLabel')} 
                <span className="text-gray-500 text-sm ml-1">({t('common.optional')})</span>
              </Label>
              <Textarea
                id="edit-description"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder={t('form.descriptionPlaceholder')}
                rows={4}
              />
            </div>
            
            <Button
              onClick={handleUpdateSubmit}
              disabled={!itemName.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('form.updating')}
                </>
              ) : (
                t('form.updateLocationButton')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}