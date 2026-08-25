import { useState } from 'react';
import { Plus, MapPin, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/api/base44Client';

const LANDMARK_TYPES = [
  { key: 'Kiosk', icon: '', label: 'Kiosk' },
  { key: 'Petrol Station', icon: '', label: 'Petrol Stn' },
  { key: 'School', icon: '', label: 'School' },
  { key: 'Church/Mosque', icon: '', label: 'Church/Mosque' },
  { key: 'Borehole', icon: '', label: 'Borehole' },
  { key: 'Market', icon: '', label: 'Market' },
  { key: 'Clinic/Hospital', icon: '', label: 'Clinic' },
  { key: 'Bar/Restaurant', icon: '', label: 'Bar/Rest.' },
  { key: 'Road Junction', icon: '', label: 'Junction' },
  { key: 'Tree/Natural', icon: '', label: 'Tree/Nature' },
];

const DIRECTIONS = ['North', 'South', 'East', 'West', 'Behind', 'In Front', 'Left', 'Right', 'Opposite'];

function DirectionCompass({ selected, onSelect }) {
  const positions = [
    { dir: 'North', angle: 270 }, { dir: 'East', angle: 0 },
    { dir: 'South', angle: 90 }, { dir: 'West', angle: 180 },
    { dir: 'In Front', angle: 315 }, { dir: 'Behind', angle: 135 },
    { dir: 'Right', angle: 45 }, { dir: 'Left', angle: 225 },
  ];
  const R = 52;
  return (
    <div className="relative w-32 h-32 mx-auto">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
        </div>
      </div>
      {positions.map(({ dir, angle }) => {
        const rad = (angle * Math.PI) / 180;
        const x = 64 + R * Math.cos(rad) - 14;
        const y = 64 + R * Math.sin(rad) - 14;
        const isSelected = selected === dir;
        return (
          <button key={dir} onClick={() => onSelect(dir)}
            style={{ left: x, top: y, position: 'absolute' }}
            className={`w-7 h-7 rounded text-xs font-bold transition-all duration-200 ${
              isSelected
                ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.6)]'
                : 'bg-slate-800/80 text-slate-400 border border-slate-700/50 hover:border-blue-500/50 hover:text-blue-400'
            }`}>
            {dir === 'In Front' ? '▲' : dir === 'Behind' ? '▼' : dir === 'Left' ? '◀' : dir === 'Right' ? '▶' : dir === 'Opposite' ? '⊕' : dir[0]}
          </button>
        );
      })}
    </div>
  );
}

export default function LandmarkMapper({ sentinelAddressId, h3Index, onComplete }) {
  const [landmarks, setLandmarks] = useState([]);
  const [step, setStep] = useState('type');
  const [current, setCurrent] = useState({ type: '', direction: '', description: '', distance: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');

  const handleTypeSelect = (type) => {
    setCurrent(prev => ({ ...prev, type }));
    setStep('direction');
  };

  const handleDirectionSelect = (dir) => {
    setCurrent(prev => ({ ...prev, direction: dir }));
    setStep('describe');
  };

  const handleNormalize = async () => {
    if (!current.description) return;
    setAiLoading(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 100,
          messages: [{
            role: 'user',
            content: `You are a geospatial data normalizer for East African addresses.
A user provided this landmark description: "${current.description}"
Landmark type: ${current.type}, Direction: ${current.direction}, Distance: ~${current.distance || 'unknown'}m

Normalize this into a standardized English phrase of max 15 words that a delivery driver can use.
Format: "[Direction] of [landmark type description], approximately [distance]"
Output ONLY the normalized phrase, nothing else.`
          }]
        })
      });
      const data = await response.json();
      setAiResult(data.content?.[0]?.text || current.description);
    } catch (err) {
      console.error('AI normalize failed:', err);
      setAiResult(current.description);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddLandmark = async () => {
    const newLandmark = {
      sentinel_address_id: sentinelAddressId,
      h3_index: h3Index,
      landmark_type: current.type,
      direction: current.direction,
      distance_meters: current.distance ? parseFloat(current.distance) : null,
      description_text: current.description,
      ai_normalized: aiResult || current.description,
      is_primary: landmarks.length === 0,
    };

    // Save to Supabase
    const { error } = await supabase
      .from('landmark_descriptions')
      .insert(newLandmark);

    if (error) console.error('Failed to save landmark:', error);

    setLandmarks(prev => [...prev, newLandmark]);
    setCurrent({ type: '', direction: '', description: '', distance: '' });
    setAiResult('');
    setStep('type');
  };

  const handleFinish = () => {
    if (onComplete) onComplete(landmarks);
  };

  return (
    <div className="space-y-6">
      {landmarks.length > 0 && (
        <div className="space-y-2">
          {landmarks.map((lm, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-blue-900/30 bg-slate-900/60">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-400 uppercase">{lm.landmark_type}</span>
                  <span className="text-xs text-slate-500">·</span>
                  <span className="text-xs text-slate-400">{lm.direction}</span>
                  {lm.is_primary && (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded">Primary</span>
                  )}
                </div>
                <p className="text-sm text-slate-300 mt-0.5 truncate">{lm.ai_normalized || lm.description_text}</p>
              </div>
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
            </div>
          ))}
        </div>
      )}

      {step === 'type' && (
        <div>
          <p className="text-sm text-slate-400 mb-3">
            {landmarks.length === 0 ? 'What is near your location?' : 'Add another landmark (optional):'}
          </p>
          <div className="grid grid-cols-5 gap-2">
            {LANDMARK_TYPES.map(({ key, icon, label }) => (
              <button key={key} onClick={() => handleTypeSelect(key)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all text-center">
                <span className="text-xl">{icon}</span>
                <span className="text-xs text-slate-400 leading-tight">{label}</span>
              </button>
            ))}
          </div>
          {landmarks.length >= 2 && (
            <button onClick={handleFinish}
              className="w-full mt-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              Complete — {landmarks.length} Anchors Set ✓
            </button>
          )}
        </div>
      )}

      {step === 'direction' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-semibold text-white">Selected: {current.type}</span>
            <button onClick={() => setStep('type')} className="text-xs text-blue-400 hover:text-blue-300">← Change</button>
          </div>
          <p className="text-sm text-slate-400 mb-3">Which direction from the landmark are you?</p>
          <DirectionCompass selected={current.direction} onSelect={handleDirectionSelect} />
          <div className="grid grid-cols-3 gap-2 mt-4">
            {DIRECTIONS.filter(d => !['North','South','East','West','In Front','Behind','Left','Right'].includes(d)).map(d => (
              <button key={d} onClick={() => handleDirectionSelect(d)}
                className={`py-2 rounded-lg text-sm font-medium transition-all ${
                  current.direction === d
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:border-blue-500/50'
                }`}>{d}</button>
            ))}
          </div>
        </div>
      )}

      {step === 'describe' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-slate-300">{current.direction} of {current.type}</span>
            <button onClick={() => setStep('direction')} className="text-xs text-blue-400">← Change</button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">Distance (meters, optional)</label>
              <input type="number" placeholder="e.g. 50" value={current.distance}
                onChange={e => setCurrent(prev => ({ ...prev, distance: e.target.value }))}
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/60 placeholder-slate-600" />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">Describe in your words</label>
              <textarea rows={3} placeholder="e.g. The blue kiosk selling airtime near the main road..."
                value={current.description}
                onChange={e => setCurrent(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/60 placeholder-slate-600 resize-none" />
            </div>
            {aiResult && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">AI Normalized</p>
                <p className="text-sm text-white">{aiResult}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleNormalize} disabled={!current.description || aiLoading}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/10 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Normalizing...</> : '✨ AI Normalize'}
              </button>
              <button onClick={handleAddLandmark} disabled={!current.description}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                <Plus className="w-4 h-4" /> Add Anchor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
