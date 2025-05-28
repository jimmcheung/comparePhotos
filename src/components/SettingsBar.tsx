import React, { useState, useRef, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useImageStore, ImageInfo } from '../stores/imageStore';
import { processImageFile } from '../utils/imageProcessing';
import ReactDOM from 'react-dom';
import domtoimage from 'dom-to-image';

interface ExifSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

// 工具提示组件
const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const { darkMode } = useSettingsStore();
  
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
            ${darkMode 
              ? 'bg-gray-800 text-gray-200 border border-gray-700' 
              : 'bg-white text-gray-700 border border-gray-200'
            } shadow-lg`}
        >
          {text}
          <div 
            className={`absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent 
              ${darkMode 
                ? 'border-b-gray-800' 
                : 'border-b-white'
              }`} 
          />
        </div>
      )}
    </div>
  );
};

const ExifSettingsPanel: React.FC<ExifSettingsPanelProps> = ({ isOpen, onClose }) => {
  const { exifSettings, toggleExifSetting, toggleAllExifSettings, showZoomControls, toggleShowZoomControls, darkMode, showExifInfo, toggleShowExifInfo } = useSettingsStore();

  // 动画控制
  const [shouldRender, setShouldRender] = React.useState(isOpen);
  const [animating, setAnimating] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setAnimating(false); // 先重置
      // 用 requestAnimationFrame 保证下一帧再设为true，动画每次都能从头播放
      const raf = requestAnimationFrame(() => setAnimating(true));
      return () => cancelAnimationFrame(raf);
    } else if (shouldRender) {
      // 关闭时也使用requestAnimationFrame确保动画流畅
      const raf = requestAnimationFrame(() => setAnimating(false));
      const timer = setTimeout(() => setShouldRender(false), 320);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    }
  }, [isOpen]);
  if (!shouldRender) return null;

  const displayNames: { [key: string]: string } = {
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

  // 主要信息：强调样式
  const primaryKeys = ['Make', 'Model', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO'];
  // 次要信息：次要样式
  const secondaryKeys = ['LensModel', 'FileName', 'Resolution', 'DateTimeOriginal'];

  // 全选状态
  const allChecked = Object.values(exifSettings).every(Boolean);
  const primaryChecked = primaryKeys.every(key => exifSettings[key as keyof typeof exifSettings]);
  const secondaryChecked = secondaryKeys.every(key => exifSettings[key as keyof typeof exifSettings]);

  return ReactDOM.createPortal(
    <div
      className={
        `fixed right-8 top-20 min-w-[260px] max-w-[90vw] md:max-w-[400px] max-h-[80vh] overflow-y-auto rounded-3xl px-7 py-4 backdrop-blur-lg text-sm shadow-lg shadow-black/10 transition-all duration-300 scrollbar-hide pointer-events-auto select-none z-[2000] 
        ${darkMode ? 'bg-gray-900/95 text-gray-100 border border-gray-700' : 'bg-white/80 text-gray-700 border border-gray-200'}`
      }
      style={{
        opacity: animating ? 1 : 0,
        transform: animating ? 'scale(1) translateY(0px)' : 'scale(0.95) translateY(40px)',
        transition: 'opacity 0.32s cubic-bezier(.4,0,.2,1), transform 0.32s cubic-bezier(.4,0,.2,1)',
        pointerEvents: shouldRender ? 'auto' : 'none',
      }}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">显示设置</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100">
          <span className="text-lg">×</span>
        </button>
      </div>
      {/* EXIF信息标题和总开关 */}
      <div className="flex items-center justify-between mt-1 mb-2">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-100">EXIF信息</span>
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showExifInfo}
            onChange={toggleShowExifInfo}
            className="sr-only peer"
          />
          <div className={`w-11 h-6 bg-gray-300 dark:bg-gray-800 rounded-full peer-focus:ring-2 peer-focus:ring-sky-400 peer-focus:ring-opacity-50 transition-colors duration-200
            ${showExifInfo ? 'bg-sky-500' : darkMode ? 'bg-gray-800' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200
              ${showExifInfo ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </div>
        </label>
      </div>
      {/* 主要/次要分栏并列，互不影响 */}
      {showExifInfo && (
        <div className="flex flex-row gap-3 mb-2">
          {/* 主要 */}
          <div className="flex-1 min-w-[120px]">
            <div className="flex items-center mb-1">
              <input
                type="checkbox"
                checked={primaryChecked}
                onChange={() => {
                  if (primaryChecked) {
                    primaryKeys.forEach(key => {
                      if (exifSettings[key as keyof typeof exifSettings]) toggleExifSetting(key as keyof typeof exifSettings);
                    });
                  } else {
                    primaryKeys.forEach(key => {
                      if (!exifSettings[key as keyof typeof exifSettings]) toggleExifSetting(key as keyof typeof exifSettings);
                    });
                  }
                }}
                className="form-checkbox h-3.5 w-3.5 text-sky-500 rounded border-gray-300 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-sky-500 mr-1"
              />
              <span className="text-xs text-gray-500 dark:text-gray-300">主要</span>
            </div>
            <div className="space-y-1">
              {primaryKeys.map(key => (
                <label key={key} className="flex items-center space-x-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors">
                  <input
                    type="checkbox"
                    checked={exifSettings[key as keyof typeof exifSettings]}
                    onChange={() => toggleExifSetting(key as keyof typeof exifSettings)}
                    className="form-checkbox h-3.5 w-3.5 text-sky-500 rounded border-gray-300 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-sky-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-100">{displayNames[key] || key}</span>
                </label>
              ))}
            </div>
          </div>
          {/* 次要 */}
          <div className="flex-1 min-w-[120px]">
            <div className="flex items-center mb-1">
              <input
                type="checkbox"
                checked={secondaryChecked}
                onChange={() => {
                  if (secondaryChecked) {
                    secondaryKeys.forEach(key => {
                      if (exifSettings[key as keyof typeof exifSettings]) toggleExifSetting(key as keyof typeof exifSettings);
                    });
                  } else {
                    secondaryKeys.forEach(key => {
                      if (!exifSettings[key as keyof typeof exifSettings]) toggleExifSetting(key as keyof typeof exifSettings);
                    });
                  }
                }}
                className="form-checkbox h-3.5 w-3.5 text-sky-500 rounded border-gray-300 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-sky-500 mr-1"
              />
              <span className="text-xs text-gray-500 dark:text-gray-300">次要</span>
            </div>
            <div className="space-y-1">
              {secondaryKeys.map(key => (
                <label key={key} className="flex items-center space-x-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors">
                  <input
                    type="checkbox"
                    checked={exifSettings[key as keyof typeof exifSettings]}
                    onChange={() => toggleExifSetting(key as keyof typeof exifSettings)}
                    className="form-checkbox h-3.5 w-3.5 text-sky-500 rounded border-gray-300 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-sky-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-100">{displayNames[key] || key}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="border-t border-gray-200 dark:border-gray-700 my-3" />
      <div className="flex items-center justify-between mt-1 mb-2">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-100">缩放倍数显示</span>
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showZoomControls}
            onChange={toggleShowZoomControls}
            className="sr-only peer"
          />
          <div className={`w-11 h-6 bg-gray-300 dark:bg-gray-800 rounded-full peer-focus:ring-2 peer-focus:ring-sky-400 peer-focus:ring-opacity-50 transition-colors duration-200
            ${showZoomControls ? 'bg-sky-500' : darkMode ? 'bg-gray-800' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200
              ${showZoomControls ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </div>
        </label>
      </div>
    </div>,
    document.body
  );
};

const SettingsBar: React.FC = () => {
  const { darkMode, toggleDarkMode, demoMode, toggleDemoMode } = useSettingsStore();
  const { images, addImages, clearImages } = useImageStore();
  const [showExifSettings, setShowExifSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsPanelRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    clearImages();
    const processedImages = await Promise.all(imageFiles.map(processImageFile));
    addImages(processedImages);
  };

  // 使用dom-to-image实现截图功能
  const captureScreenshot = async () => {
    try {
      setIsCapturing(true);
      
      // 临时添加演示模式样式，隐藏控制按钮
      document.body.classList.add('demo-mode-active');
      
      // 等待样式应用完成
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 获取主内容区域并生成截图
      const mainContent = document.querySelector('main') as HTMLElement;
      if (!mainContent) {
        throw new Error('找不到主要内容区域');
      }
      
      // 生成高质量截图
      const blob = await domtoimage.toBlob(mainContent, {
        quality: 0.95,
        bgcolor: darkMode ? '#000000' : '#f9fafb',
        height: mainContent.scrollHeight,
        width: mainContent.scrollWidth,
        style: {
          'transform': 'none',
          'transform-origin': 'center',
          'zoom': '1'
        }
      });
      
      // 生成文件名: 照片对比+相机品牌型号+时间
      let filename = '照片对比';
      
      if (images.length > 0) {
        const firstImage = images[0];
        const make = firstImage.exif?.Make || '';
        const model = firstImage.exif?.Model || '';
        if (make || model) {
          filename += '_' + (make + model).trim().replace(/\s+/g, '-');
        }
      }
      
      // 添加时间戳
      const now = new Date();
      const timeString = now.getFullYear() + 
                        ('0' + (now.getMonth() + 1)).slice(-2) + 
                        ('0' + now.getDate()).slice(-2) + 
                        ('0' + now.getHours()).slice(-2) + 
                        ('0' + now.getMinutes()).slice(-2);
      filename += '_' + timeString + '.png';
      
      // 下载图片
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      // 恢复正常显示
      document.body.classList.remove('demo-mode-active');
      setIsCapturing(false);
      
    } catch (error) {
      console.error('截图失败:', error);
      document.body.classList.remove('demo-mode-active');
      setIsCapturing(false);
      alert('截图失败，请重试');
    }
  };

  useEffect(() => {
    if (!showSettings) return;
    const handleClick = (e: MouseEvent) => {
      if (
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(e.target as Node)
      ) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettings]);

  // 如果没有图片，不显示任何按钮
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-4 setting-bar">
      {/* 截图按钮 */}
      <div className="relative">
        <Tooltip text="截图">
          <button
            onClick={captureScreenshot}
            disabled={isCapturing}
            className={`p-3 rounded-full backdrop-blur-md transition-all duration-200 border font-medium flex items-center
              ${darkMode 
                ? 'bg-gray-900 hover:bg-gray-800 text-white border-gray-700' 
                : 'bg-sky-500/10 hover:bg-sky-500/20 text-gray-900 border-gray-200'}
              ${isCapturing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg 
              className="w-5 h-5" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        </Tooltip>
      </div>

      <div className="relative">
        <Tooltip text="显示设置">
          <button
            onClick={() => setShowSettings(v => !v)}
            className={`p-3 rounded-full backdrop-blur-md transition-all duration-200 border font-medium flex items-center
              ${darkMode 
                ? 'bg-gray-900 hover:bg-gray-800 text-white border-gray-700' 
                : 'bg-sky-500/10 hover:bg-sky-500/20 text-gray-900 border-gray-200'}`}
          >
            <svg 
              className="w-5 h-5" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </Tooltip>
        {showSettings && (
          <div
            ref={settingsPanelRef}
            style={{position: 'absolute', right: 0, top: '100%', zIndex: 2000}}
            onMouseDown={e => e.stopPropagation()}
          >
            <ExifSettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
          </div>
        )}
      </div>

      <Tooltip text="演示模式">
        <button
          onClick={toggleDemoMode}
          className={`p-3 rounded-full backdrop-blur-md transition-all duration-200 ${
            demoMode 
              ? 'bg-sky-600 hover:bg-sky-700 text-white' 
              : darkMode 
                ? 'bg-gray-900 hover:bg-gray-800 text-white' 
                : 'bg-sky-500/10 hover:bg-sky-500/20 text-gray-900 dark:text-white'
          } font-medium desktop-only`}
        >
          <svg 
            className="w-5 h-5" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      </Tooltip>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className={`px-7 py-3 rounded-full backdrop-blur-md transition-all duration-200 ${
          darkMode 
            ? 'bg-sky-600 hover:bg-sky-700 text-white' 
            : 'bg-sky-500 hover:bg-sky-600 text-white'
        } font-medium text-sm scale-105`}
      >
        重新导入
      </button>
      
      <div className="relative desktop-only">
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          id="add-image-input"
          onChange={async (e) => {
            if (e.target.files) {
              const files = e.target.files;
              const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
              if (imageFiles.length === 0) return;
              const newImages = await Promise.all(imageFiles.map(processImageFile));
              addImages(newImages);
              e.target.value = '';
            }
          }}
        />
        <Tooltip text="添加图片">
          <button
            onClick={() => document.getElementById('add-image-input')?.click()}
            className={`p-3 rounded-full backdrop-blur-md transition-all duration-200 ${
              darkMode 
                ? 'bg-gray-900 hover:bg-gray-800 text-white' 
                : 'bg-sky-500/10 hover:bg-sky-500/20 text-gray-900'
            } font-medium`}
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 4v16m8-8H4" 
              />
            </svg>
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default SettingsBar; 