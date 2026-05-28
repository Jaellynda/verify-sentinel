import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, X, MapPin, Shield, Info, ZoomIn } from 'lucide-react';
import { supabase } from '@/api/base44Client';
import { latLngToCell, cellToBoundary, gridDisk, cellToLatLng } from 'h3-js';
import HexBackground from '../components/HexBackground';

const RES = 9;

function generateVisibleHexagons(centerLat, centerLng, ringSize = 6) {
  const center = latLngToCell(centerLat, centerLng, RES);
  return gridDisk(center, ringSize);
}

function getHexStyle(claimed, selected, zoom) {
  const weight = zoom >= 17 ? 2.5 : zoom >= 15 ? 1.5 : zoom >= 13 ? 0.9 : 0.5;
  if (selected)  return { color: '#ffffff', fillColor: '#ffffff', fillOpacity: 0.18, weight: weight + 1, dashArray: null };
  if (claimed)   return { color: '#4ade80', fillColor: '#4ade80', fillOpacity: zoom >= 15 ? 0.3 : 0.2, weight, dashArray: null };
  return { color: '#22c55e', fillColor: '#22c55e', fillOpacity: zoom >= 15 ? 0.07 : 0.04, weight, dashArray: '4,4' };
}

function HexLayer({ hexagons, claimedMap, selectedHex, onHexClick, zoom }) {
  return (
    <>
      {hexagons.map(h3Index => {
        const boundary = cellToBoundary(h3Index);
        const positions = boundary.map(([lat, lng]) => [lat, lng]);
        const claimed = claimedMap[h3Index];
        const isSelected = selectedHex === h3Index;
        const style = getHexStyle(!!claimed, isSelected, zoom);
        return (
          <Polygon key={h3Index} positions={positions} pathOptions={style}
            eventHandlers={{ click: () => onHexClick(h3Index, claimed) }} />
        );
      })}
    </>
  );
}

function BlueDot({ position }) {
  if (!position) return null;
  return (
    <>
      <CircleMarker center={position} radius={18}
        pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.12, weight: 0 }} />
      <CircleMarker center={position} radius={9}
        pathOptions={{ color: '#ffffff', fillColor: '#3B82F6', fillOpacity: 1, weight: 2.5 }} />
    </>
  );
}

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom ?? 17, { animate: true });
  }, [center]);
  return null;
}

function DynamicHexLoader({ onHexagonsChange, onZoomChange }) {
  useMapEvents({
    moveend(e) {
      const z = e.target.getZoom();
      if (z < 12) return;
      const { lat, lng } = e.target.getCenter();
      const ring = z >= 16 ? 6 : z >= 15 ? 5 : z >= 13 ? 3 : 2;
      onHexagonsChange(generateVisibleHexagons(lat, lng, ring));
    },
    zoomend(e) {
      const z = e.target.getZoom();
      onZoomChange(z);
      const { lat, lng } = e.target.getCenter();
      if (z < 12) { onHexagonsChange([]); return; }
      const ring = z >= 16 ? 6 : z >= 15 ? 5 : z >= 13 ? 3 : 2;
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
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [flyTo, setFlyTo] = useState(null);
  const [flyZoom, setFlyZoom] = useState(17);
  const [zoom, setZoom] = useState(14);
  const [userPosition, setUserPosition] = useState(null);
  const [mapCenter] = useState([0.3476, 32.5825]);
  const [landmarks, setLandmarks] = useState([]);
  const suggestRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [{ data: addresses }, { data: lms }] = await Promise.all([
        supabase.from('sentinel_addresses').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('landmark_descriptions').select('*').order('created_at', { ascending: false }).limit(500),
      ]);
      const map = {};
      (addresses || []).forEach(a => { if (a.h3_index) map[a.h3_index] = a; });
      setClaimedMap(map);
      setLandmarks(lms || []);
    })();
  }, []);

  useEffect(() => {
    setHexagons(generateVisibleHexagons(mapCenter[0], mapCenter[1], 4));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = [];
    landmarks.forEach(lm => {
      const text = lm.ai_normalized || lm.description_text || '';
      const type = lm.landmark_type || '';
      if (text.toLowerCase().includes(q) || type.toLowerCase().includes(q)) {
        matches.push({ label: text || type, sublabel: lm.landmark_type, h3_index: lm.h3_index, sentinel_address_id: lm.sentinel_address_id });
      }
    });
    Object.values(claimedMap).forEach(addr => {
      if (addr.region?.toLowerCase().includes(q) || addr.country?.toLowerCase().includes(q)) {
        matches.push({ label: addr.region || addr.country, sublabel: `${addr.country} · ${addr.sentinel_id || addr.h3_index}`, h3_index: addr.h3_index, sentinel_address_id: addr.id });
      }
    });
    setSuggestions(matches.slice(0, 6));
    setShowSuggestions(matches.length > 0);
  }, [searchQuery, landmarks, claimedMap]);

  useEffect(() => {
    const handler = (e) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleHexClick = useCallback((h3Index, claimed) => {
    setSelectedHex(h3Index);
    setSelectedData(claimed || { h3_index: h3Index, status: 'Unclaimed', trust_score: null });
  }, []);

  const flyToH3 = (h3Index, addressData) => {
    const center = cellToLatLng(h3Index);
    setFlyTo([center[0], center[1]]);
    setFlyZoom(18);
    setSelectedHex(h3Index);
    setSelectedData(addressData || claimedMap[h3Index] || { h3_index: h3Index, status: 'Unclaimed', trust_score: null });
    setHexagons(generateVisibleHexagons(center[0], center[1], 6));
    setShowSuggestions(false);
    setSearchQuery(addressData?.label || searchQuery);
  };

  const handleSuggestionClick = async (sug) => {
    setShowSuggestions(false);
    setSearchQuery(sug.label);
    if (sug.h3_index) {
      let addrData = null;
      if (sug.sentinel_address_id) {
        const { data } = await supabase.from('sentinel_addresses').select('*').eq('h3_index', sug.h3_index).single();
        addrData = data;
      }
      flyToH3(sug.h3_index, addrData);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setShowSuggestions(false);
    const q = searchQuery.trim();

    // 1. Coordinates
    const coordMatch = q.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      const h3 = latLngToCell(lat, lng, RES);
      setFlyTo([lat, lng]); setFlyZoom(17);
      setSelectedHex(h3);
      setSelectedData(claimedMap[h3] || { h3_index: h3, status: 'Unclaimed', trust_score: null });
      setHexagons(generateVisibleHexagons(lat, lng, 6));
      setSearching(false);
      return;
    }

    // 2. Sentinel ID
    const cleanId = q.toUpperCase().replace(/[^A-F0-9]/g, '');
    if (cleanId.length === 15) {
      const formatted = `${cleanId.slice(0,4)}-${cleanId.slice(4,8)}-${cleanId.slice(8,12)}-${cleanId.slice(12)}`;
      const { data: results } = await supabase.from('sentinel_addresses').select('*').eq('sentinel_id', formatted).limit(1);
      if (results?.length) { flyToH3(results[0].h3_index, results[0]); setSearching(false); return; }
    }

    // 3. Landmark DB
    const lmMatch = landmarks.find(lm =>
      lm.description_text?.toLowerCase().includes(q.toLowerCase()) ||
      lm.ai_normalized?.toLowerCase().includes(q.toLowerCase()) ||
      lm.landmark_type?.toLowerCase().includes(q.toLowerCase())
    );
    if (lmMatch) {
      const { data: addrRes } = await supabase.from('sentinel_addresses').select('*').eq('h3_index', lmMatch.h3_index).limit(1);
      if (addrRes?.length) { flyToH3(addrRes[0].h3_index, addrRes[0]); setSearching(false); return; }
    }

    // 4. Region/district
    const regionMatch = Object.values(claimedMap).find(addr =>
      addr.region?.toLowerCase().includes(q.toLowerCase()) ||
      addr.country?.toLowerCase().includes(q.toLowerCase())
    );
    if (regionMatch) { flyToH3(regionMatch.h3_index, regionMatch); setSearching(false); return; }

    // 5. Claude geocode fallback
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 100,
          messages: [{
            role: 'user',
            content: `Return the latitude and longitude for this East African location: "${q}". Focus on Uganda, Kenya, Rwanda, DRC. Respond with ONLY valid JSON like {"lat": 0.3476, "lng": 32.5825} and nothing else.`
          }]
        })
      });
      const data = await response.json();
      const text = data.content?.[0]?.text || '{}';
      const res = JSON.parse(text.replace(/```json|```/g, '').trim());
      if (res?.lat && res?.lng) {
        const h3 = latLngToCell(res.lat, res.lng, RES);
        setFlyTo([res.lat, res.lng]); setFlyZoom(15);
        setSelectedHex(h3);
        setSelectedData(claimedMap[h3] || { h3_index: h3, status: 'Unclaimed', trust_score: null });
        setHexagons(generateVisibleHexagons(res.lat, res.lng, 6));
      }
    } catch (err) {
      console.error('Geocode failed:', err);
    }
    setSearching(false);
  };

  const TIER_COLOR = {
    'Visitor': 'text-amber-400', 'Resident': 'text-blue-400',
    'Sentinel Permanent': 'text-emerald-400', 'Unclaimed': 'text-slate-500',
  };

  return (
    <div className="min-h-screen pt-16 relative" style={{ background: '#0a0a0a' }}>
      <HexBackground opacity={0.05} />

      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[500] w-full max-w-md px-4" ref={suggestRef}>
        <div className="flex gap-2 p-2 rounded-2xl border border-zinc-700/60"
          style={{ background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)' }}>
          <input type="text" value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="School, shop, district, coords, or Sentinel ID…"
            className="flex-1 bg-transparent text-white placeholder-slate-600 outline-none text-sm px-2" />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); }}
              className="text-slate-600 hover:text-slate-400">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={handleSearch} disabled={searching}
            className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all disabled:opacity-40 flex items-center gap-1.5">
            {searching ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div className="mt-1 rounded-xl border border-zinc-700/60 overflow-hidden"
            style={{ background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(12px)' }}>
            {suggestions.map((sug, i) => (
              <button key={i} onClick={() => handleSuggestionClick(sug)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left transition-colors border-b border-zinc-800/50 last:border-0">
                <MapPin className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{sug.label}</p>
                  {sug.sublabel && <p className="text-xs text-slate-500 truncate">{sug.sublabel}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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
        {userPosition && (
          <div className="flex items-center gap-2 pt-1 border-t border-zinc-800 mt-1">
            <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white flex-shrink-0" />
            <span className="text-xs text-slate-400">You are here</span>
          </div>
        )}
      </div>

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
            {selectedData.trust_score != null && (
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Trust Score</span>
                  <span className="text-green-400 font-mono font-bold">{selectedData.trust_score}/100</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${selectedData.trust_score}%`, background: selectedData.trust_score >= 80 ? '#10b981' : selectedData.trust_score >= 50 ? '#4ade80' : '#f59e0b' }} />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Status</span>
                <span className={`font-semibold ${TIER_COLOR[selectedData.status] || 'text-slate-400'}`}>{selectedData.status || 'Unclaimed'}</span>
              </div>
              {selectedData.vouches_count != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Vouches</span>
                  <span className="text-pink-400 font-mono font-bold">{selectedData.vouches_count} ♥</span>
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

      <div className="absolute inset-0 top-16" style={{ zIndex: 1 }}>
        <MapContainer center={mapCenter} zoom={zoom} style={{ height: '100%', width: '100%' }}
          zoomControl={false} attributionControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" maxZoom={19} />
          {flyTo && <MapController center={flyTo} zoom={flyZoom} />}
          <DynamicHexLoader onHexagonsChange={setHexagons} onZoomChange={setZoom} />
          <HexLayer hexagons={hexagons} claimedMap={claimedMap} selectedHex={selectedHex} onHexClick={handleHexClick} zoom={zoom} />
          <BlueDot position={userPosition} />
        </MapContainer>
      </div>

      {zoom < 14 && (
        <div className="absolute bottom-6 right-4 z-[500] p-2.5 rounded-xl border border-zinc-700/60 text-xs text-slate-600 max-w-[140px] text-center"
          style={{ background: 'rgba(10,10,10,0.85)' }}>
          <ZoomIn className="w-4 h-4 mx-auto mb-1 text-slate-600" />
          Zoom in to see hexagons
        </div>
      )}
    </div>
  );
}
