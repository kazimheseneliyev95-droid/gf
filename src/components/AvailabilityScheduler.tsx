import React, { useState, useEffect } from 'react';
import { Calendar, Save } from 'lucide-react';
import { WorkerAvailability, AVAILABILITY_STORAGE_KEY } from '../types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AvailabilityScheduler({ username }: { username: string }) {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const str = localStorage.getItem(AVAILABILITY_STORAGE_KEY);
    if (str) {
      const all: WorkerAvailability[] = JSON.parse(str);
      const my = all.find(a => a.username === username);
      if (my) setSelectedDays(my.availableDays);
    }
  }, [username]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
    setIsSaved(false);
  };

  const handleSave = () => {
    const str = localStorage.getItem(AVAILABILITY_STORAGE_KEY);
    let all: WorkerAvailability[] = str ? JSON.parse(str) : [];
    
    // Remove existing
    all = all.filter(a => a.username !== username);
    
    // Add new
    all.push({
      username,
      availableDays: selectedDays,
      updatedAt: new Date().toISOString()
    });

    localStorage.setItem(AVAILABILITY_STORAGE_KEY, JSON.stringify(all));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
        <Calendar size={16} className="text-blue-600" /> Weekly Availability
      </h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {DAYS.map(day => (
          <button
            key={day}
            onClick={() => toggleDay(day)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedDays.includes(day)
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {day}
          </button>
        ))}
      </div>
      <button 
        onClick={handleSave}
        className="w-full py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
      >
        {isSaved ? 'Saved!' : <><Save size={12} /> Update Availability</>}
      </button>
    </div>
  );
}
