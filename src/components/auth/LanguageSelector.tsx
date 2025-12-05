import React from 'react';
import { Globe } from 'lucide-react';
import { AuthLanguage } from '../../types';

interface Props {
  currentLang: AuthLanguage;
  onChange: (lang: AuthLanguage) => void;
}

export default function LanguageSelector({ currentLang, onChange }: Props) {
  return (
    <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
      <Globe size={16} className="text-gray-400" />
      <select 
        value={currentLang}
        onChange={(e) => onChange(e.target.value as AuthLanguage)}
        className="bg-transparent text-sm text-gray-600 font-medium focus:outline-none cursor-pointer"
      >
        <option value="en">EN</option>
        <option value="az">AZ</option>
        <option value="ru">RU</option>
      </select>
    </div>
  );
}
