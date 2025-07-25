import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "../../components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Grid, List, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";

type LabelType = {
  dateCreated: string;
  field: string;
  guid: string;
  isUsed: boolean;
  order_key: string;
  qrcodeId: string;
  userId: string;
};

const generateQrCodeId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const SmartLabelsPage = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [allLabels, setAllLabels] = useState<LabelType[]>([]);
  const [labels, setLabels] = useState<LabelType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTags, setSearchTags] = useState<string[]>([]);
  //const [isUsedFilter, setIsUsedFilter] = useState<boolean | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  //const [showTemplateButton, setShowTemplateButton] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      fetchLabels();
    }
  }, [currentUser]);

  useEffect(() => {
    let filtered = [...allLabels];

    // Combine search term and tags for filtering
    const allSearchTerms = [
      ...searchTerm
        .split(",")
        .map((term) => term.trim().toUpperCase())
        .filter(Boolean),
      ...searchTags.map((tag) => tag.toUpperCase()),
    ];

    if (allSearchTerms.length > 0) {
      filtered = filtered.filter((label) =>
        allSearchTerms.includes(label.qrcodeId.toUpperCase())
      );
    }

    //if (isUsedFilter !== null) {
    //filtered = filtered.filter((label) => label.isUsed === isUsedFilter);
    //}

    if (startDate) {
      filtered = filtered.filter(
        (label) => new Date(label.dateCreated) >= startDate
      );
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (label) => new Date(label.dateCreated) <= endOfDay
      );
    }

    const selectedData = allLabels.filter((l) =>
      selectedLabels.includes(l.guid)
    );

    const combined = [...selectedData, ...filtered];
    const finalLabels = combined.filter(
      (v, i, a) => a.findIndex((t) => t.guid === v.guid) === i
    );

    setLabels(finalLabels);
  }, [searchTerm, startDate, endDate, selectedLabels, allLabels]);

  const fetchLabels = async (): Promise<void> => {
    try {
      if (!currentUser) return;
      setIsLoading(true);

      const labelsRef = collection(db, "smartlabels");
      const q = query(labelsRef, where("userId", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);

      const labelsData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          dateCreated: data.dateCreated,
          field: data.field,
          guid: data.guid || doc.id,
          isUsed: data.isUsed,
          order_key: data.order_key,
          qrcodeId: data.qrcodeId,
          userId: data.userId,
        } as LabelType;
      });

      setAllLabels(labelsData);
    } catch (error) {
      console.error("Error fetching labels:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLabelSelect = (guid: string) => {
    setSelectedLabels((prevSelected) =>
      prevSelected.includes(guid)
        ? prevSelected.filter((id) => id !== guid)
        : [...prevSelected, guid]
    );
  };

  const handleCreateLabel = async (label: { field: string }) => {
    try {
      if (!currentUser) return;
      setIsLoading(true);

      const batch = writeBatch(db);
      const now = new Date().toISOString();

      for (let i = 0; i < quantity; i++) {
        const guid =
          self.crypto?.randomUUID() ||
          Math.random().toString(36).substring(2) + Date.now().toString(36);
        const qrcodeId = generateQrCodeId();

        const labelData = {
          dateCreated: now,
          field: `${label.field} ${quantity > 1 ? `(${i + 1})` : ""}`.trim(),
          guid,
          isUsed: false,
          order_key: "",
          qrcodeId,
          userId: currentUser.uid,
        };

        const docRef = doc(collection(db, "smartlabels"));
        batch.set(docRef, labelData);
      }

      await batch.commit();
      fetchLabels();
    } catch (error) {
      console.error("Error creating labels:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Smart Labels</h1>
          <p className="text-gray-600 mt-1">
            Manage and organize your QR code labels
          </p>
        </div>
        {selectedLabels.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700">
              <span className="font-medium">{selectedLabels.length}</span> label
              {selectedLabels.length !== 1 ? "s" : ""} selected
            </div>
            <Button
              variant="default"
              onClick={() => {
                navigate("/smart-labels/templates", {
                  state: {
                    selectedQRCodes: selectedLabels,
                  },
                });
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Generate Template
            </Button>
          </div>
        )}
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Filters & Search
        </h2>

        {/* Search Section */}
        <div className="space-y-4 mb-6">
          <div className="space-y-3">
            <Label
              htmlFor="search"
              className="text-sm font-medium text-gray-700"
            >
              Search by QR Code IDs
            </Label>

            {/* Search Tags */}
            {searchTags.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
                {searchTags.map((tag, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm shadow-sm"
                  >
                    <span className="text-gray-700">{tag}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newTags = searchTags.filter(
                          (_, i) => i !== index
                        );
                        setSearchTags(newTags);

                        if (newTags.length === 0) {
                          setLabels(allLabels);
                        } else {
                          setLabels(
                            allLabels.filter((label) =>
                              newTags.some((term) =>
                                label.qrcodeId
                                  .toLowerCase()
                                  .includes(term.toLowerCase())
                              )
                            )
                          );
                        }
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSearchTags([]);
                    setLabels(allLabels);
                  }}
                  className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="search"
                placeholder="Enter QR Code IDs (comma separated)"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
                    e.preventDefault();
                    const value = searchTerm.trim();
                    if (value && !searchTags.includes(value)) {
                      const newTags = [...searchTags, value];
                      setSearchTags(newTags);
                      setSearchTerm("");

                      setLabels(
                        allLabels.filter((label) =>
                          newTags.some((term) =>
                            label.qrcodeId
                              .toLowerCase()
                              .includes(term.toLowerCase())
                          )
                        )
                      );
                    } else {
                      setSearchTerm("");
                    }
                  }
                }}
                className="pl-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Date Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Start Date
              </Label>
              <DatePicker
                selected={startDate}
                onChange={(date: Date | null) => setStartDate(date)}
                selectsStart
                startDate={startDate || undefined}
                endDate={endDate || undefined}
                className="w-full h-11 border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                placeholderText="Select start date"
                maxDate={new Date()}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                End Date
              </Label>
              <DatePicker
                selected={endDate}
                onChange={(date: Date | null) => setEndDate(date)}
                selectsEnd
                startDate={startDate || undefined}
                endDate={endDate || undefined}
                className="w-full h-11 border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                placeholderText="Select end date"
                minDate={startDate || undefined}
                maxDate={new Date()}
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="outline"
                onClick={() => {
                  setStartDate(null);
                  setEndDate(null);
                }}
                className="h-11 border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Clear Dates
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="gap-2 border-gray-300"
          >
            {viewMode === "grid" ? (
              <>
                <List className="h-4 w-4" />
                List View
              </>
            ) : (
              <>
                <Grid className="h-4 w-4" />
                Grid View
              </>
            )}
          </Button>

          {labels.length > 0 && (
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{labels.length}</span> label
              {labels.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        <Button
          onClick={() => setShowQuantityModal(true)}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Creating...
            </>
          ) : (
            "Create Label"
          )}
        </Button>
      </div>

      {/* Content Area */}
      {labels.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <div className="text-gray-400 mb-2">
            <Search className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No labels found
          </h3>
          <p className="text-gray-600">
            Try adjusting your search filters or create a new label.
          </p>
        </div>
      ) : (
        <>
          {/* List View */}
          {viewMode === "list" && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="divide-y divide-gray-200">
                {labels.map((label) => (
                  <div
                    key={label.guid}
                    className="p-4 hover:bg-gray-50 transition-colors flex items-center space-x-4"
                  >
                    <Checkbox
                      checked={selectedLabels.includes(label.guid)}
                      onCheckedChange={() => handleLabelSelect(label.guid)}
                      className="border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            QR Code: {label.qrcodeId}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Field: {label.field}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500 mb-2">
                            Created:{" "}
                            {new Date(label.dateCreated).toLocaleString()}
                          </div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              label.isUsed
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {label.isUsed ? "Used" : "Available"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid View */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {labels.map((label) => (
                <Card
                  key={label.guid}
                  className="hover:shadow-lg transition-all duration-200 border-gray-200"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedLabels.includes(label.guid)}
                        onCheckedChange={() => handleLabelSelect(label.guid)}
                        className="mt-1 border-gray-300"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          QR Code: {label.qrcodeId}
                        </div>
                        <div className="text-sm text-gray-600 mt-1 truncate">
                          Field: {label.field}
                        </div>
                        <div className="text-xs text-gray-500 mt-3">
                          {new Date(label.dateCreated).toLocaleDateString()}
                        </div>
                        <div className="mt-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              label.isUsed
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {label.isUsed ? "Used" : "Available"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showQuantityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Create New Labels
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                Specify how many labels you want to create
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of labels to create:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter quantity"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 rounded-b-xl">
              <Button
                variant="outline"
                onClick={() => setShowQuantityModal(false)}
                className="border-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowQuantityModal(false);
                  handleCreateLabel({
                    field: `New Label ${
                      quantity > 1 ? "(x" + quantity + ")" : ""
                    }`,
                  });
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Create {quantity > 1 ? `${quantity} Labels` : "Label"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
