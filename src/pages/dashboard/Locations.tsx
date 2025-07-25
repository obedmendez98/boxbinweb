import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  MapPin,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Building,
  Calendar,
  X,
  Loader2,
  Check,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";
import { getStripePlanById } from "@/lib/stripe";

export const LocationsManager = () => {
  const { t } = useTranslation();
  // Estados principales
  const [locations, setLocations] = useState<any>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemAddress, setItemAddress] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [showAlert, setShowAlert] = useState({
    show: false,
    type: "",
    message: "",
  });
  const [editingId, setEditingId] = useState<any>(null);

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [totalLocations, setTotalLocations] = useState(0);

   // Auth & impersonation
  const { currentUser } = useAuth();
  const [userImpersonated, setUserImpersonated] = useState<any>(
    () => JSON.parse(localStorage.getItem('impersonatedUser') || 'null')
  );
  const effectiveUserId = userImpersonated?.ownerUserId || currentUser?.uid;

  // Estados para navegación de páginas
  const [pageSnapshots, setPageSnapshots] = useState(new Map());
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  const [subscription, setSubscription] = useState<any | null>(null);

  const fetchSubscription = async () => {
    if (!currentUser?.uid) return;

    try {
      const q = query(
        collection(db, "subscriptions"),
        where("userId", "==", effectiveUserId)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const sub = querySnapshot.docs[0].data();

        if (sub.planId) {
          const stripePlan = await getStripePlanById(sub.planId);

          console.log(stripePlan);
          const fullSubscription = {
            ...sub,
            plan: stripePlan?.product?.name ?? "Unknown Plan",
            price: (stripePlan?.unit_amount ?? 0) / 100,
            interval: stripePlan?.recurring?.interval ?? "month",
            metadata: stripePlan?.metadata ?? {},
          };

          console.log(fullSubscription);

          setSubscription(fullSubscription);
        } else {
          setSubscription(sub);
        }
      } else {
        console.log("❌ No se encontró suscripción para el usuario.");
      }
    } catch (error) {
      console.error("🔥 Error al obtener suscripción:", error);
    }
  };

  const clearImpersonation = () => {
    localStorage.removeItem('impersonatedUser');
    setUserImpersonated(null);
  };

  // Función para mostrar alertas
  const showAlertMessage = (type: any, message: any) => {
    setShowAlert({ show: true, type, message });
    setTimeout(
      () => setShowAlert({ show: false, type: "", message: "" }),
      4000
    );
  };

  // Función para obtener el total de ubicaciones
  const getTotalLocations = async () => {
    if (!currentUser) return;

    try {
      await fetchSubscription();

      const q = query(
        collection(db, "locations"),
        where("userId", "==", effectiveUserId)
      );
      const snapshot = await getDocs(q);
      setTotalLocations(snapshot.size);
    } catch (error) {
      console.error("Error getting total locations:", error);
    }
  };

  // Función para cargar ubicaciones con paginación
  const loadLocations = async (page = 1, isRefresh = false) => {
    if (!currentUser) return;

    setPageLoading(true);

    try {
      const locationsRef = collection(db, "locations");
      let q;

      // Construir query base
      const baseQuery = [
        where("userId", "==", effectiveUserId),
        orderBy(sortBy, sortOrder === "asc" ? "asc" : "desc"),
        limit(itemsPerPage + 1), // +1 para determinar si hay siguiente página
      ];

      if (page === 1 || isRefresh) {
        // Primera página o refresh
        q = query(locationsRef, ...baseQuery);
        setPageSnapshots(new Map());
      } else {
        // Páginas siguientes
        const pageSnapshot = pageSnapshots.get(page - 1);
        if (pageSnapshot) {
          q = query(locationsRef, ...baseQuery, startAfter(pageSnapshot));
        } else {
          // Si no tenemos el snapshot, volvemos a la primera página
          q = query(locationsRef, ...baseQuery);
          setCurrentPage(1);
        }
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;

      // Separar los documentos de la página actual y verificar si hay más
      const pageData = docs.slice(0, itemsPerPage);
      const hasMore = docs.length > itemsPerPage;

      const locationsData = pageData.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt:
          doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
      }));

      setLocations(locationsData);
      setHasNextPage(hasMore);
      setHasPrevPage(page > 1);

      // Guardar snapshots para navegación
      if (pageData.length > 0) {
        const newPageSnapshots = new Map(pageSnapshots);
        newPageSnapshots.set(page, pageData[pageData.length - 1]);
        setPageSnapshots(newPageSnapshots);

        //setLastVisible(pageData[pageData.length - 1]);
        //setFirstVisible(pageData[0]);
      }
    } catch (error) {
      console.error("Error loading locations:", error);
      showAlertMessage("error", "Error loading the locations");
    } finally {
      setPageLoading(false);
    }
  };

  // Función para filtrar ubicaciones localmente
  const getFilteredLocations = () => {
    if (!searchText.trim()) return locations;

    const searchTerm = searchText.toLowerCase();
    return locations.filter(
      (location: any) =>
        location.name.toLowerCase().includes(searchTerm) ||
        location.address?.toLowerCase().includes(searchTerm) ||
        location.description?.toLowerCase().includes(searchTerm)
    );
  };

  // Función para crear ubicación
  const handleSubmit = async () => {
    if (!itemName.trim() || !currentUser) return;
    // Verificar si ya alcanzó el límite
    if (totalLocations >= Number(subscription?.metadata?.locations)) {
      showAlertMessage(
        "error",
        `You have reached the limit of ${subscription?.metadata?.locations} locations for your plan.`
      );
      return;
    }

    setOperationLoading(true);
    try {
      const data = {
        name: itemName.trim(),
        address: itemAddress.trim(),
        description: itemDescription.trim(),
        createdAt: serverTimestamp(),
        userId: effectiveUserId,
      };

      await addDoc(collection(db, "locations"), data);

      // Resetear formulario
      setItemName("");
      setItemAddress("");
      setItemDescription("");
      setIsModalVisible(false);

      showAlertMessage("success", "Location created successfully");

      // Recargar datos
      await loadLocations(1, true);
      await getTotalLocations();
    } catch (error) {
      console.error("Error creating location:", error);
      showAlertMessage("error", "Error creating the location");
    } finally {
      setOperationLoading(false);
    }
  };

  // Función para actualizar ubicación
  const handleUpdateSubmit = async () => {
    if (!itemName.trim() || !editingId || !currentUser) {
      console.log(itemName);
      console.log(editingId);
      console.log(currentUser);
      return;
    }

    setOperationLoading(true);
    try {
      const locationRef = doc(db, "locations", editingId);
      await updateDoc(locationRef, {
        name: itemName.trim(),
        address: itemAddress.trim(),
        description: itemDescription.trim(),
        updatedAt: serverTimestamp(),
      });

      // Resetear formulario
      setItemName("");
      setItemAddress("");
      setItemDescription("");
      setIsEditModalVisible(false);
      setEditingId(null);
      setSelectedLocation(null);

      showAlertMessage("success", "Location updated successfully");

      // Recargar datos
      await loadLocations(currentPage);
    } catch (error) {
      console.error("Error updating location:", error);
      showAlertMessage("error", "Error updating the location");
    } finally {
      setOperationLoading(false);
    }
  };

  // Función para eliminar ubicación
  const confirmDeleteLocation = async (locationId: string) => {
    if (!window.confirm(t("locations.confirmDelete"))) {
      return;
    }

    setOperationLoading(true);
    try {
      await deleteDoc(doc(db, "locations", locationId));

      setSelectedLocation(null);
      showAlertMessage("success", "Location deleted successfully");
      // Recargar datos
      await loadLocations(currentPage);
      await getTotalLocations();
    } catch (error) {
      console.error("Error deleting location:", error);
      showAlertMessage("error", "Error deleting the location");
    } finally {
      setOperationLoading(false);
    }
  };

  // Función para manejar selección de ubicación
  const handleLocationSelect = (location: any) => {
    setSelectedLocation(selectedLocation?.id === location.id ? null : location);
  };

  // Función para manejar edición
  const handleEditLocation = (locationId: string) => {
    const location = locations.find((l: any) => l.id === locationId);
    if (location) {
      setEditingId(locationId);
      setItemName(location.name);
      setItemAddress(location.address || "");
      setItemDescription(location.description || "");
      setIsEditModalVisible(true);
    }
  };

  // Función para resetear formulario
  const resetForm = () => {
    setItemName("");
    setItemAddress("");
    setItemDescription("");
    setEditingId(null);
  };

  // Función para formatear fecha
  const formatDate = (date: any) => {
    if (!date) return "";
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Función para navegar páginas
  const handlePageChange = (newPage: any) => {
    if (newPage !== currentPage && newPage > 0) {
      setCurrentPage(newPage);
      loadLocations(newPage);
    }
  };

  // Función para refrescar datos
  const handleRefresh = () => {
    setCurrentPage(1);
    loadLocations(1, true);
    getTotalLocations();
  };

  // Efectos
  useEffect(() => {
    if (currentUser) {
      loadLocations(1, true);
      getTotalLocations();
    }
  }, [currentUser, itemsPerPage, sortBy, sortOrder]);

  useEffect(() => {
    if (currentUser) {
      // Listener en tiempo real para cambios en la colección
      const q = query(
        collection(db, "locations"),
        where("userId", "==", effectiveUserId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setTotalLocations(snapshot.size);
      });

      return () => unsubscribe();
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          {t("locations.mustSignIn")}
        </Alert>
      </div>
    );
  }

  const filteredLocations = getFilteredLocations();
  const totalPages = Math.ceil(totalLocations / itemsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Floating alert */}
      {showAlert.show && (
        <Alert
          className={`fixed top-4 right-4 z-50 max-w-md shadow-lg border-l-4 ${
            showAlert.type === "error"
              ? "border-l-red-500 bg-red-50 border-red-200"
              : "border-l-green-500 bg-green-50 border-green-200"
          } animate-in slide-in-from-right-full duration-300`}
        >
          <div className="flex items-center">
            {showAlert.type === "error" ? (
              <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
            ) : (
              <Check className="h-4 w-4 text-green-600 mr-2" />
            )}
            <AlertDescription
              className={
                showAlert.type === "error" ? "text-red-800" : "text-green-800"
              }
            >
              {t(`locations.alert.${showAlert.type}`, {
                message: showAlert.message,
              })}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Impersonation Header */}
      {userImpersonated && (
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="container mx-auto px-6 py-2 max-w-7xl flex items-center justify-end space-x-4">
            <span className="text-sm text-gray-500">
              {t('dashboard.by')} <strong>{userImpersonated?.ownerUsername}</strong>
            </span>
            <button
              onClick={clearImpersonation}
              className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors duration-200"
            >
              {t('dashboard.stopImpersonation')}
            </button>
          </div>
        </div>
      )}
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Building className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t("locations.title")}
              </h1>
              <p className="text-gray-600 mt-1">{t("locations.subtitle")}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={pageLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${pageLoading ? "animate-spin" : ""}`}
              />
              {t("locations.refresh")}
            </Button>
            <Badge variant="outline" className="px-3 py-1">
              {totalLocations} {t("locations.count")}
            </Badge>
            {totalLocations <= Number(subscription?.metadata?.locations) && (
              <Button
                onClick={() => {
                  resetForm();
                  setIsModalVisible(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("locations.new")}
              </Button>
            )}
          </div>
        </div>

        {/* Filters and search */}
        <Card className="mb-6 shadow-sm border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t("locations.searchPlaceholder")}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-10 pr-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
                {searchText && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-7 w-7"
                    onClick={() => setSearchText("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">
                      {t("locations.sort.name")}
                    </SelectItem>
                    <SelectItem value="createdAt">
                      {t("locations.sort.date")}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">
                      {t("locations.sort.asc")}
                    </SelectItem>
                    <SelectItem value="desc">
                      {t("locations.sort.desc")}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(v) => setItemsPerPage(parseInt(v))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {pageLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Content */}
        {!pageLoading && filteredLocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-6">
              <Building className="w-16 h-16 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {searchText.trim()
                ? t("locations.emptySearch")
                : t("locations.empty")}
            </h2>
            <p className="text-gray-600 mb-6 text-center max-w-md">
              {searchText.trim()
                ? t("locations.hintSearch")
                : t("locations.hintEmpty")}
            </p>
            {!searchText.trim() && (
              <Button
                onClick={() => {
                  resetForm();
                  setIsModalVisible(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("locations.createFirst")}
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Locations grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredLocations.map((location: any) => (
                <Card
                  key={location.id}
                  className={`group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 shadow-sm bg-white/80 backdrop-blur-sm ${
                    selectedLocation?.id === location.id
                      ? "ring-2 ring-blue-500 shadow-blue-100"
                      : "hover:shadow-gray-200"
                  }`}
                  onClick={() => handleLocationSelect(location)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                          <MapPin className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                            {location.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {formatDate(location.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditLocation(location.id);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {t("actions.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteLocation(location.id);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("actions.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {location.address && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {location.address}
                      </p>
                    )}
                    {location.description && (
                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                        {location.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="px-2 py-1 text-xs">
                        {t("locations.badge")}
                      </Badge>
                      {selectedLocation?.id === location.id && (
                        <div className="flex items-center gap-1">
                          <Check className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-600 font-medium">
                            {t("locations.selected")}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {!searchText && totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {t("locations.pagination.pageInfo", {
                    current: currentPage,
                    total: totalPages,
                    count: totalLocations,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!hasPrevPage || pageLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t("pagination.previous")}
                  </Button>
                  <span className="text-sm text-gray-600 px-3">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!hasNextPage || pageLoading}
                  >
                    {t("pagination.next")}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal for adding location */}
      <Dialog open={isModalVisible} onOpenChange={setIsModalVisible}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {t("locations.modal.newTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                {t("form.name")} *
              </Label>
              <Input
                id="name"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder={t("form.namePlaceholder")}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium">
                {t("form.address")}{" "}
                <span className="text-gray-500 font-normal">
                  ({t("form.optional")})
                </span>
              </Label>
              <Input
                id="address"
                value={itemAddress}
                onChange={(e) => setItemAddress(e.target.value)}
                placeholder={t("form.addressPlaceholder")}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                {t("form.description")}{" "}
                <span className="text-gray-500 font-normal">
                  ({t("form.optional")})
                </span>
              </Label>
              <Textarea
                id="description"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder={t("form.descriptionPlaceholder")}
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsModalVisible(false)}
                className="flex-1"
                disabled={operationLoading}
              >
                {t("actions.cancel")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!itemName.trim() || operationLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {operationLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("form.creating")}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("form.create")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Location Modal */}
      <Dialog open={isEditModalVisible} onOpenChange={setIsEditModalVisible}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {t("locations.modal.editTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm font-medium">
                {t("form.name")} *
              </Label>
              <Input
                id="edit-name"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder={t("form.namePlaceholder")}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address" className="text-sm font-medium">
                {t("form.address")}{" "}
                <span className="text-gray-500 font-normal">
                  ({t("form.optional")})
                </span>
              </Label>
              <Input
                id="edit-address"
                value={itemAddress}
                onChange={(e) => setItemAddress(e.target.value)}
                placeholder={t("form.addressPlaceholder")}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-sm font-medium">
                {t("form.description")}{" "}
                <span className="text-gray-500 font-normal">
                  ({t("form.optional")})
                </span>
              </Label>
              <Textarea
                id="edit-description"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder={t("form.descriptionPlaceholder")}
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditModalVisible(false)}
                className="flex-1"
                disabled={operationLoading}
              >
                {t("actions.cancel")}
              </Button>
              <Button
                onClick={handleUpdateSubmit}
                disabled={!itemName.trim() || operationLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {operationLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("form.updating")}
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    {t("form.update")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
