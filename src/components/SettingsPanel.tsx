import React from 'react';
import { useSettingsStore } from '../stores/settingsStore';

const exifFields = [
  'Make',
  'Model',
  'ISO',
  'FNumber',
  'ExposureTime',
  'FocalLength',
  'LensModel',
  'DateTimeOriginal'
];

const SettingsPanel: React.FC = () => {
  const {
    themeMode,
    syncZoom,
    syncDraw,
    presentationMode,
    visibleExifFields,
    toggleThemeMode,
    toggleSyncZoom,
    toggleSyncDraw,
    togglePresentationMode,
    toggleExifField
  } = useSettingsStore();

  const isDarkTheme = themeMode === 'dark';

  return (
    <div className={`p-4 rounded-lg shadow-lg ${
      isDarkTheme ? 'bg-black text-gray-100' : 'bg-white text-gray-800'
    }`}>
      <h3 className="text-lg font-semibold mb-4">设置</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span>深色</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isDarkTheme}
              onChange={toggleThemeMode}
              className="sr-only peer"
            />
            <div className={`relative w-14 h-7 rounded-full transition-colors duration-200
              ${isDarkTheme ? 'bg-sky-500' : 'bg-gray-300'} 
              cursor-pointer
              peer-focus:ring-2 peer-focus:ring-sky-400 peer-focus:ring-opacity-50`}
            >
              <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200
                ${isDarkTheme ? 'translate-x-7' : 'translate-x-0'}`} 
              />
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <span>同步缩放</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={syncZoom}
              onChange={toggleSyncZoom}
              className="sr-only peer"
            />
            <div className={`relative w-14 h-7 rounded-full transition-colors duration-200
              ${syncZoom ? 'bg-sky-500' : isDarkTheme ? 'bg-gray-800' : 'bg-gray-300'} 
              cursor-pointer
              peer-focus:ring-2 peer-focus:ring-sky-400 peer-focus:ring-opacity-50`}
            >
              <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200
                ${syncZoom ? 'translate-x-7' : 'translate-x-0'}`} 
              />
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <span>同步绘制</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={syncDraw}
              onChange={toggleSyncDraw}
              className="sr-only peer"
            />
            <div className={`relative w-14 h-7 rounded-full transition-colors duration-200
              ${syncDraw ? 'bg-sky-500' : isDarkTheme ? 'bg-gray-800' : 'bg-gray-300'} 
              cursor-pointer
              peer-focus:ring-2 peer-focus:ring-sky-400 peer-focus:ring-opacity-50`}
            >
              <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200
                ${syncDraw ? 'translate-x-7' : 'translate-x-0'}`} 
              />
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <span>演示模式</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={presentationMode}
              onChange={togglePresentationMode}
              className="sr-only peer"
            />
            <div className={`relative w-14 h-7 rounded-full transition-colors duration-200
              ${presentationMode ? 'bg-sky-500' : isDarkTheme ? 'bg-gray-800' : 'bg-gray-300'} 
              cursor-pointer
              peer-focus:ring-2 peer-focus:ring-sky-400 peer-focus:ring-opacity-50`}
            >
              <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200
                ${presentationMode ? 'translate-x-7' : 'translate-x-0'}`} 
              />
            </div>
          </label>
        </div>

        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium mb-2">EXIF信息显示</h4>
          <div className="space-y-2">
            {exifFields.map(field => (
              <label key={field} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={visibleExifFields.includes(field)}
                  onChange={() => toggleExifField(field)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{field}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel; 