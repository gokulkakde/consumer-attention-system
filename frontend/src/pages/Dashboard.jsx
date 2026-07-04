import React, { useEffect, useState } from 'react';
import { 
  storeService, 
  zoneService,
  cameraService, 
  shelfService, 
  productService, 
  eventService,
  analyticsService
} from '../services/api';
import { 
  Store, 
  Video, 
  Layers, 
  Package, 
  TrendingUp, 
  Clock, 
  Activity,
  Award,
  Filter
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [storeId, setStoreId] = useState(null);
  const [events, setEvents] = useState([]);
  const [dwellDataList, setDwellDataList] = useState([]);
  const [attractivenessList, setAttractivenessList] = useState([]);
  
  // Dashboard stats
  const [stats, setStats] = useState({
    storesCount: 0,
    camerasCount: 0,
    shelvesCount: 0,
    productsCount: 0
  });

  // Storage listener for store change
  useEffect(() => {
    const handleStorageChange = () => {
      const currentStoreId = localStorage.getItem('selectedStoreId');
      if (currentStoreId) {
        setStoreId(parseInt(currentStoreId));
      } else {
        setStoreId(null);
      }
    };

    handleStorageChange();
    const interval = setInterval(handleStorageChange, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load stats, events, and analytics
  useEffect(() => {
    loadStats();
    loadEvents();
    loadAnalytics();
    
    // Refresh events and analytics from database every 5 seconds
    const interval = setInterval(() => {
      loadEvents();
      loadAnalytics();
    }, 5000);
    return () => clearInterval(interval);
  }, [storeId]);

  // Feed simulator: periodically pushes a simulated CV event to MongoDB
  useEffect(() => {
    const eventTemplates = [
      { message: 'Shopper #{id} paused at Shelf A (Chips) (Dwell: {dwell}s)', type: 'info' },
      { message: 'Attention spike detected on product "{product}" (+15%)', type: 'success' },
      { message: 'Camera feed "{camera}" fps drop detected: 18 fps', type: 'warning' },
      { message: 'Shopper #{id} completed checkout journey', type: 'info' }
    ];

    const interval = setInterval(async () => {
      if (!localStorage.getItem('token')) return;

      const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
      const mockId = Math.floor(Math.random() * 800) + 100;
      const mockDwell = Math.floor(Math.random() * 25) + 5;
      const productNames = ['Diet Coke 500ml', 'Lays Potato Chips 150g', 'Coca-Cola 330ml'];
      const cameraNames = ['Cam-02 Snacks Overhead', 'Cam-01 Entry', 'Cam-03 Checkouts'];

      const message = template.message
        .replace('{id}', mockId.toString())
        .replace('{dwell}', mockDwell.toString())
        .replace('{product}', productNames[Math.floor(Math.random() * productNames.length)])
        .replace('{camera}', cameraNames[Math.floor(Math.random() * cameraNames.length)]);

      try {
        await eventService.create(message, template.type);
        loadEvents();
      } catch (err) {
        console.error('Failed to log simulated event to MongoDB', err);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  async function loadStats() {
    try {
      const stores = await storeService.list();
      const products = await productService.list();
      let cameras = [];
      let shelves = [];

      if (storeId) {
        cameras = await cameraService.listByStore(storeId);
        const zones = await zoneService.listByStore(storeId);
        for (const zone of zones) {
          const zoneShelves = await shelfService.listByZone(zone.id);
          shelves.push(...zoneShelves);
        }
      }

      setStats({
        storesCount: stores.length,
        camerasCount: cameras.length,
        shelvesCount: shelves.length,
        productsCount: products.length
      });
    } catch (e) {
      console.error('Failed to load dashboard statistics', e);
    }
  }

  async function loadEvents() {
    try {
      const data = await eventService.list(10);
      setEvents(data);
    } catch (e) {
      console.error('Failed to retrieve events from MongoDB', e);
    }
  }

  async function loadAnalytics() {
    try {
      const dwells = await analyticsService.listDwellTimes();
      setDwellDataList(dwells);

      const attr = await analyticsService.listAttractiveness();
      setAttractivenessList(attr);
    } catch (e) {
      console.error('Failed to retrieve analytics', e);
    }
  }

  // --- Dynamic Chart Configuration ---
  
  // Dwell times per shelf chart
  const dwellLabels = attractivenessList.map(a => a.shelf_name) || ['Shelf A', 'Shelf B'];
  const dwellValues = attractivenessList.map(a => a.average_dwell_time) || [18.4, 24.2];

  const dwellChartData = {
    labels: dwellLabels.length > 0 ? dwellLabels : ['Shelf A (Chips)', 'Shelf B (Soda)'],
    datasets: [
      {
        label: 'Average Dwell Time (Seconds)',
        data: dwellValues.length > 0 ? dwellValues : [18.4, 24.2],
        backgroundColor: 'rgba(168, 85, 247, 0.45)',
        borderColor: '#a855f7',
        borderWidth: 1.5,
        borderRadius: 6
      }
    ]
  };

  const dwellChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false }
    },
    scales: {
      y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
      x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
    }
  };

  // Attractiveness scores chart
  const attrScores = attractivenessList.map(a => a.attractiveness_score * 100) || [65, 78];
  const attractivenessChartData = {
    labels: dwellLabels.length > 0 ? dwellLabels : ['Shelf A (Chips)', 'Shelf B (Soda)'],
    datasets: [
      {
        label: 'Attractiveness Score (%)',
        data: attrScores.length > 0 ? attrScores : [65, 78],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#3b82f6'
      }
    ]
  };

  const attractivenessChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' }, max: 100 },
      x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
    }
  };

  // Shopper Funnel Chart (Entrants -> Shelf Stop -> Product Interaction)
  const totalEntrants = stats.storesCount * 125 || 125;
  const shelfStops = attractivenessList.reduce((acc, curr) => acc + curr.interaction_count, 0) || 110;
  const productInteractions = Math.round(shelfStops * 0.72) || 79;

  const funnelChartData = {
    labels: ['Store Entrants', 'Shelf Dwellers', 'Shelf Interactions'],
    datasets: [
      {
        label: 'Customer Conversion Funnel',
        data: [totalEntrants, shelfStops, productInteractions],
        backgroundColor: [
          'rgba(30, 41, 59, 0.5)',
          'rgba(59, 130, 246, 0.4)',
          'rgba(16, 185, 129, 0.4)'
        ],
        borderColor: [
          '#475569',
          '#3b82f6',
          '#10b981'
        ],
        borderWidth: 1.5,
        borderRadius: 6
      }
    ]
  };

  return (
    <div className="p-8 space-y-8 text-slate-100 min-h-screen bg-slate-950">
      {/* Welcome Area */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Overview Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time shopper path metrics and shelf attention visibility.</p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stores Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Stores Registered</span>
            <span className="text-3xl font-black text-white block mt-1.5">{stats.storesCount}</span>
          </div>
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
            <Store className="w-6 h-6" />
          </div>
        </div>

        {/* Cameras Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Active Camera Feeds</span>
            <span className="text-3xl font-black text-white block mt-1.5">{stats.camerasCount}</span>
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <Video className="w-6 h-6" />
          </div>
        </div>

        {/* Shelves Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Mapped Shelves</span>
            <span className="text-3xl font-black text-white block mt-1.5">{stats.shelvesCount}</span>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Products Card */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Inventory Products</span>
            <span className="text-3xl font-black text-white block mt-1.5">{stats.productsCount}</span>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Dwell Time Chart */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-lg space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Shelf Dwell Times</span>
            </h3>
            <span className="text-xs text-slate-400">Live (Postgres)</span>
          </div>
          <div className="h-64 flex items-center">
            <Bar data={dwellChartData} options={dwellChartOptions} />
          </div>
        </div>

        {/* Attractiveness Chart */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-lg space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center space-x-2">
              <Award className="w-4 h-4 text-blue-400" />
              <span>Shelf Attractiveness</span>
            </h3>
            <span className="text-xs text-slate-400">Score (%)</span>
          </div>
          <div className="h-64 flex items-center">
            <Line data={attractivenessChartData} options={attractivenessChartOptions} />
          </div>
        </div>

        {/* Conversion Funnel Chart */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-lg space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center space-x-2">
              <Filter className="w-4 h-4 text-emerald-400" />
              <span>Attention Funnel</span>
            </h3>
            <span className="text-xs text-slate-400">Conversion</span>
          </div>
          <div className="h-64 flex items-center">
            <Bar 
              data={funnelChartData} 
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
                  x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Real-time events logging stream from MongoDB */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white flex items-center space-x-2">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Detection Streams Live Log (MongoDB)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">Status: Connected</span>
        </div>

        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-2">
          {events.length > 0 ? (
            events.map((evt) => (
              <div 
                key={evt.id || evt._id} 
                className="flex items-center justify-between bg-slate-950/60 border border-slate-850 px-4 py-3 rounded-lg text-sm animate-in slide-in-from-top-1"
              >
                <div className="flex items-center space-x-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    evt.type === 'warning' ? 'bg-amber-500' : evt.type === 'success' ? 'bg-emerald-500' : 'bg-purple-500'
                  }`} />
                  <span className="text-slate-350">{evt.message}</span>
                </div>
                <span className="text-xs text-slate-500 font-mono shrink-0 ml-4">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 italic py-2">No event records loaded from MongoDB.</p>
          )}
        </div>
      </div>
    </div>
  );
}
