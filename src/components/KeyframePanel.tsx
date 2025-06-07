import React, { useEffect, useRef, useState } from 'react';
import { useKeyframeStore } from '../stores/keyframeStore';
import type { Keyframe } from '../types/keyframe';
import { useSettingsStore } from '../stores/settingsStore';

const TOOLBAR_HEIGHT = 72;
const TOOLBAR_RADIUS = 999;

const KeyframePanel: React.FC = () => {
  const {
    keyframes, currentIdx, setCurrentIdx, playing, setPlaying, enabled,
    frameDuration, transitionDuration, transitionEasing,
    setFrameDuration, setTransitionDuration, setTransitionEasing
  } = useKeyframeStore();
  const { themeMode } = useSettingsStore();
  const [shouldRender, setShouldRender] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 设置菜单弹窗
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // 动画与位置逻辑，参考AnnotationToolbar
  useEffect(() => {
    if (enabled) {
      setShouldRender(true);
      setTimeout(() => {
        if (panelRef.current && !pos) {
          const rect = panelRef.current.getBoundingClientRect();
          setPos({
            x: (window.innerWidth - rect.width) / 2,
            y: window.innerHeight * 0.7,
          });
        }
        setAnimating(true);
      }, 10);
    } else if (shouldRender) {
      setAnimating(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!animating && shouldRender) {
      const timer = setTimeout(() => setShouldRender(false), 350);
      return () => clearTimeout(timer);
    }
  }, [animating, shouldRender]);

  // 拖动逻辑
  const handlePanelPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.button !== 0) return;
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    window.addEventListener('pointermove', handleDragMove);
    window.addEventListener('pointerup', handleDragEnd);
  };
  const handleDragMove = (e: PointerEvent) => {
    setPos(prev => prev ? {
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    } : prev);
  };
  const handleDragEnd = () => {
    window.removeEventListener('pointermove', handleDragMove);
    window.removeEventListener('pointerup', handleDragEnd);
  };

  // 保证面板和提示初始居中，拖动后跟随自定义位置
  const getPanelLeft = () => {
    if (pos) return pos.x;
    return (window.innerWidth - (panelRef.current?.offsetWidth || 0)) / 2;
  };
  const getPanelTop = () => {
    if (pos) return pos.y;
    return window.innerHeight * 0.7;
  };

  // 监听点击面板外部关闭设置弹窗
  useEffect(() => {
    if (!showSettings) return;
    const handleClick = (e: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(e.target as Node) &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettings]);

  // 默认值设置
  useEffect(() => {
    if (transitionDuration !== 1000) setTransitionDuration(1000);
    // eslint-disable-next-line
  }, []);

  if (!shouldRender) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: getPanelLeft(),
    top: getPanelTop(),
    zIndex: 1000,
    width: 'fit-content',
    height: TOOLBAR_HEIGHT,
    borderRadius: TOOLBAR_RADIUS,
    background: themeMode === 'dark' 
      ? 'rgba(0, 0, 0, 0.92)' 
      : (themeMode === 'green' || themeMode === 'blue' 
        ? 'rgba(255, 255, 255, 0.25)' 
        : 'rgba(255,255,255,0.92)'),
    backdropFilter: 'blur(16px) saturate(1.5)',
    boxShadow: themeMode === 'dark' 
      ? '0 8px 32px rgba(0,0,0,0.38)' 
      : '0 8px 32px rgba(0,0,0,0.18)',
    border: themeMode === 'dark' 
      ? '1.5px solid rgba(80,80,100,0.18)' 
      : '1.5px solid rgba(180,180,200,0.13)',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'none',
    opacity: animating ? 1 : 0,
    pointerEvents: shouldRender ? 'auto' : 'none',
    transform: animating
      ? 'scale(1) translateY(0px)'
      : 'scale(0.95) translateY(40px)',
    transition: 'opacity 0.35s cubic-bezier(.4,0,.2,1), transform 0.35s cubic-bezier(.4,0,.2,1)',
    padding: '0 36px',
    boxSizing: 'border-box',
    color: themeMode === 'dark' ? '#e5e7eb' : '#333',
    cursor: 'default',
  };

  return (
    <>
      <div
        ref={panelRef}
        className="keyframe-panel floating-toolbar-panel"
        style={style}
        onPointerDown={handlePanelPointerDown}
      >
        {/* 播放按钮 */}
        <button
          onClick={() => setPlaying(!playing)}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: 'none',
            background: playing ? '#e6f0ff' : '#fff',
            color: playing ? '#2458d0' : '#333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            boxShadow: playing ? '0 0 0 3px #2458d066' : undefined,
            cursor: 'pointer',
            marginRight: 24,
          }}
          title={playing ? '暂停（空格）' : '播放（空格）'}
        >
          {playing ? (
            <svg width="22" height="22" viewBox="0 0 22 22"><rect x="5" y="4" width="4" height="14" rx="2" fill="currentColor"/><rect x="13" y="4" width="4" height="14" rx="2" fill="currentColor"/></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22"><polygon points="6,4 18,11 6,18" fill="currentColor"/></svg>
          )}
        </button>
        {/* 设置按钮 */}
        <button
          onClick={() => setShowSettings(v => !v)}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: '#f4f4f4',
            color: '#888',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            marginRight: 18,
            cursor: 'pointer',
          }}
          title="关键帧动画设置"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M10 6v4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        {/* 关键帧槽位 */}
        <div style={{ display: 'flex', gap: 18 }}>
          {keyframes.map((kf: Keyframe, idx: number) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentIdx(idx);
                if (playing) setPlaying(false);
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: 'none',
                background: currentIdx === idx ? '#e6f0ff' : '#fff',
                color: currentIdx === idx ? '#2458d0' : '#333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                boxShadow: currentIdx === idx ? '0 0 0 3px #2458d066' : undefined,
                cursor: 'pointer',
                position: 'relative',
              }}
              title={`关键帧${idx+1}（${idx+1}）`}
            >
              {idx+1}
            </button>
          ))}
        </div>
      </div>
      {/* 快捷键提示，绝对定位在面板下方中央，提升zIndex，增强可见性 */}
      {shouldRender && (
        <div
          style={{
            position: 'fixed',
            left: getPanelLeft() + ((panelRef.current?.offsetWidth || 0) / 2),
            top: getPanelTop() + TOOLBAR_HEIGHT + 8,
            transform: 'translateX(-50%)',
            zIndex: 1100,
            minWidth: 180,
            textAlign: 'center',
            fontSize: 12,
            color: '#888',
            fontWeight: 400,
            letterSpacing: 0.2,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
          className="keyframe-hint"
        >
          快捷键：1-5切换，空格播放/暂停
        </div>
      )}
      {/* 弹出设置菜单 */}
      {showSettings && (
        <div
          ref={settingsRef}
          className="fixed min-w-[260px] max-w-[90vw] md:max-w-[400px] max-h-[80vh] overflow-y-auto rounded-3xl px-7 py-4 backdrop-blur-lg text-sm shadow-lg shadow-black/10 transition-all duration-300 scrollbar-hide pointer-events-auto select-none z-[2000] border"
          style={{
            left: getPanelLeft() + ((panelRef.current?.offsetWidth || 0) / 2),
            top: getPanelTop() - 16,
            transform: 'translate(-50%, -100%)',
            background: themeMode === 'dark' 
              ? 'rgba(0, 0, 0, 0.92)' 
              : (themeMode === 'green' || themeMode === 'blue' 
                ? 'rgba(255, 255, 255, 0.25)' 
                : 'rgba(255,255,255,0.92)'),
            color: themeMode === 'dark' ? '#e5e7eb' : '#333',
            borderColor: themeMode === 'dark' 
              ? 'rgba(80,80,100,0.18)' 
              : 'rgba(180,180,200,0.13)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 500, marginBottom: 10 }}>每帧停留时间</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setFrameDuration(1000)}
                className={`font-medium border transition-all duration-200 focus:outline-none ${frameDuration===1000 ? 'bg-sky-500 text-white border-sky-500 shadow' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-sky-100'}`}
                style={{ width: '100px', height: '36px', borderRadius: '18px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >短（1秒）</button>
              <button
                type="button"
                onClick={() => setFrameDuration(3000)}
                className={`font-medium border transition-all duration-200 focus:outline-none ${frameDuration===3000 ? 'bg-sky-500 text-white border-sky-500 shadow' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-sky-100'}`}
                style={{ width: '100px', height: '36px', borderRadius: '18px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >中（3秒）</button>
              <button
                type="button"
                onClick={() => setFrameDuration(5000)}
                className={`font-medium border transition-all duration-200 focus:outline-none ${frameDuration===5000 ? 'bg-sky-500 text-white border-sky-500 shadow' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-sky-100'}`}
                style={{ width: '100px', height: '36px', borderRadius: '18px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >长（5秒）</button>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 500, marginBottom: 10 }}>过渡时间</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setTransitionDuration(500)}
                className={`font-medium border transition-all duration-200 focus:outline-none ${transitionDuration===500 ? 'bg-sky-500 text-white border-sky-500 shadow' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-sky-100'}`}
                style={{ width: '100px', height: '36px', borderRadius: '18px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >快（0.5秒）</button>
              <button
                type="button"
                onClick={() => setTransitionDuration(1000)}
                className={`font-medium border transition-all duration-200 focus:outline-none ${transitionDuration===1000 ? 'bg-sky-500 text-white border-sky-500 shadow' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-sky-100'}`}
                style={{ width: '100px', height: '36px', borderRadius: '18px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >正常（1秒）</button>
              <button
                type="button"
                onClick={() => setTransitionDuration(3000)}
                className={`font-medium border transition-all duration-200 focus:outline-none ${transitionDuration===3000 ? 'bg-sky-500 text-white border-sky-500 shadow' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-sky-100'}`}
                style={{ width: '100px', height: '36px', borderRadius: '18px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >慢（3秒）</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KeyframePanel; 