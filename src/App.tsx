import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import { useSettingsStore } from './stores/settingsStore';
import { useImageStore } from './stores/imageStore';
import { useAnnotationStore } from './stores/annotationStore';
import { useKeyframeStore } from './stores/keyframeStore';
import ImageUploader from './components/ImageUploader';
import ImageViewer from './components/ImageViewer';
import SettingsBar from './components/SettingsBar';
import './styles/demo-mode.css';
import './styles/utils.css';
// 导入二维码图片
import placeholderQRCode from '/placeholder-qrcode.jpeg';
import AnnotationToolbar from './components/AnnotationToolbar';
import KeyframePanel from './components/KeyframePanel';
import FormatConversionModal from './components/FormatConversionModal';
import { ThemeMode } from './types';
import domtoimage from 'dom-to-image';

// 简化版的Tooltip组件，直接内联在App.tsx中
const SimpleTooltip: React.FC<{text: string, children: React.ReactNode}> = ({ text, children }) => {
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

// 移动端侧边栏组件
const MobileSidebar: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  syncZoom: boolean;
  toggleSyncZoom: () => void;
  images: any[];
}> = ({ isOpen, onClose, themeMode, setThemeMode, syncZoom, toggleSyncZoom, images }) => {
  // 是否为深色系主题
  const isDarkTheme = themeMode === 'dark';
  
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 left-0 bottom-0 w-64 z-50 p-4 transform transition-transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } overflow-y-auto`}
        style={{ background: 'var(--control-bg)', color: 'var(--control-text)' }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--control-text)' }}>设置</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
            style={{ color: 'var(--control-text)' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          {/* 主题选择部分 */}
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--control-text)' }}>主题设置</h3>
            <div className="grid grid-cols-2 gap-3">
              {/* 浅色主题 */}
              <button
                onClick={() => setThemeMode('light')}
                className={`p-3 rounded-lg flex items-center justify-center ${
                  themeMode === 'light' ? 'ring-2 ring-sky-500' : 'border'
                }`}
                style={{
                  background: '#f9fafb',
                  borderColor: 'var(--control-border)'
                }}
              >
                <div className="flex items-center">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center bg-white mr-2">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2">
                      <circle cx="12" cy="12" r="5" />
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                  </div>
                  <span style={{ color: '#4b5563' }}>浅色模式</span>
                </div>
              </button>
              
              {/* 深色主题 */}
              <button
                onClick={() => setThemeMode('dark')}
                className={`p-3 rounded-lg flex items-center justify-center ${
                  themeMode === 'dark' ? 'ring-2 ring-sky-500' : 'border'
                }`}
                style={{
                  background: '#111827',
                  borderColor: 'var(--control-border)'
                }}
              >
                <div className="flex items-center">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center bg-gray-800 mr-2">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2">
                      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                    </svg>
                  </div>
                  <span style={{ color: '#d1d5db' }}>深色模式</span>
                </div>
              </button>
              
              {/* 绿幕主题 */}
              <button
                onClick={() => setThemeMode('green')}
                className={`p-3 rounded-lg flex items-center justify-center ${
                  themeMode === 'green' ? 'ring-2 ring-sky-500' : 'border'
                }`}
                style={{
                  background: '#00291d',
                  borderColor: 'var(--control-border)'
                }}
              >
                <div className="flex items-center">
                  <div className="w-5 h-5 rounded-full mr-2" style={{ background: '#00b140' }}></div>
                  <span style={{ color: '#b4e6d2' }}>绿幕模式</span>
                </div>
              </button>
              
              {/* 蓝幕主题 */}
              <button
                onClick={() => setThemeMode('blue')}
                className={`p-3 rounded-lg flex items-center justify-center ${
                  themeMode === 'blue' ? 'ring-2 ring-sky-500' : 'border'
                }`}
                style={{
                  background: '#001e3c',
                  borderColor: 'var(--control-border)'
                }}
              >
                <div className="flex items-center">
                  <div className="w-5 h-5 rounded-full mr-2" style={{ background: '#0047AB' }}></div>
                  <span style={{ color: '#b9d4f0' }}>蓝幕模式</span>
                </div>
              </button>
            </div>
          </div>
          
          {/* 其他设置 */}
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--control-text)' }}>同步缩放</span>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={syncZoom}
                  onChange={toggleSyncZoom}
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 rounded-full transition-all duration-200 
                  cursor-pointer
                  after:content-[''] after:absolute after:top-0.5 after:left-0.5 
                  after:bg-white after:rounded-full after:h-5 after:w-5 
                  after:shadow-md after:transition-all"
                  style={{
                    background: syncZoom ? 'var(--control-highlight)' : 'var(--control-border)',
                    transform: syncZoom ? 'translateX(1.25rem)' : 'translateX(0)'
                  }}
                >
                </div>
              </label>
            </div>
        </div>
      </div>
    </>
  );
};

const App: React.FC = () => {
  const { themeMode, setThemeMode, syncZoom, toggleSyncZoom, demoMode, toggleDemoMode } = useSettingsStore();
  const { images, hasViewedImages } = useImageStore();
  const { isAnnotateMode, setAnnotateMode, setToolbarVisible } = useAnnotationStore();
  const { enabled: keyframeEnabled, setEnabled: setKeyframeEnabled } = useKeyframeStore();
  const [showExitHint, setShowExitHint] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeButtonRef = useRef<HTMLButtonElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // 统一的动画逻辑
  const [shouldRenderMenu, setShouldRenderMenu] = useState(false);
  const [isMenuAnimating, setIsMenuAnimating] = useState(false);

  useEffect(() => {
    if (themeMenuOpen) {
      setShouldRenderMenu(true);
      // 先重置再开启动画，确保动画每次都能触发
      setIsMenuAnimating(false); 
      const raf = requestAnimationFrame(() => setIsMenuAnimating(true));
      return () => cancelAnimationFrame(raf);
    } else if (shouldRenderMenu) {
      // 只有在渲染后才执行关闭动画
      setIsMenuAnimating(false);
      const timer = setTimeout(() => setShouldRenderMenu(false), 320); // 动画时长
      return () => clearTimeout(timer);
    }
  }, [themeMenuOpen, shouldRenderMenu]);

  useLayoutEffect(() => {
    if (themeMenuOpen && themeButtonRef.current) {
      const rect = themeButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8, // Position below the button with a small gap
        left: rect.right, // Align with the right edge of the button
      });
    }
  }, [themeMenuOpen]);

  // 截图功能相关状态和函数
  const [isCapturing, setIsCapturing] = useState(false);
  
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
        bgcolor: themeMode === 'dark' ? '#000000' : '#f9fafb',
        height: mainContent.scrollHeight,
        width: mainContent.scrollWidth,
        style: {
          'transform': 'none',
          'transform-origin': 'center',
          'zoom': '1'
        }
      });
      
      // 生成文件名
      let filenameParts: string[] = [];
      if (images.length > 0) {
        images.forEach(image => {
          const make = image.exif?.Make || '';
          const model = image.exif?.Model || '';
          if (make || model) {
            filenameParts.push((make + ' ' + model).trim().replace(/\s+/g, '+'));
          }
        });
      }

      let filename = filenameParts.join('_VS_');

      // 添加时间戳
      const now = new Date();
      const timeString = now.getFullYear() + 
                        ('0' + (now.getMonth() + 1)).slice(-2) + 
                        ('0' + now.getDate()).slice(-2) + 
                        '_' +
                        ('0' + now.getHours()).slice(-2) + 
                        ('0' + now.getMinutes()).slice(-2) +
                        ('0' + now.getSeconds()).slice(-2);
      
      if (filename) {
        filename += '_' + timeString + '.png';
      } else {
        filename = 'Screenshot_' + timeString + '.png';
      }
      
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

  // 是否为深色系主题
  const isDarkTheme = themeMode === 'dark';
  const isSpecialTheme = themeMode === 'green' || themeMode === 'blue';

  // 添加点击外部关闭菜单的逻辑
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        themeMenuRef.current &&
        !themeMenuRef.current.contains(event.target as Node) &&
        themeButtonRef.current &&
        !themeButtonRef.current.contains(event.target as Node)
      ) {
        setThemeMenuOpen(false);
      }
    };

    if (themeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [themeMenuOpen]);

  // 设置主题的 HTML 类
  useEffect(() => {
    // 移除所有主题类
    document.documentElement.classList.remove('dark-theme', 'light-theme', 'green-theme', 'blue-theme');
    document.documentElement.classList.remove('dark', 'dark-mode'); // 移除旧的类名
    
    // 添加当前主题类
    document.documentElement.classList.add(`${themeMode}-theme`);
    
    // 为了兼容性，保留原来的 dark 类
    if (isDarkTheme) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.add('dark-mode');
    }
  }, [themeMode, isDarkTheme]);

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && demoMode) {
        toggleDemoMode(); // 退出全屏时自动关闭演示模式
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [demoMode, toggleDemoMode]);

  // 处理演示模式
  useEffect(() => {
    if (demoMode) {
      document.body.classList.add('demo-mode-active');
      document.documentElement.requestFullscreen().catch(() => {
        // 如果无法进入全屏，也关闭演示模式
        toggleDemoMode();
      });
      setShowExitHint(true);
      const timer = setTimeout(() => {
        setShowExitHint(false);
      }, 3000);
      return () => {
        clearTimeout(timer);
        document.body.classList.remove('demo-mode-active');
      };
    } else {
      document.body.classList.remove('demo-mode-active');
      setShowExitHint(false); // 确保退出演示模式时隐藏提示
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {
          // 处理退出全屏失败的情况
          console.error('退出全屏失败');
        });
      }
    }
  }, [demoMode, toggleDemoMode]);

  // 保证标注开关与工具栏显示联动
  useEffect(() => {
    setToolbarVisible(isAnnotateMode);
  }, [isAnnotateMode, setToolbarVisible]);

  // 工具栏互斥逻辑
  useEffect(() => {
    if (keyframeEnabled && isAnnotateMode) {
      setAnnotateMode(false);
    }
  }, [keyframeEnabled]);
  useEffect(() => {
    if (isAnnotateMode && keyframeEnabled) {
      setKeyframeEnabled(false);
    }
  }, [isAnnotateMode]);

  // 关键帧面板显示条件：开关为true且非演示模式
  const showKeyframePanel = keyframeEnabled && !demoMode;

  return (
    <div className="h-screen overflow-hidden" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="flex flex-col h-full">
        <div className="fixed top-0 left-0 right-0 h-16 z-50 px-6 flex items-center justify-between backdrop-blur-md app-header"
             style={{ 
               background: themeMode === 'green' || themeMode === 'blue' 
                 ? 'var(--control-bg)' 
                 : 'var(--bg-secondary)',
               borderBottom: '1px solid var(--border-color)'
             }}>
          <div className="flex items-center space-x-4">
            {/* 移动端菜单按钮 */}
            <button 
              className="menu-button mr-2 p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-800/50 hidden"
              onClick={() => setMobileMenuOpen(true)}
              style={{ color: 'var(--control-text)' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          
            <div className="flex items-center">
              <h1 className="text-xl font-semibold" style={{ color: 'var(--control-text)' }}>
                ComparePhotos
              </h1>
              <button 
                onClick={() => setShowInfo(true)} 
                className="ml-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                style={{ 
                  background: 'var(--control-border)', 
                  color: 'var(--control-text)' 
                }}
                title="关于"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20 10 10 0 010-20z" />
                </svg>
              </button>
            </div>
            
            {/* 同步缩放开关 - 仅在有图片时显示 */}
            {images.length > 0 && (
              <>
                <div className="px-4 py-1.5 rounded-full backdrop-blur-md transition-all duration-200 flex items-center desktop-only"
                     style={{ background: 'var(--control-bg)', color: 'var(--control-text)' }}>
                  <span className="text-sm font-medium mr-3">同步</span>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={syncZoom}
                      onChange={toggleSyncZoom}
                      className="sr-only peer"
                    />
                    <div className={`relative w-14 h-7 rounded-full transition-all duration-200 
                      ${syncZoom 
                        ? 'bg-sky-500' 
                        : 'bg-gray-300 dark:bg-gray-700'} 
                      cursor-pointer
                      after:content-[''] after:absolute after:top-1 after:left-1 
                      after:bg-white after:rounded-full after:h-5 after:w-5 
                      after:shadow-md after:transition-all
                      ${syncZoom ? 'after:translate-x-7' : 'after:translate-x-0'}
                      peer-focus:ring-2 peer-focus:ring-sky-400 peer-focus:ring-opacity-50`}
                      style={{
                        background: syncZoom ? 'var(--control-highlight)' : 'var(--control-border)'
                      }}
                    >
                      <span className="sr-only">同步操作</span>
                    </div>
                  </label>
                </div>
                {/* 标注开关 */}
                <div className={`px-4 py-1.5 rounded-full backdrop-blur-md transition-all duration-200 ml-2 flex items-center desktop-only`}
                style={{ 
                  background: isAnnotateMode ? 'var(--control-highlight)' : 'var(--control-bg)', 
                  color: isAnnotateMode ? 'white' : 'var(--control-text)' 
                }}>
                  <span className="text-sm font-medium mr-3">标注</span>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={isAnnotateMode}
                      onChange={e => setAnnotateMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={`relative w-14 h-7 rounded-full transition-all duration-200 
                      cursor-pointer
                      after:content-[''] after:absolute after:top-1 after:left-1 
                      after:bg-white after:rounded-full after:h-5 after:w-5 
                      after:shadow-md after:transition-all
                      ${isAnnotateMode ? 'after:translate-x-7' : 'after:translate-x-0'}
                      peer-focus:ring-2 peer-focus:ring-sky-400 peer-focus:ring-opacity-50`}
                      style={{
                        background: isAnnotateMode ? 'rgba(255, 255, 255, 0.3)' : 'var(--control-border)'
                      }}
                    >
                      <span className="sr-only">开启标注</span>
                    </div>
                  </label>
                </div>

                {/* 关键帧开关（独立按钮） */}
                <div className={`px-4 py-1.5 rounded-full backdrop-blur-md transition-all duration-200 ml-2 flex items-center desktop-only`}
                style={{ 
                  background: keyframeEnabled ? 'var(--control-highlight)' : 'var(--control-bg)', 
                  color: keyframeEnabled ? 'white' : 'var(--control-text)' 
                }}>
                  <span className="text-sm font-medium mr-3">关键帧</span>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={keyframeEnabled}
                      onChange={e => setKeyframeEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={`relative w-14 h-7 rounded-full transition-all duration-200 
                      cursor-pointer
                      after:content-[''] after:absolute after:top-1 after:left-1 
                      after:bg-white after:rounded-full after:h-5 after:w-5 
                      after:shadow-md after:transition-all
                      ${keyframeEnabled ? 'after:translate-x-7' : 'after:translate-x-0'}
                      peer-focus:ring-2 peer-focus:ring-sky-400 peer-focus:ring-opacity-50`}
                      style={{
                        background: keyframeEnabled ? 'rgba(255, 255, 255, 0.3)' : 'var(--control-border)'
                      }}
                    >
                      <span className="sr-only">关键帧开关</span>
                    </div>
                  </label>
                </div>
              </>
            )}
          </div>

          {/* 右侧设置按钮组 */}
          <div className="flex items-center space-x-4 setting-bar">
            {/* 截图按钮 - 仅在有图片时显示 */}
            {images.length > 0 && (
              <div className="relative desktop-only">
                <SimpleTooltip text="截图">
                  <button
                    onClick={captureScreenshot}
                    disabled={isCapturing}
                    className={`p-3 rounded-full backdrop-blur-md transition-all duration-200 font-medium flex items-center
                      ${isDarkTheme 
                        ? 'bg-gray-900 hover:bg-gray-800 text-white' 
                        : 'bg-sky-500/10 hover:bg-sky-500/20 text-gray-900'}
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
                </SimpleTooltip>
              </div>
            )}
            
            {/* 主题选择器 - an extra div to wrap button and handle click-outside ref */}
            <div className="relative desktop-only">
              <SimpleTooltip text="主题选择">
                <button
                  ref={themeButtonRef}
                  onClick={() => setThemeMenuOpen(prev => !prev)}
                  className={`p-3 rounded-full backdrop-blur-md transition-all duration-200 font-medium flex items-center
                    ${isDarkTheme 
                      ? 'bg-gray-900 hover:bg-gray-800 text-white' 
                      : 'bg-sky-500/10 hover:bg-sky-500/20 text-gray-900'}`}
                >
                  {themeMode === 'light' && (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="5" />
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                  )}
                  
                  {themeMode === 'dark' && (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                    </svg>
                  )}
                  
                  {themeMode === 'green' && (
                    <div className="w-5 h-5 rounded-full" style={{ background: '#00b140' }}></div>
                  )}
                  
                  {themeMode === 'blue' && (
                    <div className="w-5 h-5 rounded-full" style={{ background: '#0047AB' }}></div>
                  )}
                </button>
              </SimpleTooltip>
              
              {/* 下拉菜单 - Now Portalled */}
              {shouldRenderMenu && ReactDOM.createPortal(
                <div 
                  ref={themeMenuRef}
                  className="fixed min-w-[200px] rounded-3xl backdrop-blur-lg shadow-lg z-50 overflow-hidden pointer-events-auto"
                  style={{ 
                    top: `${menuPosition.top}px`,
                    left: `${menuPosition.left}px`,
                    transform: 'translateX(-100%)', // Align right edge with the calculated left position
                    background: 'var(--control-bg)',
                    border: '1px solid var(--control-border)',
                    color: 'var(--control-text)',
                    opacity: isMenuAnimating ? 1 : 0,
                    scale: isMenuAnimating ? '1' : '0.95',
                    transition: 'opacity 0.2s, scale 0.2s',
                    transformOrigin: 'top right',
                  }}
                >
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setThemeMode('light');
                        setThemeMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-black/10 dark:hover:bg-white/10 flex items-center"
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white mr-3">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2">
                          <circle cx="12" cy="12" r="5" />
                          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                        </svg>
                      </div>
                      <span>浅色模式</span>
                      {themeMode === 'light' && (
                        <svg className="w-4 h-4 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setThemeMode('dark');
                        setThemeMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-black/10 dark:hover:bg-white/10 flex items-center"
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-800 mr-3">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2">
                          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                        </svg>
                      </div>
                      <span>深色模式</span>
                      {themeMode === 'dark' && (
                        <svg className="w-4 h-4 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setThemeMode('green');
                        setThemeMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-black/10 dark:hover:bg-white/10 flex items-center"
                    >
                      <div className="w-6 h-6 rounded-full mr-3" style={{ background: '#00b140' }}></div>
                      <span>绿幕模式</span>
                      {themeMode === 'green' && (
                        <svg className="w-4 h-4 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setThemeMode('blue');
                        setThemeMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-black/10 dark:hover:bg-white/10 flex items-center"
                    >
                      <div className="w-6 h-6 rounded-full mr-3" style={{ background: '#0047AB' }}></div>
                      <span>蓝幕模式</span>
                      {themeMode === 'blue' && (
                        <svg className="w-4 h-4 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>,
                document.body
              )}
            </div>
            
            <SettingsBar />
          </div>
        </div>

        {/* 主要内容区域 */}
        <main className="h-full pt-16">
          {images.length === 0 && !hasViewedImages ? <ImageUploader /> : <ImageViewer images={images} />}
          {/* 标注工具栏 */}
          <AnnotationToolbar />
        </main>

        {/* 底部版权信息 */}
        <footer className="fixed bottom-0 left-0 right-0 p-6 backdrop-blur-md app-footer"
                style={{ 
                  background: themeMode === 'green' || themeMode === 'blue' 
                    ? 'var(--control-bg)' 
                    : 'var(--bg-secondary)',
                  borderTop: '1px solid var(--border-color)',
                  color: 'var(--control-text)'
                }}>
          <div className={`max-w-screen-xl mx-auto flex items-center justify-between`}>
            <div className="flex items-center space-x-2 group">
              <span className="text-sm transition-all duration-300 group-hover:text-sky-500">
                Created by Jim
              </span>
              <span className="text-sm opacity-60">•</span>
              <a 
                href="https://space.bilibili.com/13818699" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-1.5 text-sm transition-all duration-300 hover:text-sky-500"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906L17.813 4.653zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773H5.333zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373Z"/>
                </svg>
                <span>@Jim超爱玩</span>
              </a>
              <span className="text-sm opacity-60">•</span>
              <span className="text-sm opacity-60">© {new Date().getFullYear()}</span>
              <span className="text-sm opacity-60">•</span>
              <span className="text-sm opacity-60">v1.2.0</span>
              <span className="text-sm opacity-60">•</span>
              <button
                className="text-sm text-sky-500 hover:underline focus:outline-none focus:underline ml-2"
                onClick={() => setShowReward(true)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                工具好用？打赏作者。
              </button>
            </div>
            <div className="text-sm opacity-60">
              Made with ❤️ in China
            </div>
          </div>
        </footer>

        {/* 打赏二维码弹窗 */}
        {showReward && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowReward(false)}>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 flex flex-col items-center relative" onClick={e => e.stopPropagation()}>
              <span className="absolute top-2 right-3 text-2xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer" onClick={() => setShowReward(false)}>&times;</span>
              <div className="w-48 h-48 mb-4 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <img 
                  src={`${import.meta.env.BASE_URL}placeholder-qrcode.jpeg`} 
                  alt="打赏二维码" 
                  className="max-w-full max-h-full object-contain" 
                />
              </div>
              <div className="text-base font-medium text-gray-700 dark:text-gray-200">感谢支持！</div>
            </div>
          </div>
        )}

        {/* 信息弹窗 */}
        {showInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowInfo(false)}>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 max-w-md w-full flex flex-col relative" onClick={e => e.stopPropagation()}>
              <span className="absolute top-2 right-3 text-2xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer" onClick={() => setShowInfo(false)}>&times;</span>
              
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">关于 ComparePhotos</h2>
              
              <div className="mb-4">
                <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">版本信息</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">当前版本: v1.2.0</p>
              </div>
              
              <div className="mb-4">
                <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">更新日志</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
                <li>新增主题选择：可选择浅色、深色、跟随系统
                </li>
                  <li>新增关键帧功能：支持多帧缩放/平移动画，自动记录、平滑切换、快捷键切换与自动播放</li>
                  <li>关键帧时间设置面板UI与功能优化：样式与显示设置面板统一，现代毛玻璃圆角弹窗</li>
                  <li>停留时间、过渡时间为按钮组切换，选中高亮，过渡时间选项为快（0.5秒）、正常（1秒，默认）、慢（3秒）</li>
                  
                  
                </ul>
              </div>
              
              <div className="mb-4">
                <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">链接</h3>
                <div className="space-y-2">
                  <a 
                    href="https://github.com/jimmcheung/photoCompare" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-sm text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                    </svg>
                    <span>GitHub 仓库</span>
                  </a>
                  <a 
                    href="https://space.bilibili.com/13818699" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-sm text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906L17.813 4.653zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773H5.333zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373Z"/>
                    </svg>
                    <span>B站: @Jim超爱玩</span>
                  </a>
                </div>
              </div>
              <div className="mb-4">
                <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">鸣谢</h3>
                <a href="https://space.bilibili.com/96625571" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-sm text-sky-600 dark:text-sky-400 hover:underline">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906L17.813 4.653zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773H5.333zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373Z"></path></svg>
                  <span>B站：@熊熊Bearie</span>
                </a>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                © {new Date().getFullYear()} Jim. 保留所有权利。
              </div>
            </div>
          </div>
        )}

        {showExitHint && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black bg-opacity-75 text-white px-6 py-3 rounded-lg">
              按 ESC 退出演示模式
            </div>
          </div>
        )}

        {/* 移动端侧边栏 */}
        <MobileSidebar
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          syncZoom={syncZoom}
          toggleSyncZoom={toggleSyncZoom}
          images={images}
        />

        {/* 关键帧面板 */}
        {showKeyframePanel && <KeyframePanel />}
      </div>
    </div>
  );
};

export default App; 