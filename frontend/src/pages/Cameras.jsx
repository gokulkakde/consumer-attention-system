import React, { useEffect, useState, useRef } from 'react';
import { cameraService, zoneService } from '../services/api';
import { Plus, Edit2, Trash2, Video, VideoOff, RefreshCw, X, Play, Info } from 'lucide-react';

export default function Cameras() {
  const [storeId, setStoreId] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [rtspUrl, setRtspUrl] = useState('');
  const [status, setStatus] = useState('active');
  const [zoneId, setZoneId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const roleName = user?.role?.name || 'Retail Analyst';
  const canEdit = ['Administrator', 'Store Manager'].includes(roleName);

  // Storage listener for store change
  useEffect(() => {
    const handleStorageChange = () => {
      const currentStoreId = localStorage.getItem('selectedStoreId');
      if (currentStoreId) {
        setStoreId(parseInt(currentStoreId));
      } else {
        setStoreId(null);
        setCameras([]);
        setSelectedCamera(null);
      }
    };

    handleStorageChange();
    const interval = setInterval(handleStorageChange, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch cameras and zones
  useEffect(() => {
    if (storeId) {
      loadCameras(storeId);
      loadZones(storeId);
    }
  }, [storeId]);

  async function loadCameras(sId) {
    setLoading(true);
    try {
      const data = await cameraService.listByStore(sId);
      setCameras(data);
      if (data.length > 0) {
        // Auto-select first camera if none selected
        if (!selectedCamera || !data.some(c => c.id === selectedCamera.id)) {
          setSelectedCamera(data[0]);
        }
      } else {
        setSelectedCamera(null);
      }
    } catch (e) {
      console.error('Error loading cameras', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadZones(sId) {
    try {
      const data = await zoneService.listByStore(sId);
      setZones(data);
    } catch (e) {
      console.error('Error loading zones', e);
    }
  }

  // --- Real-time CV Simulator ---
  useEffect(() => {
    if (!selectedCamera || selectedCamera.status !== 'active' || !canvasRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Mock shoppers parameters
    const shoppers = [
      { id: 104, x: 80, y: 150, targetX: 300, targetY: 200, speed: 1.2, color: '#aa3bff', size: 12, label: 'Gaze: Shelf A', dwell: 14 },
      { id: 211, x: 450, y: 100, targetX: 200, targetY: 300, speed: 0.8, color: '#3b82f6', size: 10, label: 'Dwell: 5s', dwell: 5 },
      { id: 312, x: 250, y: 350, targetX: 500, targetY: 150, speed: 1.5, color: '#10b981', size: 11, label: 'Gaze: Promo Display', dwell: 2 }
    ];

    let frameCount = 0;

    const render = () => {
      frameCount++;
      
      // 1. Draw Camera Feed Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid overlay
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Mock Shelf outlines
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      
      // Shelf A (Top Aisle)
      ctx.fillRect(50, 40, 220, 60);
      ctx.strokeRect(50, 40, 220, 60);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText('SHELF A (SNACKS)', 60, 75);

      // Shelf B (Bottom Aisle)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(350, 40, 220, 60);
      ctx.strokeRect(350, 40, 220, 60);
      ctx.fillStyle = '#64748b';
      ctx.fillText('SHELF B (BEVERAGES)', 360, 75);

      // 2. Draw Bounding Boxes and Paths
      shoppers.forEach(s => {
        // Move shopper toward target
        const dx = s.targetX - s.x;
        const dy = s.targetY - s.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > 5) {
          s.x += (dx / dist) * s.speed;
          s.y += (dy / dist) * s.speed;
        } else {
          // Choose new random target inside canvas
          s.targetX = Math.random() * (canvas.width - 100) + 50;
          s.targetY = Math.random() * (canvas.height - 100) + 50;
        }

        // Increment dwell counters occasionally
        if (frameCount % 60 === 0) {
          s.dwell += 1;
        }

        // Draw path line
        ctx.strokeStyle = `${s.color}22`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.targetX, s.targetY);
        ctx.stroke();

        // Draw bounding box representation
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        const boxSize = 30;
        ctx.strokeRect(s.x - boxSize/2, s.y - boxSize/2, boxSize, boxSize);

        // Dot
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Label details
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(`Shopper #${s.id}`, s.x - 15, s.y - 25);
        ctx.fillStyle = s.color;
        ctx.font = '9px monospace';
        ctx.fillText(`${s.label} (${s.dwell}s)`, s.x - 15, s.y - 15);
      });

      // 3. Draw Camera Metadata HUD overlays
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(10, 10, 200, 50);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.strokeRect(10, 10, 200, 50);

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(25, 25, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('LIVE STREAM', 35, 28);
      ctx.font = '9px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Cam: ${selectedCamera.name}`, 20, 48);
      
      const ts = new Date().toLocaleTimeString();
      ctx.fillText(`TS: ${ts} | FPS: 30`, 110, 28);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [selectedCamera]);

  // --- CRUD Handlers ---

  const openCreateModal = () => {
    setEditId(null);
    setName('');
    setRtspUrl('');
    setStatus('active');
    setZoneId(zones.length > 0 ? zones[0].id.toString() : '');
    setIsOpen(true);
  };

  const openEditModal = (cam) => {
    setEditId(cam.id);
    setName(cam.name);
    setRtspUrl(cam.rtsp_url);
    setStatus(cam.status);
    setZoneId(cam.zone_id ? cam.zone_id.toString() : '');
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const parsedZoneId = zoneId ? parseInt(zoneId) : null;
      if (editId) {
        await cameraService.update(editId, {
          name,
          rtsp_url: rtspUrl,
          status,
          zone_id: parsedZoneId
        });
      } else {
        await cameraService.create({
          name,
          rtsp_url: rtspUrl,
          status,
          store_id: storeId,
          zone_id: parsedZoneId
        });
      }
      setIsOpen(false);
      loadCameras(storeId);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving camera details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to unregister this camera?')) {
      try {
        await cameraService.delete(id);
        loadCameras(storeId);
      } catch (err) {
        alert(err.response?.data?.detail || 'Failed to delete camera.');
      }
    }
  };

  if (!storeId) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-950 min-h-screen">
        <Video className="w-12 h-12 mx-auto text-slate-700 mb-4" />
        <h2 className="text-xl font-bold text-white">No active store selected</h2>
        <p className="text-sm text-slate-500 mt-1">Please select or configure a store in the Header before managing cameras.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 text-slate-100 min-h-screen bg-slate-950 flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Cameras</h1>
          <p className="text-slate-400 text-sm mt-1">Register RTSP streams and assign video processing anchors to store zones.</p>
        </div>
        {canEdit && (
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg font-semibold shadow-lg hover:shadow-purple-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register Camera</span>
          </button>
        )}
      </div>

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1">
        {/* Left Column: Registered Cameras list */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-bold text-white flex items-center space-x-2">
              <Video className="w-4 h-4 text-purple-400" />
              <span>Registered Devices ({cameras.length})</span>
            </span>
            <button onClick={() => loadCameras(storeId)} className="text-slate-400 hover:text-white transition-all cursor-pointer">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : cameras.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">No cameras registered for this store.</div>
          ) : (
            <div className="space-y-3">
              {cameras.map((cam) => (
                <div
                  key={cam.id}
                  onClick={() => setSelectedCamera(cam)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    selectedCamera?.id === cam.id
                      ? 'bg-purple-600/10 border-purple-500/40'
                      : 'bg-slate-950/20 border-slate-850 hover:bg-slate-800/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white">{cam.name}</h4>
                      <span className="text-xs text-slate-500 font-mono block truncate mt-1">
                        {cam.rtsp_url}
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                      cam.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : cam.status === 'maintenance'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {cam.status}
                    </span>
                  </div>

                  <div className="border-t border-slate-850 pt-3 mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>Zone: {zones.find(z => z.id === cam.zone_id)?.name || 'Unassigned'}</span>
                    
                    {canEdit && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(cam);
                          }}
                          className="p-1 hover:bg-slate-850 rounded text-slate-400 hover:text-white transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(cam.id);
                          }}
                          className="p-1 hover:bg-rose-500/10 rounded text-slate-400 hover:text-rose-455 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Live Stream Bounding Box Simulator */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white flex items-center space-x-2">
              <Play className="w-4 h-4 text-purple-400" />
              <span>Real-Time CV Feed Preview</span>
            </h3>
          </div>

          {!selectedCamera ? (
            <div className="text-center py-24 text-slate-500">
              Please register or select a camera device to activate the feed.
            </div>
          ) : selectedCamera.status !== 'active' ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <VideoOff className="w-12 h-12 text-slate-700 mb-4" />
              <h4 className="text-md font-semibold text-slate-350">Camera offline</h4>
              <p className="text-xs text-slate-500 mt-1">This camera is set to: {selectedCamera.status}.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative border border-slate-850 rounded-xl overflow-hidden shadow-2xl">
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={400}
                  className="w-full h-auto aspect-[16/10] bg-slate-950 block"
                />
              </div>
              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex items-start space-x-3 text-xs text-slate-400">
                <Info className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-300">Simulated Retail CV Analysis Engine</h4>
                  <p className="mt-1 leading-relaxed">
                    This simulator mimics deep-learning analytical frameworks. Moving points indicate shoppers, green vectors show gaze directions towards product shelves, and dwell counters trigger real-time attractiveness scores.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Register / Edit Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                {editId ? 'Edit Camera Specs' : 'Register Camera Feed'}
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-355 uppercase tracking-wider">Camera Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aisle 3 Overhead Camera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-355 uppercase tracking-wider">RTSP Stream URL</label>
                <input
                  type="text"
                  required
                  placeholder="rtsp://admin:secret@192.168.1.50:554/live"
                  value={rtspUrl}
                  onChange={(e) => setRtspUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-355 uppercase tracking-wider">Stream Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    <option value="active" className="bg-slate-900">Active</option>
                    <option value="inactive" className="bg-slate-900">Inactive / Offline</option>
                    <option value="maintenance" className="bg-slate-900">Maintenance</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-355 uppercase tracking-wider">Assign to Zone</label>
                  <select
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    <option value="" className="bg-slate-900">None / Global Store</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id} className="bg-slate-900">
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                  {submitting ? 'Registering...' : 'Save Camera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
