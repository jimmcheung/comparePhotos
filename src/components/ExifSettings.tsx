import React from 'react';
import { useSettingsStore } from '../stores/settingsStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// 这个类型必须与 settingsStore.ts 中的 ExifSettings 接口字段完全匹配
const exifLabels: Record<string, string> = {
  FileName: '文件名',
  Resolution: '分辨率',
  Make: '相机品牌',
  Model: '相机型号',
  LensModel: '镜头型号',
  FocalLength: '焦距',
  FNumber: '光圈',
  ExposureTime: '快门速度',
  ISO: 'ISO',
  DateTimeOriginal: '拍摄时间'
};

const ExifSettings: React.FC<Props> = ({ isOpen, onClose }) => {
  const { themeMode, exifSettings, toggleExifSetting, toggleAllExifSettings } = useSettingsStore();
  const isDarkTheme = themeMode === 'dark';

  if (!isOpen) return null;

  // 检查当前是否所有选项都被选中
  const isAllSelected = Object.values(exifSettings).every(value => value === true);
  // 检查当前是否所有选项都未被选中
  const isNoneSelected = Object.values(exifSettings).every(value => value === false);

  return (
    <div 
      className="absolute top-full right-0 mt-2 p-4 rounded-lg shadow-lg w-64 backdrop-blur-md"
      style={{
        backgroundColor: isDarkTheme ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      }}
    >
      {/* 全选/全不选按钮 */}
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
        <span className={`text-sm font-medium ${isDarkTheme ? 'text-gray-300' : 'text-gray-700'}`}>
          快捷操作
        </span>
        <div className="flex space-x-2">
          <button
            onClick={() => toggleAllExifSettings(true)}
            className={`px-2 py-1 text-xs rounded ${
              isAllSelected 
                ? isDarkTheme ? 'bg-sky-600 text-white' : 'bg-sky-500 text-white' 
                : isDarkTheme ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            全选
          </button>
          <button
            onClick={() => toggleAllExifSettings(false)}
            className={`px-2 py-1 text-xs rounded ${
              isNoneSelected 
                ? isDarkTheme ? 'bg-sky-600 text-white' : 'bg-sky-500 text-white' 
                : isDarkTheme ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            全不选
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {(Object.keys(exifSettings) as Array<keyof typeof exifSettings>).map((key) => (
          <label 
            key={key} 
            className="flex items-center justify-between cursor-pointer"
          >
            <span className={`text-sm ${isDarkTheme ? 'text-gray-300' : 'text-gray-700'}`}>
              {exifLabels[key] || key}
            </span>
            <div className="relative">
              <input
                type="checkbox"
                checked={exifSettings[key]}
                onChange={() => toggleExifSetting(key)}
                className="sr-only peer"
              />
              <div className={`
                relative w-10 h-5 rounded-full transition-colors duration-200
                ${isDarkTheme 
                  ? exifSettings[key] ? 'bg-sky-500' : 'bg-gray-700'
                  : exifSettings[key] ? 'bg-sky-500' : 'bg-gray-300'}
                peer-focus:ring-2 peer-focus:ring-sky-400 peer-focus:ring-opacity-50
              `}>
                <div className={`
                  absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200
                  ${exifSettings[key] ? 'translate-x-5' : 'translate-x-0'}
                `} />
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

export default ExifSettings; 