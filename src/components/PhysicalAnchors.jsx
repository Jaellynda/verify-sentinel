Go to `src/components/PhysicalAnchors.jsx` on GitHub, replace entirely with:

```jsx
import { useState } from 'react';
import { Pencil, Trash2, X, Save } from 'lucide-react';
import { supabase } from '@/api/base44Client';

const LANDMARK_ICONS = {
  'Kiosk': '🏪', 'Petrol Station': '⛽', 'School': '🏫',
  'Church/Mosque': '🕌', 'Borehole': '💧', 'Market': '🛒',
  'Clinic/Hospital': '🏥', 'Bar/Restaurant': '🍺',
  'Road Junction': '🛤️', 'Tree/Natural': '🌳', 'Other': '📍',
};

const LANDMARK_TYPES = Object.keys(LANDMARK_ICONS);
const DIRECTIONS = ['North', 'South', 'East', 'West', 'Behind', 'In Front', 'Left', 'Right', 'Opposite'];

function LandmarkEditForm({ lm, onSave, onCancel }) {
  const [form, setForm] = useState({
    landmark_type: lm.landmark_type,
    direction: lm.direction,
    distance_meters: lm.distance_meters || '',
    description_text: lm.description_text || '',
    is_primary: lm.is_primary || false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      landmark_type: form.landmark_type,
      direction: form.direction,
      distance_meters: form.distance_meters ? parseFloat(form.distance_meters) : null,
      description_text: form.description_text,
      is_primary: form.is_primary,
    };
    await supabase.from('landmark_descriptions').update(updates).eq('id', lm.id);
    setSaving(false);
    onSave({ ...lm, ...updates });
  };

  return (
    <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Type</label>
          <select value={form.landmark_type}
            onChange={e => setForm(f => ({ ...f, landmark_type: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700/60 text-white text-xs rounded-lg px-2 py-1.5 outline-none">
            {LANDMARK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Direction</label>
          <select value={form.direction}
            onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700/60 text-white text-xs rounded-lg px-2 py-1.5 outline-none">
            {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-500 mb-1 block">Distance (meters)</label>
        <input type="number" value={form.distance_meters}
          onChange={e => setForm(f => ({ ...f, distance_meters: e.target.value }))}
          placeholder="e.g. 50"
          className="w-full bg-slate-800 border border-slate-700/60 text-white text-xs rounded-lg px-2 py-1.5 outline-none" />
      </div>
      <div>
        <label className="text-xs text-slate-500 mb-1 block">Description</label>
        <textarea value={form.description_text}
          onChange={e => setForm(f => ({ ...f, description_text: e.target.value }))}
          rows={2}
          className="w-full bg-slate-800 border border-slate-700/60 text-white text-xs rounded-lg px-2 py-1.5 outline-none resize-none" />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_primary}
          onChange={e => setForm(f => ({ ...f, is_primary: e.target.checked }))}
          className="accent-emerald-400" />
        <span className="text-xs text-slate-400">Mark as Primary Landmark</span>
      </label>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition-all">
          <Save className="w-3 h-3" /> {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-all">
          <X className="w-3 h-3" /> Cancel
        </button>
      </div>
    </div>
  );
}

export default function PhysicalAnchors({ landmarks: initialLandmarks, onChanged }) {
  const [landmarks, setLandmarks] = useState(initialLandmarks);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleDelete = async (id) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    await supabase.from('landmark_descriptions').delete().eq('id', id);
    setLandmarks(prev => prev.filter(l => l.id !== id));
    setDeletingId(null);
    onChanged();
  };

  const handleSaved = (updatedLm) => {
    setLandmarks(prev => prev.map(l => l.id === updatedLm.id ? updatedLm : l));
    setEditingId(null);
    onChanged();
  };

  return (
    <div className="p-6 rounded-3xl border border-slate-800/60"
      style={{ background: 'rgba(13,31,60,0.85)', backdropFilter: 'blur(20px)' }}>
      <h3 className="text-sm font-semibold text-white mb-4">Physical Anchors</h3>
      <div className="space-y-3">
        {landmarks.map((lm) => (
          <div key={lm.id}>
            {editingId === lm.id ? (
              <LandmarkEditForm lm={lm} onSave={handleSaved} onCancel={() => setEditingId(null)} />
            ) : (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-700/30">
                <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-lg flex-shrink-0">
                  {LANDMARK_ICONS[lm.landmark_type] || '📍'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-green-400 uppercase">{lm.landmark_type}</span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-500">{lm.direction}</span>
                    {lm.is_primary && (
                      <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">Primary</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300 truncate">{lm.ai_normalized || lm.description_text}</p>
                  {lm.distance_meters && <p className="text-xs text-slate-600 mt-0.5">~{lm.distance_meters}m</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {confirmDeleteId === lm.id ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/30">
                      <span className="text-xs text-red-400">Delete?</span>
                      <button onClick={() => handleDelete(lm.id)} disabled={deletingId === lm.id}
                        className="text-xs text-red-400 font-semibold hover:text-red-300 transition-colors">
                        {deletingId === lm.id ? '…' : 'Yes'}
                      </button>
                      <span className="text-slate-600 text-xs">·</span>
                      <button onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-slate-400 hover:text-slate-200 transition-colors">No</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => setEditingId(lm.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(lm.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

Commit and paste the next error.
