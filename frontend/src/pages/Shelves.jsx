import React, { useEffect, useState } from 'react';
import { zoneService, shelfService, productService } from '../services/api';
import { Plus, Edit2, Trash2, Folder, Layers, Package, X, Check } from 'lucide-react';

export default function Shelves() {
  const [storeId, setStoreId] = useState(null);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [shelves, setShelves] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingShelves, setLoadingShelves] = useState(false);

  // Modal control
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [shelfModalOpen, setShelfModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  
  // Zone Form State
  const [zoneEditId, setZoneEditId] = useState(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneDesc, setZoneDesc] = useState('');

  // Shelf Form State
  const [shelfEditId, setShelfEditId] = useState(null);
  const [shelfName, setShelfName] = useState('');
  const [shelfLayout, setShelfLayout] = useState('{"height": 4, "columns": 3}');

  // Product Assignment State
  const [assignShelfId, setAssignShelfId] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [placementPosition, setPlacementPosition] = useState('Middle Tier');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const roleName = user?.role?.name || 'Retail Analyst';
  const canEdit = ['Administrator', 'Store Manager'].includes(roleName);

  // Poll local storage for store change periodically (in case Header changes it)
  useEffect(() => {
    const handleStorageChange = () => {
      const currentStoreId = localStorage.getItem('selectedStoreId');
      if (currentStoreId) {
        setStoreId(parseInt(currentStoreId));
      } else {
        setStoreId(null);
        setZones([]);
        setSelectedZone(null);
        setShelves([]);
      }
    };

    handleStorageChange();
    const interval = setInterval(handleStorageChange, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reload zones when store changes
  useEffect(() => {
    if (storeId) {
      loadZones(storeId);
      loadProducts();
    }
  }, [storeId]);

  // Reload shelves when active zone changes
  useEffect(() => {
    if (selectedZone) {
      loadShelves(selectedZone.id);
    } else {
      setShelves([]);
    }
  }, [selectedZone]);

  async function loadZones(sId) {
    setLoadingZones(true);
    try {
      const data = await zoneService.listByStore(sId);
      setZones(data);
      if (data.length > 0) {
        // Auto-select first zone if none active or previous not in new store
        if (!selectedZone || !data.some(z => z.id === selectedZone.id)) {
          setSelectedZone(data[0]);
        }
      } else {
        setSelectedZone(null);
      }
    } catch (e) {
      console.error('Error loading zones', e);
    } finally {
      setLoadingZones(false);
    }
  }

  async function loadShelves(zId) {
    setLoadingShelves(true);
    try {
      const data = await shelfService.listByZone(zId);
      setShelves(data);
    } catch (e) {
      console.error('Error loading shelves', e);
    } finally {
      setLoadingShelves(false);
    }
  }

  async function loadProducts() {
    try {
      const data = await productService.list();
      setProducts(data);
      if (data.length > 0) {
        setSelectedProductId(data[0].id.toString());
      }
    } catch (e) {
      console.error('Error loading products', e);
    }
  }

  // --- Zone CRUD Handlers ---

  const handleCreateZone = () => {
    setZoneEditId(null);
    setZoneName('');
    setZoneDesc('');
    setZoneModalOpen(true);
  };

  const handleEditZone = (zone) => {
    setZoneEditId(zone.id);
    setZoneName(zone.name);
    setZoneDesc(zone.description || '');
    setZoneModalOpen(true);
  };

  const handleSaveZone = async (e) => {
    e.preventDefault();
    try {
      if (zoneEditId) {
        await zoneService.update(zoneEditId, { name: zoneName, description: zoneDesc });
      } else {
        await zoneService.create({ name: zoneName, description: zoneDesc, store_id: storeId });
      }
      setZoneModalOpen(false);
      loadZones(storeId);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving zone.');
    }
  };

  const handleDeleteZone = async (id) => {
    if (window.confirm('Are you sure you want to delete this zone? All shelves in this zone will be deleted.')) {
      try {
        await zoneService.delete(id);
        loadZones(storeId);
      } catch (err) {
        alert(err.response?.data?.detail || 'Failed to delete zone.');
      }
    }
  };

  // --- Shelf CRUD Handlers ---

  const handleCreateShelf = () => {
    setShelfEditId(null);
    setShelfName('');
    setShelfLayout('{"height_meters": 1.8, "width_meters": 1.2}');
    setShelfModalOpen(true);
  };

  const handleEditShelf = (shelf) => {
    setShelfEditId(shelf.id);
    setShelfName(shelf.name);
    setShelfLayout(JSON.stringify(shelf.layout_details));
    setShelfModalOpen(true);
  };

  const handleSaveShelf = async (e) => {
    e.preventDefault();
    let layoutObj = {};
    try {
      layoutObj = JSON.parse(shelfLayout);
    } catch (err) {
      alert('Layout Details must be valid JSON.');
      return;
    }

    try {
      if (shelfEditId) {
        await shelfService.update(shelfEditId, { name: shelfName, layout_details: layoutObj });
      } else {
        await shelfService.create({ name: shelfName, layout_details: layoutObj, zone_id: selectedZone.id });
      }
      setShelfModalOpen(false);
      loadShelves(selectedZone.id);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving shelf.');
    }
  };

  const handleDeleteShelf = async (id) => {
    if (window.confirm('Are you sure you want to delete this shelf?')) {
      try {
        await shelfService.delete(id);
        loadShelves(selectedZone.id);
      } catch (err) {
        alert(err.response?.data?.detail || 'Failed to delete shelf.');
      }
    }
  };

  // --- Product Assignment Handlers ---

  const openAssignModal = (shelfId) => {
    setAssignShelfId(shelfId);
    setPlacementPosition('Middle Tier');
    setAssignModalOpen(true);
  };

  const handleAssignProduct = async (e) => {
    e.preventDefault();
    if (!selectedProductId) {
      alert('Please select a product.');
      return;
    }
    try {
      await shelfService.assignProduct(assignShelfId, parseInt(selectedProductId), placementPosition);
      setAssignModalOpen(false);
      loadShelves(selectedZone.id);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to assign product.');
    }
  };

  const handleRemoveProduct = async (shelfId, productId) => {
    if (window.confirm('Remove this product from the shelf?')) {
      try {
        await shelfService.removeProduct(shelfId, productId);
        loadShelves(selectedZone.id);
      } catch (err) {
        alert(err.response?.data?.detail || 'Failed to remove product.');
      }
    }
  };

  if (!storeId) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-950 min-h-screen">
        <Folder className="w-12 h-12 mx-auto text-slate-700 mb-4" />
        <h2 className="text-xl font-bold text-white">No active store selected</h2>
        <p className="text-sm text-slate-500 mt-1">Please create and configure a store in the Header before managing zones.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 text-slate-100 min-h-screen bg-slate-950 flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Shelves & Zones</h1>
          <p className="text-slate-400 text-sm mt-1">Map physical layout areas and associate inventory items to shelves.</p>
        </div>
      </div>

      {/* Split Layout Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-start">
        {/* Left Column: Zones List */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-bold text-white flex items-center space-x-2">
              <Folder className="w-4 h-4 text-purple-400" />
              <span>Store Zones ({zones.length})</span>
            </span>
            {canEdit && (
              <button
                onClick={handleCreateZone}
                className="p-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 rounded-lg transition-all cursor-pointer"
                title="Create Zone"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {loadingZones ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : zones.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No zones registered.</div>
          ) : (
            <div className="space-y-2">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZone(zone)}
                  className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all flex items-start justify-between ${
                    selectedZone?.id === zone.id
                      ? 'bg-purple-600/10 border-purple-500/40 text-white'
                      : 'bg-slate-950/20 border-slate-850 hover:bg-slate-800/20 text-slate-350'
                  }`}
                >
                  <div className="overflow-hidden pr-2">
                    <h4 className="font-semibold truncate">{zone.name}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                      {zone.description || 'No description.'}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditZone(zone);
                        }}
                        className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-all cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteZone(zone.id);
                        }}
                        className="p-1.5 hover:bg-rose-500/10 rounded-md text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Shelves List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <span className="font-bold text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>
                  Shelves in {selectedZone ? `"${selectedZone.name}"` : 'Selected Zone'} ({shelves.length})
                </span>
              </span>
              {selectedZone && canEdit && (
                <button
                  onClick={handleCreateShelf}
                  className="flex items-center space-x-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Shelf</span>
                </button>
              )}
            </div>

            {!selectedZone ? (
              <div className="text-center py-12 text-slate-500">
                Please select or create a zone on the left to manage its shelves.
              </div>
            ) : loadingShelves ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : shelves.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No shelves configured in this zone.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {shelves.map((shelf) => (
                  <div
                    key={shelf.id}
                    className="bg-slate-950/40 border border-slate-850 rounded-xl p-5 shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white text-lg">{shelf.name}</h4>
                        {canEdit && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleEditShelf(shelf)}
                              className="p-1.5 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteShelf(shelf.id)}
                              className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-455 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Layout specs */}
                      <div className="text-[10px] text-slate-500 font-mono mt-1">
                        Specs: {JSON.stringify(shelf.layout_details)}
                      </div>

                      {/* Products on Shelf */}
                      <div className="mt-4 space-y-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                          Assigned Products ({shelf.products?.length || 0})
                        </span>
                        
                        {shelf.products?.length > 0 ? (
                          <div className="space-y-1.5">
                            {shelf.products.map((sp) => (
                              <div
                                key={sp.product_id}
                                className="flex items-center justify-between bg-slate-900/50 border border-slate-850 px-2.5 py-1.5 rounded-lg text-xs"
                              >
                                <span className="flex items-center space-x-1.5 overflow-hidden">
                                  <Package className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  <span className="text-slate-200 font-medium truncate">
                                    {sp.product?.name || 'Unknown Product'}
                                  </span>
                                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                    {sp.position}
                                  </span>
                                </span>
                                {canEdit && (
                                  <button
                                    onClick={() => handleRemoveProduct(shelf.id, sp.product_id)}
                                    className="text-slate-500 hover:text-rose-400 p-0.5 hover:bg-slate-800 rounded transition-all cursor-pointer"
                                    title="Unassign Product"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No products mapped.</p>
                        )}
                      </div>
                    </div>

                    {canEdit && (
                      <div className="border-t border-slate-850 pt-3 mt-5 flex items-center justify-between">
                        <button
                          onClick={() => openAssignModal(shelf.id)}
                          className="flex items-center space-x-1 text-xs text-purple-400 hover:text-purple-300 font-semibold transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Assign Product</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zone Create/Edit Modal */}
      {zoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                {zoneEditId ? 'Edit Zone Details' : 'Create New Zone'}
              </h2>
              <button onClick={() => setZoneModalOpen(false)} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveZone} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">Zone Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Snacks & Beverages"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="Describe zone layout or category rules."
                  value={zoneDesc}
                  onChange={(e) => setZoneDesc(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setZoneModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-lg transition-all cursor-pointer"
                >
                  Save Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shelf Create/Edit Modal */}
      {shelfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                {shelfEditId ? 'Edit Shelf Specs' : 'Create New Shelf'}
              </h2>
              <button onClick={() => setShelfModalOpen(false)} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveShelf} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">Shelf Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aisle 3 Shelf A"
                  value={shelfName}
                  onChange={(e) => setShelfName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">Layout Specs (JSON)</label>
                <textarea
                  required
                  placeholder='{"height_meters": 1.8, "width_meters": 1.2}'
                  value={shelfLayout}
                  onChange={(e) => setShelfLayout(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setShelfModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-lg transition-all cursor-pointer"
                >
                  Save Shelf
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Assignment Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">Assign Product to Shelf</h2>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignProduct} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">Select Product</label>
                {products.length > 0 ? (
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                        {p.name} (SKU: {p.sku})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                    No products registered in system. Please register a product first.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">Position on Shelf</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Top Tier Left"
                  value={placementPosition}
                  onChange={(e) => setPlacementPosition(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={products.length === 0}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  Assign Placement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
