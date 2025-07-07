import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Package, 
  MapPin, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Grid,
  List,
  ArrowUpRight,
  ScanLine,
  Clock,
  Building2,
  Plus,
  TrendingUp,
  Filter
} from 'lucide-react';
import { collection, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

const ITEMS_PER_PAGE = 12;

interface Bin {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  qrGuid: string;
  qrcodeId?: string;
  location?: {
    id: string;
    name: string;
  };
}

/*interface Item {
  id: string;
  name: string;
  description: string;
  tags: string[];
  binId: string;
  createdAt: string;
}
*/
interface Location {
  id: string;
  name: string;
  itemCount?: number;
}

interface PaginationState {
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  lastVisible: any;
  firstVisible: any;
  totalCount: number;
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bins' | 'locations' | any>('bins');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Bins state
  const [bins, setBins] = useState<Bin[]>([]);
  const [filteredBins, setFilteredBins] = useState<Bin[]>([]);
  const [searchTextBins, setSearchTextBins] = useState('');
  const [binsPagination, setBinsPagination] = useState<PaginationState>({
    currentPage: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    lastVisible: null,
    firstVisible: null,
    totalCount: 0
  });

  // Locations state
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [searchTextLocations, setSearchTextLocations] = useState('');
  const [locationsPagination, setLocationsPagination] = useState<PaginationState>({
    currentPage: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    lastVisible: null,
    firstVisible: null,
    totalCount: 0
  });

  // Items state
  //const [items, setItems] = useState<Item[]>([]);
  const [filterLocation, setFilterLocation] = useState<Location | null>(null);

  // User context (simplified for this example)
  const { currentUser } = useAuth();

  const normalizeText = (text: any) =>
    (text || '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  // Fetch bins with pagination
  const fetchBins = async (page: number = 1, searchTerm: string = '', isNextPage: boolean = false, isPreviousPage: boolean = false) => {
    if (!currentUser?.uid) return;
    console.log(locations);
    setLoading(true);
    
    try {
      let binsQuery = query(
        collection(db, 'bins'),
        where('userId', '==', currentUser?.uid),
        orderBy('createdAt', 'desc'),
        limit(ITEMS_PER_PAGE)
      );

      if (isNextPage && binsPagination.lastVisible) {
        binsQuery = query(
          collection(db, 'bins'),
          where('userId', '==', currentUser?.uid),
          orderBy('createdAt', 'desc'),
          startAfter(binsPagination.lastVisible),
          limit(ITEMS_PER_PAGE)
        );
      } else if (isPreviousPage && binsPagination.firstVisible) {
        // For previous page, we need to reverse the order and take the previous documents
        binsQuery = query(
          collection(db, 'bins'),
          where('userId', '==', currentUser?.uid),
          orderBy('createdAt', 'desc'),
          limit(ITEMS_PER_PAGE)
        );
      }

      const snapshot = await getDocs(binsQuery);
      const binsData = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as Bin[];

      console.log(binsData, " d")

      // Get QR codes for bins
      const binsWithQRCodes = await Promise.all(
        binsData.map(async (bin) => {
          if (!bin.qrGuid) return bin;
          const qrSnapshot = await getDocs(
            query(
              collection(db, 'qrcodes'),
              where('guid', '==', bin.qrGuid)
            )
          );
          if (!qrSnapshot.empty) {
            const qrData = qrSnapshot.docs[0].data();
            return { ...bin, qrcodeId: qrData?.qrcodeId };
          }
          return bin;
        })
      );

      setBins(binsWithQRCodes);
      
      // Filter by search term if provided
      const filtered = searchTerm 
        ? binsWithQRCodes.filter(bin => 
            normalizeText(bin.name).includes(normalizeText(searchTerm)) ||
            normalizeText(bin.description).includes(normalizeText(searchTerm)) ||
            normalizeText(bin.qrcodeId).includes(normalizeText(searchTerm))
          )
        : binsWithQRCodes;
      
      setFilteredBins(filtered);

      // Update pagination state
      setBinsPagination({
        currentPage: page,
        hasNextPage: snapshot.docs.length === ITEMS_PER_PAGE,
        hasPreviousPage: page > 1,
        lastVisible: snapshot.docs[snapshot.docs.length - 1] || null,
        firstVisible: snapshot.docs[0] || null,
        totalCount: filtered.length
      });

    } catch (error) {
      console.error('Error fetching bins:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch locations with pagination
  const fetchLocations = async (page: number = 1, searchTerm: string = '', isNextPage: boolean = false) => {
    if (!currentUser?.uid) return;
    
    setLoading(true);
    
    try {
      let locationsQuery = query(
        collection(db, 'locations'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(ITEMS_PER_PAGE)
      );

      if (isNextPage && locationsPagination.lastVisible) {
        locationsQuery = query(
          collection(db, 'locations'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc'),
          startAfter(locationsPagination.lastVisible),
          limit(ITEMS_PER_PAGE)
        );
      }

      const snapshot = await getDocs(locationsQuery);
      const locationsData = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as Location[];

      setLocations(locationsData);
      
      // Filter by search term if provided
      const filtered = searchTerm 
        ? locationsData.filter(location => 
            normalizeText(location.name).includes(normalizeText(searchTerm))
          )
        : locationsData;
      
      setFilteredLocations(filtered);

      // Update pagination state
      setLocationsPagination({
        currentPage: page,
        hasNextPage: snapshot.docs.length === ITEMS_PER_PAGE,
        hasPreviousPage: page > 1,
        lastVisible: snapshot.docs[snapshot.docs.length - 1] || null,
        firstVisible: snapshot.docs[0] || null,
        totalCount: filtered.length
      });

    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search effect for bins
  useEffect(() => {
    if (activeTab === 'bins') {
      const delayedSearch = setTimeout(() => {
        fetchBins(1, searchTextBins);
      }, 300);
      return () => clearTimeout(delayedSearch);
    }
  }, [searchTextBins, activeTab]);

  // Search effect for locations
  useEffect(() => {
    if (activeTab === 'locations') {
      const delayedSearch = setTimeout(() => {
        fetchLocations(1, searchTextLocations);
      }, 300);
      return () => clearTimeout(delayedSearch);
    }
  }, [searchTextLocations, activeTab]);

  // Initial load
  useEffect(() => {
    if (activeTab === 'bins') {
      fetchBins();
    } else {
      fetchLocations();
    }
  }, [activeTab]);

  const handleLocationFilter = (location: Location) => {
    setActiveTab('bins');
    setFilterLocation(location);
    const filteredBinsByLocation = bins.filter(bin => 
      bin.location && bin.location.id === location.id
    );
    setFilteredBins(filteredBinsByLocation);
  };

  const clearLocationFilter = () => {
    setFilterLocation(null);
    fetchBins(1, searchTextBins);
  };

  const renderBinCard = (bin: any) => (
    <Card 
      key={bin.id} 
      className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-white/70 backdrop-blur-sm hover:bg-white hover:-translate-y-1"
      onClick={() => navigate(`/bin-details/${bin.id}`)}
    >
      <CardContent className="p-6">
        {/* Header con QR Code */}
        <div className="flex items-start justify-between mb-4">
          {bin.qrcodeId && (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200 font-medium">
              <ScanLine className="w-3 h-3 mr-1" />
              {bin.qrcodeId}
            </Badge>
          )}
          <ArrowUpRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Icono principal */}
        <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center group-hover:from-emerald-100 group-hover:to-emerald-200 transition-all duration-300">
          <Package className="w-7 h-7 text-slate-600 group-hover:text-emerald-600 transition-colors" />
        </div>

        {/* Contenido principal */}
        <div className="text-center mb-4">
          <h3 className="font-semibold text-slate-900 mb-2 truncate">{bin.name}</h3>
          {bin.description && (
            <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{bin.description}</p>
          )}
        </div>

        {/* Footer con stats */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            <span>{bin.itemCount} items</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{bin.lastUpdated}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderLocationCard = (location: any) => (
    <Card 
      key={location.id} 
      className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-white/70 backdrop-blur-sm hover:bg-white hover:-translate-y-1"
      onClick={() => handleLocationFilter(location)}
    >
      <CardContent className="p-6 relative">
        {/* Indicador de actividad */}
        {location.itemCount > 20 && (
          <div className="absolute top-3 right-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
        )}

        {/* Icono principal */}
        <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300">
          {location.type === 'warehouse' ? (
            <Building2 className="w-7 h-7 text-blue-600 transition-colors" />
          ) : (
            <MapPin className="w-7 h-7 text-blue-600 transition-colors" />
          )}
        </div>

        {/* Contenido */}
        <div className="text-center mb-4">
          <h3 className="font-semibold text-slate-900 mb-2">{location.name}</h3>
          <p className="text-sm text-slate-500 mb-3">{location.description}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
          <div className="text-center">
            <div className="text-lg font-semibold text-slate-900">{location.binCount}</div>
            <div className="text-xs text-slate-500">Bins</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-slate-900">{location.itemCount}</div>
            <div className="text-xs text-slate-500">Items</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderListView = (items: any, type: any) => {
    console.log(items);
    console.log(type);
    return(
      <div className="space-y-3">
        {items.map((item: any) => (
          <Card 
            key={item.id}
            className="hover:shadow-md transition-all duration-200 cursor-pointer border-0 bg-white/70 backdrop-blur-sm hover:bg-white"
            onClick={() => navigate(type === 'bin' ? `/bin-details/${item.id}` : `/location-details/${item.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    type === 'bin' 
                      ? 'bg-gradient-to-br from-slate-100 to-slate-200' 
                      : 'bg-gradient-to-br from-blue-100 to-blue-200'
                  }`}>
                    {type === 'bin' ? (
                      <Package className="w-5 h-5 text-slate-600" />
                    ) : (
                      <MapPin className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-slate-500 truncate max-w-md">{item.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {type === 'bin' && item.qrcodeId && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                      {item?.qrcodeId ?? ""}
                    </Badge>
                  )}
                  <div className="text-right">
                    <div className="font-medium text-slate-900">
                      {type === 'bin' ? `${item?.itemCount ?? "0"} items` : `${item.binCount} bins`}
                    </div>
                    {type === 'bin' && (
                      <div className="text-xs text-slate-500">{item.updatedAt} ago</div>
                    )}
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const [stats, setStats] = useState({
    totalBins: 0,
    totalLocations: 0,
    totalItems: 0,
    recentActivity: 0
  });

  const fetchStats = async () => {
    if (!currentUser?.uid) return;

    try {
      const binsSnapshot = await getDocs(
        query(collection(db, 'bins'), where('userId', '==', currentUser.uid))
      );
      const binsData = binsSnapshot.docs.map((doc) => doc.data());

      const totalBins = binsData.length;

      const itemsSnapshot = await getDocs(
        query(collection(db, 'items'), where('userId', '==', currentUser.uid))
      );
      const itemsData = itemsSnapshot.docs.map((doc) => doc.data());

      const totalItems = itemsData.length;

      const locationsSnapshot = await getDocs(
        query(collection(db, 'locations'), where('userId', '==', currentUser.uid))
      );
      const totalLocations = locationsSnapshot.docs.map((doc) => doc.data()).length;

      setStats({
        totalBins,
        totalLocations,
        totalItems,
        recentActivity: 0 
      });

    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  //const currentPagination = activeTab === 'bins' ? binsPagination : locationsPagination;
  const currentData = activeTab === 'bins' ? filteredBins : filteredLocations;
  const currentSearchText = activeTab === 'bins' ? searchTextBins : searchTextLocations;
  const setCurrentSearchText = activeTab === 'bins' ? setSearchTextBins : setSearchTextLocations;

  if (loading && currentData.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-6 py-8">
          <div className="flex justify-center items-center min-h-96">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-200 border-t-emerald-600"></div>
              <p className="text-slate-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50 relative">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header con estadísticas */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Inventory Overview
              </h1>
              <p className="text-gray-600">Manage your inventory bins and locations efficiently</p>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-emerald-600 uppercase tracking-wide">Total Bins</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalBins}</p>
                  </div>
                  <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Package className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-blue-600 uppercase tracking-wide">Locations</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalLocations}</p>
                  </div>
                  <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <MapPin className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-purple-600 uppercase tracking-wide">Total Items</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalItems}</p>
                  </div>
                  <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)} className="space-y-8">
          {/* Tab navigation y controles */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <TabsList className="grid w-96 grid-cols-2 h-12 bg-gray-100 p-1 rounded-xl">
              <TabsTrigger 
                value="bins" 
                className="flex items-center gap-3 font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
              >
                <Package className="w-5 h-5" />
                Bins ({stats.totalBins})
              </TabsTrigger>
              <TabsTrigger 
                value="locations" 
                className="flex items-center gap-3 font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
              >
                <MapPin className="w-5 h-5" />
                Locations ({stats.totalLocations})
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="h-10 px-4 hover:bg-gray-50 transition-colors duration-200"
              >
                {viewMode === 'grid' ? <List className="w-4 h-4 mr-2" /> : <Grid className="w-4 h-4 mr-2" />}
                {viewMode === 'grid' ? 'List' : 'Grid'}
              </Button>
            </div>
          </div>

          {/* Barra de búsqueda */}
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              value={currentSearchText}
              onChange={(e) => setCurrentSearchText(e.target.value)}
              placeholder={activeTab === 'bins' ? 'Search bins and items...' : 'Search locations...'}
              className="pl-11 pr-12 h-11 bg-white border border-gray-200 focus:border-gray-300 focus:ring-2 focus:ring-gray-100 rounded-lg transition-all duration-200"
            />
            {currentSearchText && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentSearchText('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 w-9 p-0 hover:bg-gray-100 rounded-md"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Filtro de ubicación */}
          {filterLocation && (
            <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 border-blue-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Filter className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="font-semibold text-blue-900">Filtering by location:</span>
                      <span className="ml-2 text-blue-700 font-medium">{filterLocation.name}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearLocationFilter} className="hover:bg-blue-100 text-blue-600">
                    <X className="w-4 h-4 mr-2" />
                    Clear filter
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contenido de las tabs */}
          <TabsContent value="bins" className="space-y-6">
            {filteredBins.length === 0 ? (
              <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
                <CardContent className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchTextBins ? 'No bins found' : 'No bins yet'}
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                    {searchTextBins ? 'Try adjusting your search terms to find what you\'re looking for' : 'Create your first bin to start organizing your inventory'}
                  </p>
                  
                </CardContent>
              </Card>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredBins.map(renderBinCard)}
                  </div>
                ) : (
                  renderListView(filteredBins, 'bin')
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="locations" className="space-y-6">
            {filteredLocations.length === 0 ? (
              <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
                <CardContent className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchTextLocations ? 'No locations found' : 'No locations yet'}
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                    {searchTextLocations ? 'Try adjusting your search terms' : 'Create your first location to better organize your bins'}
                  </p>
                  {!searchTextLocations && (
                    <Button onClick={() => navigate('/add-location')} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Location
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredLocations.map(renderLocationCard)}
                  </div>
                ) : (
                  renderListView(filteredLocations, 'location')
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Paginación */}
        {currentData.length > 0 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {currentData.length} {activeTab === 'bins' ? 'bins' : 'locations'}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                className="hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                className="hover:bg-gray-50"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}