import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, X, MapPin, Shield, Info, ZoomIn, ZoomOut, Layers } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { latLngToCell, cellToBoundary, gridDisk, cellToLatLng } from 'h3-js';
import HexBackground from '../components/HexBackground';

const RES = 9;

function generateVisibleHexagons(centerLat, centerLng, ringSize = 6) {
  const center = latLngToCell(centerLat, centerLng, RES);
  return gridDisk(center, ringSize);
}

function HexLayer({ hexagons, claimedMap, selectedHex, onHexClick }) {
  return (
    <>
      {hexagons.map(h3Index => {
        const boundary = cellToBoundary(h3Index);
        const positions = boundary.map(([lat, lng]) => [lat, lng]);
        const claimed = claimedMap[h3Index];
        const isSelected = selectedHex === h3Index;

        let color, fillColor, fillOpacity, weight;
        if (isSelected) {
          color = '#ffffff'; fillColor = '#ffffff'; fillOpacity = 0.15; weight = 2.5;
        } else if (claimed) {
          color = '#4ade80'; fillColor = '#4ade80'; fillOpacity = 0.25; weight = 1.5;
        } else {
          color = '#22c55e'; fillColor = '#22c55e'; fillOpacity = 0.04; weight = 0.6;
        }

        return (
          <Polygon
            key={h3Index}
            positions={positions}
            pathOptions={{ color, fillColor, fillOpacity, weight, dashArray: claimed ? null : '3,3' }}
            eventHandlers={{ click: () => onHexClick(h3Index, claimed) }}
          />
        );
      })}
    </>
  );
}

function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 15, { animate: true });
  }, [center]);
  return null;
}

function DynamicHexLoader({ onHexagonsChange, zoom }) {
  useMapEvents({
    moveend(e) {
      if (zoom < 12) return;
      const { lat, lng } = e.target.getCenter();
      const ring = zoom >= 15 ? 5 : zoom >= 13 ? 3 : 2;
      onHexagonsChange(generateVisibleHexagons(lat, lng, ring));
    },
    zoomend(e) {
      const { lat, lng } = e.target.getCenter();
      const z = e.target.getZoom();
      if (z < 12) { onHexagonsChange([]); return; }
      const ring = z >= 15 ? 5 : z >= 13 ? 3 : 2;
      onHexagonsChange(generateVisibleHexagons(lat, lng, ring));
    },
  });
  return null;
}

export default function HexMap() {
  const [hexagons, setHexagons] = useState([]);
  const [claimedMap, setClaimedMap] = useState({});
  const [selectedHex, setSelectedHex] = useState(null);
  const [selectedData, setSelectedData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [flyTo, setFlyTo] = useState(null);
  const [zoom, setZoom] = useState(14);
  const [mapCenter] = useState([-1.286389, 36.817223]); // Nairobi default

  // Load claimed hexagons
  useEffect(() => {
    (async () => {
      const addresses = await base44.entities.SentinelAddress.list('-created_date', 500);
      const map = {};
      addresses.forEach(a => { if (a.h3_index) map[a.h3_index] = a; });
      setClaimedMap(map);
    })();
  }, []);

  // Initial hex grid
  useEffect(() => {
    setHexagons(generateVisibleHexagons(mapCenter[0], mapCenter[1], 4));
  }, []);

  const handleHexClick = useCallback((h3Index, claimed) => {
    setSelectedHex(h3Index);
    setSelectedData(claimed || { h3_index: h3Index, status: 'Unclaimed', trust_score: null });
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const q = searchQuery.trim();

    // Try as coords: "lat,lng"
    const coordMatch = q.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      const h3 = latLngToCell(lat, lng, RES);
      setFlyTo([lat, lng]);
      setSelectedHex(h3);
      setSelectedData(claimedMap[h3] || { h3_index: h3, status: 'Unclaimed', trust_score: null });
      setHexagons(generateVisibleHexagons(lat, lng, 5));
      setSearching(false);
      return;
    }

    // Try as Sentinel ID lookup
    const cleanId = q.toUpperCase().replace(/[^A-F0-9]/g, '');
    if (cleanId.length === 15) {
      const formatted = `${cleanId.slice(0,4)}-${cleanId.slice(4,8)}-${cleanId.slice(8,12)}-${cleanId.slice(12)}`;
      const results = await base44.entities.SentinelAddress.filter({ sentinel_id: formatted });
      if (results.length) {
        const addr = results[0];
        const center = cellToLatLng(addr.h3_index);
        setFlyTo([center[0], center[1]]);
        setSelectedHex(addr.h3_index);
        setSelectedData(addr);
        setHexagons(generateVisibleHexagons(center[0], center[1], 5));
        setSearching(false);
        return;
      }
    }

    // Try geocode via LLM
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Return the latitude and longitude for this location: "${q}". Only output JSON with lat and lng keys.`,
      response_json_schema: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } } },
    });
    if (res?.lat && res?.lng) {
      const h3 = latLngToCell(res.lat, res.lng, RES);
      setFlyTo([res.lat, res.lng]);
      setSelectedHex(h3);
      setSelectedData(claimedMap[h3] || { h3_index: h3, status: 'Unclaimed', trust_score: null });
      setHexagons(generateVisibleHexagons(res.lat, res.lng, 5));
    }
    setSearching(false);
  };

  const TIER_COLOR = {
    'Visitor': 'text-amber-400',
    'Resident': 'text-blue-400',
    'Sentinel Permanent': 'text-emerald-400',
    'Unclaimed': 'text-slate-500',
  };

  return (
    <div className="min-h-screen pt-16 relative" style={{ background: '#0a0a0a' }}>
      <HexBackground opacity={0.05} />

      {/* Search Bar */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[500] w-full max-w-md px-4">
        <div className="flex gap-2 p-2 rounded-2xl border border-zinc-700/60"
          style={{ background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search address, coords (lat,lng), or Sentinel ID…"
            className="flex-1 bg-transparent text-white placeholder-slate-600 outline-none text-sm px-2"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-600 hover:text-slate-400">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={handleSearch} disabled={searching}
            className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all disabled:opacity-40 flex items-center gap-1.5">
            {searching
              ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-4 z-[500] flex flex-col gap-1.5 p-3 rounded-xl border border-zinc-700/60"
        style={{ background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(10px)' }}>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Legend</p>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded-sm border border-green-400" style={{ background: 'rgba(74,222,128,0.25)' }} />
          <span className="text-xs text-slate-400">Claimed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded-sm border border-green-700" style={{ background: 'rgba(34,197,94,0.04)', borderStyle: 'dashed' }} />
          <span className="text-xs text-slate-400">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded-sm border border-white" style={{ background: 'rgba(255,255,255,0.15)' }} />
          <span className="text-xs text-slate-400">Selected</span>
        </div>
      </div>

      {/* Hex Info Panel */}
      {selectedData && (
        <div className="absolute top-36 right-4 z-[500] w-72"
          style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)' }}>
          <div className="p-4 rounded-2xl border border-zinc-700/60">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">
                  {selectedData.status === 'Unclaimed' ? 'Available Hex' : 'Sentinel Address'}
                </span>
              </div>
              <button onClick={() => { setSelectedHex(null); setSelectedData(null); }}
                className="text-slate-600 hover:text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-mono mb-1 truncate">{selectedData.h3_index}</p>

            {selectedData.sentinel_id && (
              <p className="text-base font-bold text-white font-mono tracking-wider mb-2">{selectedData.sentinel_id}</p>
            )}

            {/* Trust Score Bar */}
            {selectedData.trust_score != null && (
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Trust Score</span>
                  <span className="text-green-400 font-mono font-bold">{selectedData.trust_score}/100</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${selectedData.trust_score}%`,
                      background: selectedData.trust_score >= 80
                        ? '#10b981'
                        : selectedData.trust_score >= 50
                        ? '#4ade80'
                        : '#f59e0b',
                    }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Status</span>
                <span className={`font-semibold ${TIER_COLOR[selectedData.status] || 'text-slate-400'}`}>
                  {selectedData.status || 'Unclaimed'}
                </span>
              </div>
              {selectedData.vouches_count != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Vouches</span>
                  <div className="flex items-center gap-1">
                    <span className="text-pink-400 font-mono font-bold">{selectedData.vouches_count}</span>
                    <span className="text-pink-400 text-xs">♥</span>
                  </div>
                </div>
              )}
              {selectedData.country && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Country</span>
                  <span className="text-slate-300">{selectedData.country}</span>
                </div>
              )}
              {selectedData.persistence_nights != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Check-ins</span>
                  <span className="text-slate-300 font-mono">{selectedData.persistence_nights}</span>
                </div>
              )}
            </div>

            {selectedData.status === 'Unclaimed' ? (
              <a href="/get-id"
                className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition-all">
                <MapPin className="w-3.5 h-3.5" /> Claim This Hexagon
              </a>
            ) : (
              <a href={`/verify?id=${selectedData.sentinel_id}`}
                className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-slate-800/60 border border-slate-700/40 text-slate-400 text-xs font-semibold hover:text-white transition-all">
                <Info className="w-3.5 h-3.5" /> View Full Profile
              </a>
            )}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="absolute inset-0 top-16" style={{ zIndex: 1 }}>
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution=""
          />
          {flyTo && <MapController center={flyTo} />}
          <DynamicHexLoader onHexagonsChange={setHexagons} zoom={zoom} />
          <HexLayer
            hexagons={hexagons}
            claimedMap={claimedMap}
            selectedHex={selectedHex}
            onHexClick={handleHexClick}
          />
        </MapContainer>
      </div>

      {/* Zoom hint */}
      <div className="absolute bottom-6 right-4 z-[500] p-2.5 rounded-xl border border-zinc-700/60 text-xs text-slate-600 max-w-[140px] text-center"
        style={{ background: 'rgba(10,10,10,0.85)' }}>
        <ZoomIn className="w-4 h-4 mx-auto mb-1 text-slate-600" />
        Zoom in to see hexagons
      </div>
    </div>
  );
}