import React, { useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const { themeMode } = useSettingsStore();
  const isDarkTheme = themeMode === 'dark';
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div 
          className={`absolute top-full left-1/2 transform -translate-x-1/2 translate-y-1 px-2 py-1 text-xs rounded whitespace-nowrap z-50 mt-1
            ${isDarkTheme 
              ? 'bg-gray-800 text-gray-200 border border-gray-700' 
              : 'bg-white text-gray-700 border border-gray-200'
            } shadow-lg`}
        >
          {text}
          <div 
            className={`absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent 
              ${isDarkTheme 
                ? 'border-b-gray-800' 
                : 'border-b-white'
              }`} 
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip; 