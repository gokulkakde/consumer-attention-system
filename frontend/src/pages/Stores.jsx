import React, { useEffect, useState } from 'react';
import { storeService } from '../services/api';
import { Plus, Edit2, Trash2, MapPin, Layers, Video, Search, X } from 'lucide-react';

export default function Stores() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Role permissions
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const roleName = user?.role?.name || 'Retail Analyst';
  const canEdit = ['Administrator', 'Store Manager'].includes(roleName);
  const canDelete = roleName === 'Administrator';

  useEffect(() => {
    loadStores();
  }, []);

  async function loadStores() {
    setLoading(true);
    try {
      const data = await storeService.list();
      setStores(data);
    } catch (e) {
      console.error('Error loading stores', e);
    } finally {
      setLoading(false);
    }
  }

  const openCreateModal = () => {
    setEditId(null);
    setName('');
    setLocation('');
    setDescription('');
    setError('');
    setIsOpen(true);
  };

  const openEditModal = (store) => {
    setEditId(store.id);
    setName(store.name);
    setLocation(store.location);
    setDescription(store.description || '');
    setError('');
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (editId) {
        await storeService.update(editId, { name, location, description });
      } else {
        await storeService.create({ name, location, description });
      }
      setIsOpen(false);
      loadStores();
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this store? This will delete all associated zones, shelves, and cameras.')) {
      try {
        await storeService.delete(id);
        loadStores();
      } catch (err) {
        alert(err.response?.data?.detail || 'Failed to delete store.');
      }
    }
  };

  const filteredStores = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 text-slate-100 min-h-screen bg-slate-950">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Stores</h1>
          <p className="text-slate-400 text-sm mt-1">Manage physical retail locations and mapping anchors.</p>
        </div>
        {canEdit && (
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg font-semibold shadow-lg hover:shadow-purple-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Store</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 bg-slate-900/40 border border-slate-850 p-4 rounded-xl backdrop-blur-sm">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search stores by name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          />
        </div>
      </div>

      {/* Stores Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/20 border border-dashed border-slate-850 rounded-2xl">
          <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-350">No stores found</h3>
          <p className="text-slate-500 text-sm mt-1">Get started by registering a new physical location.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map((store) => (
            <div
              key={store.id}
              className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-xl hover:border-slate-700/80 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  {canEdit && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditModal(store)}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                        title="Edit Store"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(store.id)}
                          className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                          title="Delete Store"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-bold text-white mt-4">{store.name}</h3>
                <span className="text-slate-455 text-xs font-semibold uppercase tracking-wider block mt-1">
                  {store.location}
                </span>
                <p className="text-slate-400 text-sm mt-3 line-clamp-3">
                  {store.description || 'No description provided.'}
                </p>
              </div>

              <div className="border-t border-slate-850 pt-4 mt-6 flex items-center justify-between text-xs text-slate-400">
                <span className="bg-slate-950/80 px-2.5 py-1.5 rounded-md border border-slate-850 font-medium">
                  ID: #{store.id}
                </span>
                <span>Registered: {new Date(store.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                {editId ? 'Edit Store Details' : 'Register New Store'}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg text-sm bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">Store Name</label>
                <input
                  type="text"
                  required
                  placeholder="Supermart Flagship Store"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">Location / City</label>
                <input
                  type="text"
                  required
                  placeholder="New York, Manhattan"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="Optional details, retail layout plan, size, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
