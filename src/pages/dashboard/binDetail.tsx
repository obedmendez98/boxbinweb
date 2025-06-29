import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  deleteDoc
} from 'firebase/firestore';
//import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useParams } from 'react-router-dom';
import { db } from '@/lib/firebase';

interface BinDetails {
  name: string;
  description: string;
  address: string;
  createdAt: string;
  location: any;
  notes: any;
}

interface Item {
  id: string;
  name: string;
  description: string;
  tags: string[];
  createdAt: string;
  binId: string;
  imageUrl?: string;
  notes: any;
  value: any;
}

const ITEMS_PER_PAGE = 10;

export default function BinDetailsPage() {
  const { id } = useParams();
  //const navigate = useNavigate();

  const [bin, setBin] = useState<BinDetails | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [itemsPagination, setItemsPagination] = useState({
    page: 1,
    hasNextPage: false,
    startAfterDoc: null as any,
  });

  useEffect(() => {
    console.log(loading);
    const fetchBinDetails = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const binDoc = await getDoc(doc(db, 'bins', id));
        if (binDoc.exists()) {
          setBin(binDoc.data() as BinDetails);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBinDetails();
  }, [id]);

  const fetchItems = async (page: number = 1, startAfterDoc: any = null) => {
    if (!id) return;
    setLoading(true);
    try {
      let q = query(
        collection(db, 'items'),
        where('binId', '==', id),
        orderBy('createdAt', 'desc'),
        limit(ITEMS_PER_PAGE)
      );
      if (startAfterDoc) {
        q = query(
          collection(db, 'items'),
          where('binId', '==', id),
          orderBy('createdAt', 'desc'),
          startAfter(startAfterDoc),
          limit(ITEMS_PER_PAGE)
        );
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Item[];
      setItems(data);
      setItemsPagination({
        page,
        hasNextPage: data.length === ITEMS_PER_PAGE,
        startAfterDoc: snapshot.docs[snapshot.docs.length - 1],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [id]);

  useEffect(() => {
    setFilteredItems(
      items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    );
  }, [items, searchQuery]);

  const handleImageUpload = async (file: File) => {
    console.log(file)
    //const fileRef = ref(storage, `items/${file.name}-${Date.now()}`);
    //await uploadBytes(fileRef, file);
    //return await getDownloadURL(fileRef);
  };

  const handleDeleteItem = async (itemId: string, imageUrl?: string) => {
    try {
      await deleteDoc(doc(db, 'items', itemId));
      if (imageUrl) {
        //const fileRef = ref(storage, decodeURIComponent(imageUrl.split('/o/')[1].split('?')[0]));
        //await deleteObject(fileRef);
      }
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Bin Details</h1>
      {bin && (
        <div className="mb-4">
          <p><strong>Name:</strong> {bin.name}</p>
          <p><strong>Description:</strong> {bin.description}</p>
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search items..."
          className="border px-2 py-1"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => (
          <div key={item.id} className="border rounded p-4">
            <h2 className="font-semibold">{item.name}</h2>
            <p>{item.description}</p>
            {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="mt-2 w-full h-32 object-cover" />}
            <button
              className="mt-2 bg-red-500 text-white px-2 py-1 rounded"
              onClick={() => handleDeleteItem(item.id, item.imageUrl)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {itemsPagination.hasNextPage && (
        <button
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => fetchItems(itemsPagination.page + 1, itemsPagination.startAfterDoc)}
        >
          Load More
        </button>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Upload New Item Image</h2>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        {selectedImageFile && (
          <button
            className="ml-4 bg-green-500 text-white px-4 py-2 rounded"
            onClick={async () => {
              const url = await handleImageUpload(selectedImageFile);
              alert(`Image uploaded: ${url}`);
              setSelectedImageFile(null);
            }}
          >
            Upload
          </button>
        )}
      </div>
    </div>
  );
}
