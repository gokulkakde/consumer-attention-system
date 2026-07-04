import React, { useEffect, useState } from 'react';
import { storeService } from '../services/api';
import { Store, ChevronDown } from 'lucide-react';

export default function Header({ onStoreChange }) {
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');

  // Fetch stores list and auto-select
  useEffect(() => {
    async function loadStores() {
      try {
        const data = await storeService.list();
        setStores(data);
        if (data.length > 0) {
          const cachedStore = localStorage.getItem('selectedStoreId');
          const initialStoreId = cachedStore && data.some(s => s.id === parseInt(cachedStore))
            ? cachedStore
            : data[0].id.toString();
          setSelectedStoreId(initialStoreId);
          localStorage.setItem('selectedStoreId', initialStoreId);
          if (onStoreChange) onStoreChange(parseInt(initialStoreId));
        } else {
          if (onStoreChange) onStoreChange(null);
        }
      } catch (e) {
        console.error('Failed to load stores', e);
      }
    }
    loadStores();
  }, []);

  const handleStoreChange = (e) => {
    const storeIdStr = e.target.value;
    setSelectedStoreId(storeIdStr);
    localStorage.setItem('selectedStoreId', storeIdStr);
    if (onStoreChange) onStoreChange(parseInt(storeIdStr));
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8 text-slate-100">
      <div className="flex items-center space-x-2">
        <h2 className="text-md font-semibold text-slate-400">Retail Intelligence Hub</h2>
      </div>

      <div className="flex items-center space-x-4">
        {stores.length > 0 ? (
          <div className="relative flex items-center space-x-2 bg-slate-950/60 border border-slate-850 px-3 py-1.5 rounded-lg">
            <Store className="w-4 h-4 text-purple-400" />
            <select
              value={selectedStoreId}
              onChange={handleStoreChange}
              className="bg-transparent text-sm font-semibold text-slate-200 focus:outline-none pr-6 cursor-pointer appearance-none"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-slate-100">
                  {s.name} ({s.location})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 pointer-events-none" />
          </div>
        ) : (
          <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
            Please register a store first
          </span>
        )}
      </div>
    </header>
  );
}
