'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Room } from '@/types/renovation';
import { X, Plus, Home } from 'lucide-react';

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRoom: (room: Room) => void;
}

export const AddRoomModal: React.FC<AddRoomModalProps> = ({
  isOpen,
  onClose,
  onAddRoom,
}) => {
  const [name, setName] = useState('');
  const [width, setWidth] = useState(3.0);
  const [length, setLength] = useState(3.5);
  const [height, setHeight] = useState(2.65);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const area = width * length;
    const perimeter = 2 * (width + length);
    const wallArea = perimeter * height - 3.5; // deduction for doors and windows

    const newRoom: Room = {
      id: `room-${Date.now()}`,
      name: name.trim(),
      type: 'sypialnia',
      width,
      length,
      height,
      area,
      perimeter,
      wallArea: Math.max(0, wallArea),
      notes: 'Nowo dodane pomieszczenie w projekcie remontu.',
      photoUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
      detectedEntities: [
        {
          id: `ent-${Date.now()}-1`,
          category: 'wall',
          name: 'Ściany nośne i działowe',
          confidence: 0.95,
          boundingBox: { x: 5, y: 5, width: 90, height: 60 },
          details: 'Wymagają gruntowania głęboko penetrującego przed nałożeniem gładzi.',
        },
        {
          id: `ent-${Date.now()}-2`,
          category: 'floor',
          name: 'Posadzka betonowa',
          confidence: 0.98,
          boundingBox: { x: 5, y: 65, width: 90, height: 30 },
          details: 'Podłoże pod panele winylowe lub parkiet dębowy.',
        },
      ],
      furniture: [],
      outlets: [
        { id: `out-${Date.now()}-1`, type: 'socket', label: 'Gniazdo 230V', x: 20, y: 90 },
        { id: `out-${Date.now()}-2`, type: 'light_switch', label: 'Włącznik oświetlenia', x: 85, y: 85 },
      ],
      openings: [
        { id: `op-${Date.now()}-1`, type: 'door', name: 'Drzwi wejściowe', width: 0.8, height: 2.05 },
      ],
      design: {
        floorType: 'Panele winylowe Dąb Mineralny',
        floorColor: '#a78bfa',
        wallType: 'Farba ceramiczna mat',
        wallColor: '#f8fafc',
        ceilingColor: '#ffffff',
        lightingTempK: 4000,
      },
    };

    onAddRoom(newRoom);
    setName('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100"
          >
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
                  <Home className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Dodaj Nowe Pomieszczenie</h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nazwa pomieszczenia:</label>
                <input
                  type="text"
                  required
                  placeholder="np. Sypialnia Główna / Kuchnia"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Szerokość (m):</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    value={width}
                    onChange={(e) => setWidth(parseFloat(e.target.value) || 1)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs font-mono text-white focus:border-teal-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Długość (m):</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    value={length}
                    onChange={(e) => setLength(parseFloat(e.target.value) || 1)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs font-mono text-white focus:border-teal-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Wysokość (m):</label>
                  <input
                    type="number"
                    step="0.05"
                    min="1.8"
                    value={height}
                    onChange={(e) => setHeight(parseFloat(e.target.value) || 2.5)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs font-mono text-white focus:border-teal-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-400 flex justify-between">
                <span>Szacowana powierzchnia posadzki:</span>
                <strong className="text-teal-300 font-mono">{(width * length).toFixed(2)} m²</strong>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition shadow-sm"
                >
                  Utwórz Pomieszczenie
                </button>
              </div>
            </form>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
