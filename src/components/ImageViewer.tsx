import React, { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import ExifPanel from './ExifPanel';
import { ImageInfo, useImageStore } from '../stores/imageStore';
import { processImageFile } from '../utils/imageProcessing';
import { useAnnotationStore, AnnotationType } from '../stores/annotationStore';
import ReactDOM from 'react-dom';
import { useKeyframeStore } from '../stores/keyframeStore';
import type { Keyframe } from '../types/keyframe';

interface Transform {
  scale: number;
  x: number;
  y: number;
}

interface Props {
  images?: ImageInfo[];
}

const ImageViewer: React.FC<Props> = ({ images = [] }) => {
  const { darkMode, syncZoom, demoMode, showZoomControls } = useSettingsStore();
  const { removeImage, addImages } = useImageStore();
  const {
    isAnnotateMode, annotationTool, annotationColor, annotationStrokeWidth, annotationFontSize, annotations, addAnnotation, setAnnotations, undo, redo,
    selectedAnnotationId, setSelectedAnnotationId, drawing, setDrawing, editingTextId, setEditingTextId, deleteAnnotation
  } = useAnnotationStore();
  const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const [transforms, setTransforms] = useState<Transform[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 标注拖动相关状态
  const [draggingAnn, setDraggingAnn] = useState<null | {
    imgIdx: number;
    annId: string;
    start: [number, number];
    last: [number, number];
  }>(null);

  // 新增：单图模式下图片原始宽高
  const [imgSize, setImgSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  // 新增：viewBox状态
  const [viewBox, setViewBox] = useState<[number, number, number, number] | null>(null);

  // 新增：记录文字输入框的SVG和页面坐标
  const [editingTextPos, setEditingTextPos] = useState<{svg: [number, number], page: {left: number, top: number}} | null>(null);

  // 文字输入弹窗相关状态
  const [showTextPopover, setShowTextPopover] = useState(false);
  const [textPopoverPos, setTextPopoverPos] = useState<{ left: number; top: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState('');
  const [pendingTextPoint, setPendingTextPoint] = useState<[number, number] | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const transformsRef = useRef(transforms);
  useEffect(() => {
    transformsRef.current = transforms;
  }, [transforms]);

  const syncZoomRef = useRef(syncZoom);
  useEffect(() => { syncZoomRef.current = syncZoom; }, [syncZoom]);

  // 解析图片分辨率，初始化imgSize和viewBox
  useEffect(() => {
    if (images.length === 1) {
      const res = images[0].exif?.Resolution || '';
      const match = res.match(/(\d+)\s*[×x]\s*(\d+)/);
      if (match) {
        const width = parseInt(match[1], 10);
        const height = parseInt(match[2], 10);
        setImgSize({ width, height });
        setViewBox([0, 0, width, height]);
      }
    }
  }, [images]);

  // 处理文件上传
  const handleFiles = async (files: FileList) => {
    if (!files.length) return;
    
    setIsProcessing(true);
    try {
      const processedImages = await Promise.all(
        Array.from(files)
          .filter(file => file.type.startsWith('image/'))
          .map(processImageFile)
      );
      addImages(processedImages);
    } catch (error) {
      console.error('图片处理失败:', error);
      alert('部分图片处理失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  // 初始化 transforms
  useEffect(() => {
    setTransforms(Array(images.length).fill({ scale: 1, x: 0, y: 0 }));
  }, [images.length]);

  // 拖动状态
  const dragState = useRef({
    isDragging: false,
    currentIndex: -1,
    startX: 0,
    startY: 0
  });

  useEffect(() => {
    containerRefs.current = containerRefs.current.slice(0, images.length);
    imageRefs.current = imageRefs.current.slice(0, images.length);
  }, [images.length]);

  // 统一的 updateTransform
  const updateTransform = (index: number, updater: (old: Transform) => Transform) => {
    setTransforms(prev => {
      if (syncZoomRef.current) {
        const newTransform = updater(prev[index] || { scale: 1, x: 0, y: 0 });
        return prev.map(() => ({ ...newTransform }));
      } else {
        const newTransforms = [...prev];
        newTransforms[index] = updater(prev[index] || { scale: 1, x: 0, y: 0 });
        return newTransforms;
      }
    });
  };

  useEffect(() => {
    const containers = containerRefs.current;

    // 用于解绑的 handler map
    const wheelHandlers: ((e: WheelEvent) => void)[] = [];
    const mouseDownHandlers: ((e: MouseEvent) => void)[] = [];

    containers.forEach((container, index) => {
      if (!container) return;
      const wheelHandler = (e: WheelEvent) => {
        e.preventDefault();
        updateTransform(index, (old) => {
          const delta = e.deltaY * -0.01; // 恢复为原来的缩放灵敏度
          const newScale = Math.max(0.1, Math.min(10, old.scale + delta));
          return { ...old, scale: newScale };
        });
      };
      const mouseDownHandler = (e: MouseEvent) => {
        if ((e.target as HTMLElement).tagName !== 'IMG') return;
        if (isAnnotateMode) return;
        const currentTransform = transformsRef.current[index] || { scale: 1, x: 0, y: 0 };
        dragState.current = {
          isDragging: true,
          currentIndex: index,
          startX: e.clientX - currentTransform.x,
          startY: e.clientY - currentTransform.y
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        e.preventDefault();
      };
      container.addEventListener('wheel', wheelHandler, { passive: false });
      container.addEventListener('mousedown', mouseDownHandler);
      wheelHandlers[index] = wheelHandler;
      mouseDownHandlers[index] = mouseDownHandler;
    });

    function handleMouseMove(e: MouseEvent) {
      if (!dragState.current.isDragging) return;
      const { currentIndex, startX, startY } = dragState.current;
      updateTransform(currentIndex, (old) => ({
        ...old,
        x: e.clientX - startX,
        y: e.clientY - startY,
      }));
    }
    function handleMouseUp() {
      dragState.current.isDragging = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      containers.forEach((container, index) => {
        if (!container) return;
        if (wheelHandlers[index]) container.removeEventListener('wheel', wheelHandlers[index]);
        if (mouseDownHandlers[index]) container.removeEventListener('mousedown', mouseDownHandlers[index]);
      });
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isAnnotateMode, images.length]);

  // 处理SVG绘制事件（仅用于新建标注）
  const getSvgPoint = (e: React.PointerEvent) => {
    const svg = e.currentTarget as SVGSVGElement;
    if (typeof (svg as any).createSVGPoint !== 'function') {
      // 兜底：直接用鼠标在SVG内的偏移
      return [e.nativeEvent.offsetX, e.nativeEvent.offsetY] as [number, number];
    }
    const pt = (svg as any).createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return [0, 0] as [number, number];
    const svgPt = pt.matrixTransform(ctm.inverse());
    return [svgPt.x, svgPt.y] as [number, number];
  };

  // 打开文字输入时，记录触发点
  const openTextPopover = (clientX: number, clientY: number) => {
    // 弹窗宽高
    const popoverWidth = 180;
    const popoverHeight = 48;
    let left = clientX - popoverWidth / 2;
    let top = clientY - popoverHeight / 2;
    // 屏幕边界保护
    if (left < 8) left = 8;
    if (left + popoverWidth > window.innerWidth - 8) left = window.innerWidth - popoverWidth - 8;
    if (top < 8) top = 8;
    if (top + popoverHeight > window.innerHeight - 8) top = window.innerHeight - popoverHeight - 8;
    setTextPopoverPos({ left, top });
  };

  // 监听外部点击关闭
  useEffect(() => {
    if (!editingTextId) return;
    let ignoreNext = true;
    const handleClick = (e: MouseEvent) => {
      const popover = document.querySelector('.text-popover');
      setTimeout(() => {
        if (ignoreNext) {
          ignoreNext = false;
          return;
        }
        if (popover && !popover.contains(e.target as Node)) {
          console.log('[window mousedown] 关闭弹窗');
          setEditingTextId?.(null);
          setEditingTextPos(null);
        }
      }, 0);
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [editingTextId]);

  // 打开文字标注时，记录点击点
  const handleSvgPointerDown = (e: React.PointerEvent, imgIdx: number) => {
    if (!isAnnotateMode) return;
    if (draggingAnn) return;
    if (drawing && drawing.imageId !== images[imgIdx].id) return;
    const [x, y] = getSvgPoint(e);
    if (annotationTool === 'move') {
      // move模式下，点击标注可选中
      const anns = annotations[images[imgIdx].id] || [];
      let found = false;
      for (let i = anns.length - 1; i >= 0; i--) {
        const ann = anns[i];
        // 简单包围盒判断
        if (ann.type === 'rect' || ann.type === 'ellipse') {
          const [x1, y1, x2, y2] = ann.points;
          if (x >= Math.min(x1, x2) && x <= Math.max(x1, x2) && y >= Math.min(y1, y2) && y <= Math.max(y1, y2)) {
            setSelectedAnnotationId(images[imgIdx].id, ann.id);
            found = true;
            break;
          }
        } else if (ann.type === 'pen') {
          // 粗略判断
          for (let j = 0; j < ann.points.length; j += 2) {
            if (Math.abs(ann.points[j] - x) < 8 && Math.abs(ann.points[j+1] - y) < 8) {
              setSelectedAnnotationId(images[imgIdx].id, ann.id);
              found = true;
              break;
            }
          }
        } else if (ann.type === 'text') {
          const [tx, ty] = ann.points;
          if (Math.abs(tx - x) < 40 && Math.abs(ty - y) < 24) {
            setSelectedAnnotationId(images[imgIdx].id, ann.id);
            found = true;
            break;
          }
        }
      }
      if (!found) setSelectedAnnotationId(images[imgIdx].id, null);
      return;
    }
    if (annotationTool === 'text') {
      // 获取 SVG 元素和点击位置
      const svg = e.currentTarget as SVGSVGElement;
      const rect = svg.getBoundingClientRect();
      const scale = transforms[imgIdx]?.scale || 1;
      
      // 计算缩放后的坐标用于标注位置
      const scaledX = (e.clientX - rect.left) / scale;
      const scaledY = (e.clientY - rect.top) / scale;
      
      setShowTextPopover(true);
      setTextPopoverPos({ left: e.clientX, top: e.clientY });
      setPendingTextPoint([scaledX, scaledY]);
      setTextInputValue('');
      return;
    }
    // 其他类型绘制逻辑
    if (annotationTool === 'pen') {
      setDrawing({ type: 'pen', start: [x, y], points: [x, y], imageId: images[imgIdx].id });
    } else {
      setDrawing({ type: annotationTool, start: [x, y], points: [x, y, x, y], imageId: images[imgIdx].id });
    }
  };

  // 定界框外扩量
  const BBOX_PAD = 8;
  // 定界框圆角大小
  const BBOX_RADIUS = 4;

  const DELETE_BTN_RADIUS = 9;
  const DELETE_BTN_MARGIN = 4;
  const DeleteSvgButton = ({cx, cy, onPointerUp}: {cx: number, cy: number, onPointerUp: (e: React.PointerEvent) => void}) => {
    const [hover, setHover] = useState(false);
    return (
      <g
        style={{cursor: 'pointer'}}
        onPointerDown={e => { e.stopPropagation(); }}
        onPointerUp={onPointerUp}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <circle cx={cx} cy={cy} r={DELETE_BTN_RADIUS} fill={hover ? '#007AFF' : '#fff'} stroke="#007AFF" strokeWidth={1.5} />
        <path d={`M${cx-3},${cy-3} L${cx+3},${cy+3} M${cx-3},${cy+3} L${cx+3},${cy-3}`} stroke={hover ? '#fff' : '#007AFF'} strokeWidth={1.5} strokeLinecap="round"/>
      </g>
    );
  };

  // 定界框onPointerDown只做选中，拖动逻辑用onPointerMove
  const [dragStart, setDragStart] = useState<null | { x: number; y: number; annId: string; imgIdx: number }>(null);

  const handleSvgPointerMove = (e: React.PointerEvent, imgIdx: number) => {
    if (!isAnnotateMode) return;
    
    // 处理从dragStart到draggingAnn的转换
    if (dragStart) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      // 当移动超过阈值时，转换为拖动状态
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        setDraggingAnn({
          imgIdx: dragStart.imgIdx,
          annId: dragStart.annId,
          start: [dragStart.x, dragStart.y],
          last: [e.clientX, e.clientY]
        });
        setDragStart(null);
      }
      return;
    }

    // 处理拖动状态
    if (draggingAnn) {
      const [x, y] = [e.clientX, e.clientY];
      const dx = x - draggingAnn.last[0];
      const dy = y - draggingAnn.last[1];
      // 考虑图片缩放比例
      const scale = transforms[imgIdx]?.scale || 1;
      const scaledDx = dx / scale;
      const scaledDy = dy / scale;
      
      if (Math.abs(scaledDx) > 0.01 || Math.abs(scaledDy) > 0.01) {
        if (syncZoomRef.current) {
          images.forEach(img => {
            if (selectedAnnotationId[img.id]) {
              useAnnotationStore.getState().moveAnnotation(img.id, selectedAnnotationId[img.id]!, scaledDx, scaledDy);
            }
          });
        } else {
          useAnnotationStore.getState().moveAnnotation(images[imgIdx].id, draggingAnn.annId, scaledDx, scaledDy);
        }
        setDraggingAnn({ ...draggingAnn, last: [x, y] });
      }
      return;
    }

    // 处理绘制状态
    if (!drawing || drawing.imageId !== images[imgIdx].id) return;
    const [x, y] = getSvgPoint(e);
    if (drawing && drawing.type === 'pen') {
      setDrawing({ ...drawing, points: [...drawing.points, x, y] });
    } else if (drawing) {
      setDrawing({ ...drawing, points: [drawing.start[0], drawing.start[1], x, y] });
    }
  };

  const handleSvgPointerUp = (e: React.PointerEvent, imgIdx: number) => {
    if (!isAnnotateMode) return;
    if (dragStart) { setDragStart(null); return; }
    if (draggingAnn) { setDraggingAnn(null); return; }
    if (!drawing || drawing.imageId !== images[imgIdx].id) return;
    const ann = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: drawing.type,
      points: drawing.points,
      color: annotationColor,
      strokeWidth: annotationStrokeWidth,
    };
    if (syncZoomRef.current) {
      images.forEach(img => addAnnotation(img.id, ann));
    } else {
      addAnnotation(images[imgIdx].id, ann);
    }
    setDrawing(null);
  };

  // 撤销/重做快捷键
  useEffect(() => {
    if (!isAnnotateMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        // 撤销当前图片
        if (images.length > 0) undo(images[0].id);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        // 重做当前图片
        if (images.length > 0) redo(images[0].id);
      }
      // 删除选中标注
      if ((e.key === 'Delete' || e.key === 'Backspace')) {
        if (syncZoomRef.current) {
          images.forEach(img => {
            const annId = selectedAnnotationId[img.id];
            if (annId) {
              useAnnotationStore.getState().deleteAnnotation(img.id, annId);
            }
          });
        } else {
          // 仅删除当前图片的选中标注
          images.forEach(img => {
            const annId = selectedAnnotationId[img.id];
            if (annId) {
              useAnnotationStore.getState().deleteAnnotation(img.id, annId);
            }
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnnotateMode, images, undo, redo, selectedAnnotationId, syncZoomRef]);

  useEffect(() => {
    if (images.length === 0) {
      useImageStore.setState({ hasViewedImages: false });
    }
  }, [images.length]);

  // 处理文字输入完成
  const handleTextInputComplete = () => {
    if (textInputValue.trim() && pendingTextPoint) {
      // 新建文字标注
      const newAnn = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'text' as AnnotationType,
        points: pendingTextPoint,
        color: annotationColor,
        strokeWidth: annotationStrokeWidth,
        text: textInputValue,
        fontSize: annotationFontSize,
      };
      if (syncZoomRef.current) {
        // 同步模式下，在所有图片上添加相同的文字标注
        images.forEach(img => addAnnotation(img.id, newAnn));
      } else {
        // 非同步模式下，只在当前图片上添加文字标注
        addAnnotation(images[0].id, newAnn);
      }
    }
    setShowTextPopover(false);
    setTextPopoverPos(null);
    setTextInputValue('');
    setPendingTextPoint(null);
  };

  // 文字输入弹窗内容
  const textPopover = showTextPopover && textPopoverPos ? ReactDOM.createPortal(
    <>
      <div
        className="text-popover-mask"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: 'transparent',
        }}
        onClick={handleTextInputComplete}
      />
      <textarea
        ref={textAreaRef}
        value={textInputValue}
        onChange={e => {
          setTextInputValue(e.target.value);
          // 根据内容自动调整宽度
          if (textAreaRef.current) {
            textAreaRef.current.style.width = '2px';
            textAreaRef.current.style.width = `${Math.max(180, textAreaRef.current.scrollWidth)}px`;
          }
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleTextInputComplete();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowTextPopover(false);
            setTextPopoverPos(null);
            setTextInputValue('');
            setPendingTextPoint(null);
          }
        }}
        placeholder="请输入文字..."
        style={{
          position: 'fixed',
          left: textPopoverPos.left,
          top: textPopoverPos.top,
          width: '180px',
          minWidth: '2px',
          height: annotationFontSize + 4,
          padding: '0 2px',
          margin: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: annotationColor,
          caretColor: annotationColor,
          fontSize: annotationFontSize,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          resize: 'none',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          zIndex: 9999,
          lineHeight: '1',
          verticalAlign: 'middle',
          transform: 'translate(-2px, -50%)',
          boxSizing: 'border-box',
        }}
      />
    </>,
    document.body
  ) : null;

  // 添加自动聚焦效果
  useEffect(() => {
    if (showTextPopover && textAreaRef.current) {
      // 使用 requestAnimationFrame 确保在下一帧执行，避免可能的竞态条件
      requestAnimationFrame(() => {
        if (textAreaRef.current) {
          textAreaRef.current.focus();
          // 将光标移到文本末尾
          const length = textAreaRef.current.value.length;
          textAreaRef.current.setSelectionRange(length, length);
        }
      });
    }
  }, [showTextPopover]);

  // 添加 Tooltip 组件
  const Tooltip = ({ children, text }: { children: React.ReactNode; text: string }) => {
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
            className={`absolute top-full left-1/2 transform -translate-x-1/2 translate-y-1 px-2 py-1 text-xs rounded whitespace-nowrap z-50 mt-1 shadow-lg
              ${darkMode 
                ? 'bg-gray-700 text-gray-200' 
                : 'bg-gray-100 text-gray-700'
              }`}
          >
            {text}
            <div 
              className={`absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent 
                ${darkMode 
                  ? 'border-b-gray-700' 
                  : 'border-b-gray-100'
                }`} 
            />
          </div>
        )}
      </div>
    );
  };

  // 新增：每张图片的缩放按钮选中状态（-1表示无选中）
  const [zoomButtonActive, setZoomButtonActive] = useState<number[]>([]);

  // 缩放比例按钮组样式和顺序调整
  const zoomLevels = [1, 2, 5];

  // 初始化 zoomButtonActive
  useEffect(() => {
    setZoomButtonActive(Array(images.length).fill(-1));
  }, [images.length]);

  // 缩放按钮点击
  const handleZoomButtonClick = (imgIdx: number, levelIdx: number) => {
    setZoomButtonActive(prev => {
      const newArr = [...prev];
      // 再次点击已选中则取消
      if (newArr[imgIdx] === levelIdx) {
        newArr[imgIdx] = -1;
      } else {
        newArr[imgIdx] = levelIdx;
      }
      return newArr;
    });
    setTransforms(prev => {
      const newArr = [...prev];
      if (zoomButtonActive[imgIdx] === levelIdx) {
        // 取消选中，恢复1x
        if (syncZoomRef.current) {
          // 同步模式下，所有图片都恢复1x
          return newArr.map(() => ({ scale: 1, x: 0, y: 0 }));
        } else {
        newArr[imgIdx] = { ...newArr[imgIdx], scale: 1 };
        }
      } else {
        if (syncZoomRef.current) {
          // 同步模式下，所有图片都同步到新的缩放级别
          return newArr.map(() => ({ scale: zoomLevels[levelIdx], x: 0, y: 0 }));
      } else {
        newArr[imgIdx] = { ...newArr[imgIdx], scale: zoomLevels[levelIdx] };
        }
      }
      return newArr;
    });
  };

  // 监听手动缩放（滚轮/拖动）自动取消按钮高亮
  useEffect(() => {
    setZoomButtonActive(prev => prev.map((active, idx) => {
      if (active === -1) return -1;
      const scale = transforms[idx]?.scale || 1;
      if (Math.abs(scale - zoomLevels[active]) > 0.01) return -1;
      return active;
    }));
  }, [transforms]);

  const {
    enabled: keyframeEnabled, keyframes, currentIdx, setKeyframe, setCurrentIdx, playing, setPlaying,
    frameDuration, transitionDuration, transitionEasing
  } = useKeyframeStore();

  // 单图模式关键帧逻辑
  useEffect(() => {
    if (!keyframeEnabled || images.length !== 1) return;
    const imgIdx = 0;
    const kf: Keyframe = { scale: transforms[imgIdx]?.scale || 1, offsetX: transforms[imgIdx]?.x || 0, offsetY: transforms[imgIdx]?.y || 0 };
    setKeyframe(currentIdx, kf);
    // eslint-disable-next-line
  }, [transforms[0]?.scale, transforms[0]?.x, transforms[0]?.y, keyframeEnabled, currentIdx, images.length]);

  // 单图模式动画
  React.useEffect(() => {
    if (!keyframeEnabled || images.length !== 1) return;
    const imgIdx = 0;
    const target = keyframes[currentIdx];
    if (!target) return;
    let frame: number;
    let step = 0;
    const duration = transitionDuration || 400;
    const start = { scale: transforms[imgIdx]?.scale || 1, x: transforms[imgIdx]?.x || 0, y: transforms[imgIdx]?.y || 0 };
    const end = { scale: target.scale, x: target.offsetX, y: target.offsetY };
    const getEase = (t: number) => {
      if (transitionEasing === 'linear') return t;
      if (transitionEasing === 'ease-in') return t * t;
      // 默认 ease-in-out
      return t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    };
    const animate = () => {
      step += 16;
      const t = Math.min(step / duration, 1);
      const ease = getEase(t);
      const scale = start.scale + (end.scale - start.scale) * ease;
      const x = start.x + (end.x - start.x) * ease;
      const y = start.y + (end.y - start.y) * ease;
      setTransforms(prev => {
        const arr = [...prev];
        arr[imgIdx] = { scale, x, y };
        return arr;
      });
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line
  }, [currentIdx, keyframeEnabled, images.length, transitionDuration, transitionEasing]);

  // 多图模式关键帧逻辑
  useEffect(() => {
    if (!keyframeEnabled || images.length <= 1) return;
    images.forEach((img, index) => {
      const kf: Keyframe = { scale: transforms[index]?.scale || 1, offsetX: transforms[index]?.x || 0, offsetY: transforms[index]?.y || 0 };
      setKeyframe(currentIdx, kf);
    });
    // eslint-disable-next-line
  }, [transforms, keyframeEnabled, currentIdx, images.length]);

  // 多图模式动画
  React.useEffect(() => {
    if (!keyframeEnabled || images.length <= 1) return;
    images.forEach((img, index) => {
      const target = keyframes[currentIdx];
      if (!target) return;
      let frame: number;
      let step = 0;
      const duration = transitionDuration || 400;
      const start = { scale: transforms[index]?.scale || 1, x: transforms[index]?.x || 0, y: transforms[index]?.y || 0 };
      const end = { scale: target.scale, x: target.offsetX, y: target.offsetY };
      const getEase = (t: number) => {
        if (transitionEasing === 'linear') return t;
        if (transitionEasing === 'ease-in') return t * t;
        // 默认 ease-in-out
        return t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
      };
      const animate = () => {
        step += 16;
        const t = Math.min(step / duration, 1);
        const ease = getEase(t);
        const scale = start.scale + (end.scale - start.scale) * ease;
        const x = start.x + (end.x - start.x) * ease;
        const y = start.y + (end.y - start.y) * ease;
        setTransforms(prev => {
          const arr = [...prev];
          arr[index] = { scale, x, y };
          return arr;
        });
        if (t < 1) frame = requestAnimationFrame(animate);
      };
      animate();
      return () => cancelAnimationFrame(frame);
    });
    // eslint-disable-next-line
  }, [currentIdx, keyframeEnabled, images.length, transitionDuration, transitionEasing]);

  // 播放功能
  useEffect(() => {
    if (!keyframeEnabled || !playing) return;
    let idx = currentIdx;
    let timer: NodeJS.Timeout;
    const next = () => {
      idx = (idx + 1) % 5;
      setCurrentIdx(idx);
      if (idx !== 4) {
        timer = setTimeout(next, frameDuration || 1200);
      } else {
        setPlaying(false);
      }
    };
    timer = setTimeout(next, frameDuration || 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, [playing, keyframeEnabled, frameDuration]);

  // 快捷键支持
  React.useEffect(() => {
    if (!keyframeEnabled) return;
    const handle = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code.startsWith('Digit')) {
        const n = Number(e.code.replace('Digit', ''));
        if (n >= 1 && n <= 5) setCurrentIdx(n-1);
      }
      if (e.code === 'Space') {
        setPlaying(!playing);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
    // eslint-disable-next-line
  }, [keyframeEnabled, playing]);

  if (images.length === 0) {
    // 当没有图片时，返回null，重置hasViewedImages放到useEffect
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      {images.length === 1 ? (
        <div className="w-full md:w-[90%] h-[80vh] px-4 flex items-center justify-center">
          <div 
            key={images[0].id} 
            className="relative w-full h-full flex items-center justify-center"
          >
            <div
              ref={el => containerRefs.current[0] = el}
              className={`w-full h-full ${
                darkMode ? 'bg-black' : 'bg-white'
              } rounded-lg shadow-lg overflow-hidden relative group`}
            >
              {/* 缩放按钮组和比例显示（移到exif信息上方） */}
              {showZoomControls && (
                <div className="absolute left-1/2 transform -translate-x-1/2 bottom-36 z-30 flex flex-row items-end space-x-3 select-none mb-4">
                  {zoomLevels.map((z, zi) => {
                    const scale = transforms[0]?.scale || 1;
                    let active = false;
                    if (zi === 0 && scale >= 1 && scale < 2) active = true;
                    if (zi === 1 && scale >= 2 && scale < 5) active = true;
                    if (zi === 2 && scale >= 5) active = true;
                    // 只保留1位小数，整数不显示小数点
                    const scaleText = Number.isInteger(scale) ? `${scale}x` : `${scale.toFixed(1)}x`;
                    return (
                      <button
                        key={z}
                        onClick={() => handleZoomButtonClick(0, zi)}
                        className={`w-9 h-9 flex items-center justify-center rounded-full font-semibold transition-all duration-200 shadow-md
                          border border-gray-300 dark:border-gray-700
                          bg-white/80 dark:bg-gray-900/80 backdrop-blur-md
                          hover:bg-sky-100/80 dark:hover:bg-gray-800/90
                          focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-50
                        `}
                        style={{ minWidth: 36, minHeight: 36, maxWidth: 36, maxHeight: 36, outline: 'none', position: 'relative', transform: active ? 'scale(1.22)' : 'scale(1)' }}
                        title={`缩放到${z}x`}
                      >
                        {/* 按钮内显示实时缩放比例或倍率 */}
                        {active ? (
                          <span className="text-gray-700 dark:text-gray-100 font-medium whitespace-nowrap text-[13px] leading-none drop-shadow-sm">{scaleText}</span>
                        ) : (
                          <span className="text-gray-700 dark:text-gray-200 font-medium whitespace-nowrap text-[13px] leading-none drop-shadow-sm">{z}x</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {/* 回退：恢复原img标签和transform缩放方式 */}
              <img
                ref={el => imageRefs.current[0] = el}
                src={images[0].url}
                alt={images[0].exif.FileName}
                className="w-full h-full object-contain select-none"
                style={{
                  transform: `translate(${transforms[0]?.x || 0}px, ${transforms[0]?.y || 0}px) scale(${transforms[0]?.scale || 1})`,
                  // 图片缩放动画效果：
                  // transition: dragState.current.isDragging ? 'none' : 'transform 0.1s ease'
                  // - 拖动时禁用动画
                  // - 缩放时使用0.1s的ease缓动
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
                draggable={false}
              />
              {/* 修复：单图模式下也渲染SVG用于标注绘制 */}
              <svg
                className="absolute inset-0 w-full h-full z-20"
                style={{
                  transform: `translate(${transforms[0]?.x || 0}px, ${transforms[0]?.y || 0}px) scale(${transforms[0]?.scale || 1})`,
                  pointerEvents: isAnnotateMode ? (showTextPopover ? 'none' : 'auto') : 'none',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
                onPointerDown={isAnnotateMode ? (e => handleSvgPointerDown(e, 0)) : undefined}
                onPointerMove={isAnnotateMode ? (e => handleSvgPointerMove(e, 0)) : undefined}
                onPointerUp={isAnnotateMode ? (e => handleSvgPointerUp(e, 0)) : undefined}
              >
                {/* 已有标注 */}
                {(annotations[images[0].id] || []).map((ann, index) => {
                  const isSelected = selectedAnnotationId[images[0].id] === ann.id;
                  if (ann.type === 'rect') {
                    const [x1, y1, x2, y2] = ann.points;
                    const minX = Math.min(x1, x2), minY = Math.min(y1, y2), w = Math.abs(x2-x1), h = Math.abs(y2-y1);
                    return (
                      <g key={ann.id}>
                        <rect x={minX} y={minY} width={w} height={h} stroke={ann.color} strokeWidth={ann.strokeWidth} vectorEffect="non-scaling-stroke" fill="none"
                          onPointerDown={e => { e.stopPropagation(); setSelectedAnnotationId(images[0].id, ann.id);
                            // 拖动前保存撤销快照
                            if (annotationTool === 'move') {
                              if (syncZoomRef.current) {
                                images.forEach(img => useAnnotationStore.getState().pushUndo(img.id, annotations[img.id] || []));
                              } else {
                                useAnnotationStore.getState().pushUndo(images[0].id, annotations[images[0].id] || []);
                              }
                            }
                            setDragStart({ x: e.clientX, y: e.clientY, annId: ann.id, imgIdx: 0 }); }}
                        />
                        {annotationTool === 'move' && isSelected && (
                          <g>
                            <rect 
                              x={minX-BBOX_PAD} 
                              y={minY-BBOX_PAD} 
                              width={w+BBOX_PAD*2} 
                              height={h+BBOX_PAD*2} 
                              stroke="#007AFF" 
                              strokeWidth={2} 
                              fill="none" 
                              rx={BBOX_RADIUS} 
                              strokeDasharray="4 4"
                              style={{filter:'drop-shadow(0 0 2px #007AFF88)'}} 
                              pointerEvents="all"
                              onPointerDown={e => { e.stopPropagation(); setDraggingAnn({ imgIdx: 0, annId: ann.id, start: [e.clientX, e.clientY], last: [e.clientX, e.clientY] }); }}
                            />
                            <DeleteSvgButton
                              cx={minX + w + BBOX_PAD + DELETE_BTN_RADIUS + DELETE_BTN_MARGIN}
                              cy={minY - BBOX_PAD - DELETE_BTN_RADIUS - DELETE_BTN_MARGIN}
                              onPointerUp={e => {
                                e.stopPropagation();
                                if (syncZoomRef.current) {
                                  images.forEach(img => deleteAnnotation(img.id, ann.id));
                                } else {
                                  deleteAnnotation(images[0].id, ann.id);
                                }
                              }}
                            />
                          </g>
                        )}
                      </g>
                    );
                  }
                  if (ann.type === 'ellipse') {
                    const [x1, y1, x2, y2] = ann.points;
                    const minX = Math.min(x1, x2), minY = Math.min(y1, y2), w = Math.abs(x2-x1), h = Math.abs(y2-y1);
                    return (
                      <g key={ann.id}>
                        <ellipse cx={(x1+x2)/2} cy={(y1+y2)/2} rx={w/2} ry={h/2} stroke={ann.color} strokeWidth={ann.strokeWidth} vectorEffect="non-scaling-stroke" fill="none"
                          onPointerDown={e => { e.stopPropagation(); setSelectedAnnotationId(images[0].id, ann.id);
                            // 拖动前保存撤销快照
                            if (annotationTool === 'move') {
                              if (syncZoomRef.current) {
                                images.forEach(img => useAnnotationStore.getState().pushUndo(img.id, annotations[img.id] || []));
                              } else {
                                useAnnotationStore.getState().pushUndo(images[0].id, annotations[images[0].id] || []);
                              }
                            }
                            setDragStart({ x: e.clientX, y: e.clientY, annId: ann.id, imgIdx: 0 }); }}
                        />
                        {annotationTool === 'move' && isSelected && (
                          <g>
                            <rect 
                              x={minX-BBOX_PAD} 
                              y={minY-BBOX_PAD} 
                              width={w+BBOX_PAD*2} 
                              height={h+BBOX_PAD*2} 
                              stroke="#007AFF" 
                              strokeWidth={2} 
                              fill="none" 
                              rx={BBOX_RADIUS} 
                              strokeDasharray="4 4"
                              style={{filter:'drop-shadow(0 0 2px #007AFF88)'}} 
                              pointerEvents="all"
                              onPointerDown={e => { e.stopPropagation(); setDraggingAnn({ imgIdx: 0, annId: ann.id, start: [e.clientX, e.clientY], last: [e.clientX, e.clientY] }); }}
                            />
                            <DeleteSvgButton
                              cx={minX + w + BBOX_PAD + DELETE_BTN_RADIUS + DELETE_BTN_MARGIN}
                              cy={minY - BBOX_PAD - DELETE_BTN_RADIUS - DELETE_BTN_MARGIN}
                              onPointerUp={e => {
                                e.stopPropagation();
                                if (syncZoomRef.current) {
                                  images.forEach(img => deleteAnnotation(img.id, ann.id));
                                } else {
                                  deleteAnnotation(images[0].id, ann.id);
                                }
                              }}
                            />
                          </g>
                        )}
                      </g>
                    );
                  }
                  if (ann.type === 'pen') {
                    const pts = ann.points;
                    const d = pts.length >= 4 ? `M${pts[0]},${pts[1]} ` + pts.slice(2).map((v,i) => i%2===0?`L${pts[i+2]},${pts[i+3]}`:'').join(' ') : '';
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    for (let i = 0; i < pts.length; i += 2) {
                      minX = Math.min(minX, pts[i]);
                      minY = Math.min(minY, pts[i+1]);
                      maxX = Math.max(maxX, pts[i]);
                      maxY = Math.max(maxY, pts[i+1]);
                    }
                    return (
                      <g key={ann.id}>
                        <path d={d} stroke={ann.color} strokeWidth={ann.strokeWidth} vectorEffect="non-scaling-stroke" fill="none" strokeLinejoin="round" strokeLinecap="round"
                          onPointerDown={e => { e.stopPropagation(); setSelectedAnnotationId(images[0].id, ann.id);
                            // 拖动前保存撤销快照
                            if (annotationTool === 'move') {
                              if (syncZoomRef.current) {
                                images.forEach(img => useAnnotationStore.getState().pushUndo(img.id, annotations[img.id] || []));
                              } else {
                                useAnnotationStore.getState().pushUndo(images[0].id, annotations[images[0].id] || []);
                              }
                            }
                            setDragStart({ x: e.clientX, y: e.clientY, annId: ann.id, imgIdx: 0 }); }}
                        />
                        {annotationTool === 'move' && isSelected && (
                          <g>
                            <rect 
                              x={minX-BBOX_PAD} 
                              y={minY-BBOX_PAD} 
                              width={maxX-minX+BBOX_PAD*2} 
                              height={maxY-minY+BBOX_PAD*2} 
                              stroke="#007AFF" 
                              strokeWidth={2} 
                              fill="none" 
                              rx={BBOX_RADIUS} 
                              strokeDasharray="4 4"
                              style={{filter:'drop-shadow(0 0 2px #007AFF88)'}} 
                              pointerEvents="all"
                              onPointerDown={e => { e.stopPropagation(); setDraggingAnn({ imgIdx: 0, annId: ann.id, start: [e.clientX, e.clientY], last: [e.clientX, e.clientY] }); }}
                            />
                            <DeleteSvgButton
                              cx={maxX + BBOX_PAD + DELETE_BTN_RADIUS + DELETE_BTN_MARGIN}
                              cy={minY - BBOX_PAD - DELETE_BTN_RADIUS - DELETE_BTN_MARGIN}
                              onPointerUp={e => {
                                e.stopPropagation();
                                if (syncZoomRef.current) {
                                  images.forEach(img => deleteAnnotation(img.id, ann.id));
                                } else {
                                  deleteAnnotation(images[0].id, ann.id);
                                }
                              }}
                            />
                          </g>
                        )}
                      </g>
                    );
                  }
                  if (ann.type === 'text') {
                    const [tx, ty] = ann.points;
                    // 计算文字实际宽度
                    const textWidth = (ann.text?.length || 0) * (ann.fontSize || 18) * 0.96; // 0.96是一个经验系数，用于估算字符宽度
                    const w = Math.max(120, textWidth + 16); // 最小宽度120px，加上一些padding
                    const h = 40;
                    if (editingTextId === ann.id) {
                      return null;
                    }
                    return (
                      <g key={ann.id}>
                        <text
                          x={tx}
                          y={ty}
                          fontSize={ann.fontSize || 18}
                          fill={ann.color}
                          textAnchor="start"
                          alignmentBaseline="middle"
                          style={{ 
                            cursor: annotationTool === 'move' ? 'move' : 'text', 
                            userSelect: 'none', 
                            ...(isSelected ? { filter: 'drop-shadow(0 0 2px #007AFF88)' } : {})
                          }}
                          onDoubleClick={() => setEditingTextId?.(ann.id)}
                          onPointerDown={e => { 
                            e.stopPropagation(); 
                            if (annotationTool === 'move') {
                              setSelectedAnnotationId(images[0].id, ann.id);
                              setDraggingAnn({ imgIdx: 0, annId: ann.id, start: [e.clientX, e.clientY], last: [e.clientX, e.clientY] });
                            }
                          }}
                        >{ann.text}</text>
                        {annotationTool === 'move' && isSelected && (
                          <g>
                            <rect 
                              x={tx-BBOX_PAD} 
                              y={ty-h/2-BBOX_PAD} 
                              width={w+BBOX_PAD*2} 
                              height={h+BBOX_PAD*2} 
                              stroke="#007AFF" 
                              strokeWidth={2} 
                              fill="none" 
                              rx={BBOX_RADIUS} 
                              strokeDasharray="4 4"
                              style={{filter:'drop-shadow(0 0 2px #007AFF88)'}}
                              pointerEvents="all"
                              onPointerDown={e => { 
                                e.stopPropagation(); 
                                setDraggingAnn({ imgIdx: 0, annId: ann.id, start: [e.clientX, e.clientY], last: [e.clientX, e.clientY] });
                              }}
                            />
                            <DeleteSvgButton
                              cx={tx + w + BBOX_PAD + DELETE_BTN_RADIUS + DELETE_BTN_MARGIN}
                              cy={ty - h/2 - BBOX_PAD - DELETE_BTN_RADIUS - DELETE_BTN_MARGIN}
                              onPointerUp={e => {
                                e.stopPropagation();
                                if (syncZoomRef.current) {
                                  images.forEach(img => deleteAnnotation(img.id, ann.id));
                                } else {
                                  deleteAnnotation(images[0].id, ann.id);
                                }
                              }}
                            />
                          </g>
                        )}
                      </g>
                    );
                  }
                  return null;
                })}
                {/* 正在绘制 */}
                {drawing && (
                  (syncZoomRef.current || images[0].id === drawing.imageId) && (
                    (() => {
                      if (drawing.type === 'rect') {
                        return <rect x={Math.min(drawing.start[0], drawing.points[2])} y={Math.min(drawing.start[1], drawing.points[3])} width={Math.abs(drawing.points[2]-drawing.start[0])} height={Math.abs(drawing.points[3]-drawing.start[1])} stroke={annotationColor} strokeWidth={annotationStrokeWidth} vectorEffect="non-scaling-stroke" fill="none" pointerEvents="none" />;
                      } else if (drawing.type === 'ellipse') {
                        return <ellipse cx={(drawing.start[0]+drawing.points[2])/2} cy={(drawing.start[1]+drawing.points[3])/2} rx={Math.abs(drawing.points[2]-drawing.start[0])/2} ry={Math.abs(drawing.points[3]-drawing.start[1])/2} stroke={annotationColor} strokeWidth={annotationStrokeWidth} vectorEffect="non-scaling-stroke" fill="none" pointerEvents="none" />;
                      } else if (drawing.type === 'pen' && drawing.points.length >= 4) {
                        return <path d={`M${drawing.points[0]},${drawing.points[1]} ` + drawing.points.slice(2).map((v,i) => i%2===0?`L${drawing.points[i+2]},${drawing.points[i+3]}`:'').join(' ')} stroke={annotationColor} strokeWidth={annotationStrokeWidth} vectorEffect="non-scaling-stroke" fill="none" strokeLinejoin="round" strokeLinecap="round" pointerEvents="none" />;
                      }
                      return null;
                    })()
                  )
                )}
              </svg>
              <ExifPanel imageInfo={images[0]} />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 w-full md:w-[90%] h-full items-center justify-center px-4 mx-auto" style={{
          gridTemplateColumns: `repeat(${images.length}, minmax(0, 1fr))`
        }}>
          {images.map((image, index) => (
            <div key={image.id} className="relative w-full h-full flex items-center justify-center">
              <div
                ref={el => containerRefs.current[index] = el}
                className={`w-full h-[80vh] ${
                  darkMode ? 'bg-black' : 'bg-white'
                } rounded-lg shadow-lg overflow-hidden relative group`}
              >
                {/* 缩放按钮组和比例显示（移到exif信息上方） */}
                {showZoomControls && (
                  <div className="absolute left-1/2 transform -translate-x-1/2 bottom-36 z-30 flex flex-row items-end space-x-3 select-none mb-4">
                    {zoomLevels.map((z, zi) => {
                      const scale = transforms[index]?.scale || 1;
                      let active = false;
                      if (zi === 0 && scale >= 1 && scale < 2) active = true;
                      if (zi === 1 && scale >= 2 && scale < 5) active = true;
                      if (zi === 2 && scale >= 5) active = true;
                      const scaleText = Number.isInteger(scale) ? `${scale}x` : `${scale.toFixed(1)}x`;
                      return (
                        <button
                          key={z}
                          onClick={() => handleZoomButtonClick(index, zi)}
                          className={`w-9 h-9 flex items-center justify-center rounded-full font-semibold transition-all duration-200 shadow-md
                            border border-gray-300 dark:border-gray-700
                            bg-white/80 dark:bg-gray-900/80 backdrop-blur-md
                            hover:bg-sky-100/80 dark:hover:bg-gray-800/90
                            focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-50
                          `}
                          style={{ minWidth: 36, minHeight: 36, maxWidth: 36, maxHeight: 36, outline: 'none', position: 'relative', transform: active ? 'scale(1.22)' : 'scale(1)' }}
                          title={`缩放到${z}x`}
                        >
                          {active ? (
                            <span className="text-gray-700 dark:text-gray-100 font-medium whitespace-nowrap text-[13px] leading-none drop-shadow-sm">{scaleText}</span>
                          ) : (
                            <span className="text-gray-700 dark:text-gray-200 font-medium whitespace-nowrap text-[13px] leading-none drop-shadow-sm">{z}x</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                <img
                  ref={el => imageRefs.current[index] = el}
                  src={image.url}
                  alt={image.exif.FileName}
                  className="w-full h-full object-contain select-none"
                  style={{
                    transform: `translate(${transforms[index]?.x || 0}px, ${transforms[index]?.y || 0}px) scale(${transforms[index]?.scale || 1})`,
                    // 图片缩放动画效果：
                    // transition: dragState.current.isDragging ? 'none' : 'transform 0.1s ease'
                    // - 拖动时禁用动画
                    // - 缩放时使用0.1s的ease缓动
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                  draggable={false}
                />
                <svg
                  className="absolute inset-0 w-full h-full z-20"
                  style={{
                    transform: `translate(${transforms[index]?.x || 0}px, ${transforms[index]?.y || 0}px) scale(${transforms[index]?.scale || 1})`,
                    pointerEvents: isAnnotateMode ? 'auto' : 'none',
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                  onPointerDown={isAnnotateMode ? (e => handleSvgPointerDown(e, index)) : undefined}
                  onPointerMove={isAnnotateMode ? (e => handleSvgPointerMove(e, index)) : undefined}
                  onPointerUp={isAnnotateMode ? (e => handleSvgPointerUp(e, index)) : undefined}
                >
                  {/* 已有标注 */}
                  {(annotations[image.id] || []).map(ann => {
                    const isSelected = selectedAnnotationId[image.id] === ann.id;
                    if (ann.type === 'rect') {
                      const [x1, y1, x2, y2] = ann.points;
                      const minX = Math.min(x1, x2), minY = Math.min(y1, y2), w = Math.abs(x2-x1), h = Math.abs(y2-y1);
                      return (
                        <g key={ann.id}>
                          <rect x={minX} y={minY} width={w} height={h} stroke={ann.color} strokeWidth={ann.strokeWidth} vectorEffect="non-scaling-stroke" fill="none"
                            onPointerDown={e => { e.stopPropagation(); setSelectedAnnotationId(image.id, ann.id);
                              // 拖动前保存撤销快照
                              if (annotationTool === 'move') {
                                if (syncZoomRef.current) {
                                  images.forEach(img => useAnnotationStore.getState().pushUndo(img.id, annotations[img.id] || []));
                                } else {
                                  useAnnotationStore.getState().pushUndo(image.id, annotations[image.id] || []);
                                }
                              }
                              setDragStart({ x: e.clientX, y: e.clientY, annId: ann.id, imgIdx: index }); }}
                          />
                          {annotationTool === 'move' && isSelected && (
                            <g>
                              <rect 
                                x={minX-BBOX_PAD} 
                                y={minY-BBOX_PAD} 
                                width={w+BBOX_PAD*2} 
                                height={h+BBOX_PAD*2} 
                                stroke="#007AFF" 
                                strokeWidth={2} 
                                fill="none" 
                                rx={BBOX_RADIUS} 
                                strokeDasharray="4 4"
                                style={{filter:'drop-shadow(0 0 2px #007AFF88)'}} 
                                pointerEvents="all"
                                onPointerDown={e => { e.stopPropagation(); setDraggingAnn({ imgIdx: index, annId: ann.id, start: [e.clientX, e.clientY], last: [e.clientX, e.clientY] }); }}
                              />
                              <DeleteSvgButton
                                cx={minX + w + BBOX_PAD + DELETE_BTN_RADIUS + DELETE_BTN_MARGIN}
                                cy={minY - BBOX_PAD - DELETE_BTN_RADIUS - DELETE_BTN_MARGIN}
                                onPointerUp={e => {
                                  e.stopPropagation();
                                  if (syncZoomRef.current) {
                                    images.forEach(img => deleteAnnotation(img.id, ann.id));
                                  } else {
                                    deleteAnnotation(image.id, ann.id);
                                  }
                                }}
                              />
                            </g>
                          )}
                        </g>
                      );
                    }
                    if (ann.type === 'ellipse') {
                      const [x1, y1, x2, y2] = ann.points;
                      const minX = Math.min(x1, x2), minY = Math.min(y1, y2), w = Math.abs(x2-x1), h = Math.abs(y2-y1);
                      return (
                        <g key={ann.id}>
                          <ellipse cx={(x1+x2)/2} cy={(y1+y2)/2} rx={w/2} ry={h/2} stroke={ann.color} strokeWidth={ann.strokeWidth} vectorEffect="non-scaling-stroke" fill="none"
                            onPointerDown={e => { e.stopPropagation(); setSelectedAnnotationId(image.id, ann.id);
                              // 拖动前保存撤销快照
                              if (annotationTool === 'move') {
                                if (syncZoomRef.current) {
                                  images.forEach(img => useAnnotationStore.getState().pushUndo(img.id, annotations[img.id] || []));
                                } else {
                                  useAnnotationStore.getState().pushUndo(image.id, annotations[image.id] || []);
                                }
                              }
                              setDragStart({ x: e.clientX, y: e.clientY, annId: ann.id, imgIdx: index }); }}
                          />
                          {annotationTool === 'move' && isSelected && (
                            <g>
                              <rect 
                                x={minX-BBOX_PAD} 
                                y={minY-BBOX_PAD} 
                                width={w+BBOX_PAD*2} 
                                height={h+BBOX_PAD*2} 
                                stroke="#007AFF" 
                                strokeWidth={2} 
                                fill="none" 
                                rx={BBOX_RADIUS} 
                                strokeDasharray="4 4"
                                style={{filter:'drop-shadow(0 0 2px #007AFF88)'}} 
                                pointerEvents="all"
                                onPointerDown={e => { e.stopPropagation(); setDraggingAnn({ imgIdx: index, annId: ann.id, start: [e.clientX, e.clientY], last: [e.clientX, e.clientY] }); }}
                              />
                              <DeleteSvgButton
                                cx={minX + w + BBOX_PAD + DELETE_BTN_RADIUS + DELETE_BTN_MARGIN}
                                cy={minY - BBOX_PAD - DELETE_BTN_RADIUS - DELETE_BTN_MARGIN}
                                onPointerUp={e => {
                                  e.stopPropagation();
                                  if (syncZoomRef.current) {
                                    images.forEach(img => deleteAnnotation(img.id, ann.id));
                                  } else {
                                    deleteAnnotation(image.id, ann.id);
                                  }
                                }}
                              />
                            </g>
                          )}
                        </g>
                      );
                    }
                    if (ann.type === 'pen') {
                      const pts = ann.points;
                      const d = pts.length >= 4 ? `M${pts[0]},${pts[1]} ` + pts.slice(2).map((v,i) => i%2===0?`L${pts[i+2]},${pts[i+3]}`:'').join(' ') : '';
                      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                      for (let i = 0; i < pts.length; i += 2) {
                        minX = Math.min(minX, pts[i]);
                        minY = Math.min(minY, pts[i+1]);
                        maxX = Math.max(maxX, pts[i]);
                        maxY = Math.max(maxY, pts[i+1]);
                      }
                      return (
                        <g key={ann.id}>
                          <path d={d} stroke={ann.color} strokeWidth={ann.strokeWidth} vectorEffect="non-scaling-stroke" fill="none" strokeLinejoin="round" strokeLinecap="round"
                            onPointerDown={e => { e.stopPropagation(); setSelectedAnnotationId(image.id, ann.id);
                              // 拖动前保存撤销快照
                              if (annotationTool === 'move') {
                                if (syncZoomRef.current) {
                                  images.forEach(img => useAnnotationStore.getState().pushUndo(img.id, annotations[img.id] || []));
                                } else {
                                  useAnnotationStore.getState().pushUndo(image.id, annotations[image.id] || []);
                                }
                              }
                              setDragStart({ x: e.clientX, y: e.clientY, annId: ann.id, imgIdx: index }); }}
                          />
                          {annotationTool === 'move' && isSelected && (
                            <g>
                              <rect 
                                x={minX-BBOX_PAD} 
                                y={minY-BBOX_PAD} 
                                width={maxX-minX+BBOX_PAD*2} 
                                height={maxY-minY+BBOX_PAD*2} 
                                stroke="#007AFF" 
                                strokeWidth={2} 
                                fill="none" 
                                rx={BBOX_RADIUS} 
                                strokeDasharray="4 4"
                                style={{filter:'drop-shadow(0 0 2px #007AFF88)'}} 
                                pointerEvents="all"
                                onPointerDown={e => { e.stopPropagation(); setDraggingAnn({ imgIdx: index, annId: ann.id, start: [e.clientX, e.clientY], last: [e.clientX, e.clientY] }); }}
                              />
                              <DeleteSvgButton
                                cx={maxX + BBOX_PAD + DELETE_BTN_RADIUS + DELETE_BTN_MARGIN}
                                cy={minY - BBOX_PAD - DELETE_BTN_RADIUS - DELETE_BTN_MARGIN}
                                onPointerUp={e => {
                                  e.stopPropagation();
                                  if (syncZoomRef.current) {
                                    images.forEach(img => deleteAnnotation(img.id, ann.id));
                                  } else {
                                    deleteAnnotation(image.id, ann.id);
                                  }
                                }}
                              />
                            </g>
                          )}
                        </g>
                      );
                    }
                    if (ann.type === 'text') {
                      const [tx, ty] = ann.points;
                      // 计算文字实际宽度
                      const textWidth = (ann.text?.length || 0) * (ann.fontSize || 18) * 0.96; // 0.96是一个经验系数，用于估算字符宽度
                      const w = Math.max(120, textWidth + 16); // 最小宽度120px，加上一些padding
                      const h = 40;
                      if (editingTextId === ann.id) {
                        return null;
                      }
                      return (
                        <g key={ann.id}>
                          <text
                            x={tx}
                            y={ty}
                            fontSize={ann.fontSize || 18}
                            fill={ann.color}
                            textAnchor="start"
                            alignmentBaseline="middle"
                            style={{ 
                              cursor: annotationTool === 'move' ? 'move' : 'text', 
                              userSelect: 'none', 
                              ...(isSelected ? { filter: 'drop-shadow(0 0 2px #007AFF88)' } : {})
                            }}
                            onDoubleClick={() => setEditingTextId?.(ann.id)}
                            onPointerDown={e => { 
                              e.stopPropagation(); 
                              if (annotationTool === 'move') {
                                setSelectedAnnotationId(image.id, ann.id);
                                setDraggingAnn({ imgIdx: index, annId: ann.id, start: [e.clientX, e.clientY], last: [e.clientX, e.clientY] });
                              }
                            }}
                          >{ann.text}</text>
                          {annotationTool === 'move' && isSelected && (
                            <g>
                              <rect 
                                x={tx-BBOX_PAD} 
                                y={ty-h/2-BBOX_PAD} 
                                width={w+BBOX_PAD*2} 
                                height={h+BBOX_PAD*2} 
                                stroke="#007AFF" 
                                strokeWidth={2} 
                                fill="none" 
                                rx={BBOX_RADIUS} 
                                strokeDasharray="4 4"
                                style={{filter:'drop-shadow(0 0 2px #007AFF88)'}}
                                pointerEvents="all"
                                onPointerDown={e => { 
                                  e.stopPropagation(); 
                                  setDraggingAnn({ imgIdx: index, annId: ann.id, start: [e.clientX, e.clientY], last: [e.clientX, e.clientY] });
                                }}
                              />
                              <DeleteSvgButton
                                cx={tx + w + BBOX_PAD + DELETE_BTN_RADIUS + DELETE_BTN_MARGIN}
                                cy={ty - h/2 - BBOX_PAD - DELETE_BTN_RADIUS - DELETE_BTN_MARGIN}
                                onPointerUp={e => {
                                  e.stopPropagation();
                                  if (syncZoomRef.current) {
                                    images.forEach(img => deleteAnnotation(img.id, ann.id));
                                  } else {
                                    deleteAnnotation(image.id, ann.id);
                                  }
                                }}
                              />
                            </g>
                          )}
                        </g>
                      );
                    }
                    return null;
                  })}
                  {/* 正在绘制 */}
                  {drawing && (
                    (syncZoomRef.current || image.id === drawing.imageId) && (
                      (() => {
                        if (drawing.type === 'rect') {
                          return <rect x={Math.min(drawing.start[0], drawing.points[2])} y={Math.min(drawing.start[1], drawing.points[3])} width={Math.abs(drawing.points[2]-drawing.start[0])} height={Math.abs(drawing.points[3]-drawing.start[1])} stroke={annotationColor} strokeWidth={annotationStrokeWidth} vectorEffect="non-scaling-stroke" fill="none" pointerEvents="none" />;
                        } else if (drawing.type === 'ellipse') {
                          return <ellipse cx={(drawing.start[0]+drawing.points[2])/2} cy={(drawing.start[1]+drawing.points[3])/2} rx={Math.abs(drawing.points[2]-drawing.start[0])/2} ry={Math.abs(drawing.points[3]-drawing.start[1])/2} stroke={annotationColor} strokeWidth={annotationStrokeWidth} vectorEffect="non-scaling-stroke" fill="none" pointerEvents="none" />;
                        } else if (drawing.type === 'pen' && drawing.points.length >= 4) {
                          return <path d={`M${drawing.points[0]},${drawing.points[1]} ` + drawing.points.slice(2).map((v,i) => i%2===0?`L${drawing.points[i+2]},${drawing.points[i+3]}`:'').join(' ')} stroke={annotationColor} strokeWidth={annotationStrokeWidth} vectorEffect="non-scaling-stroke" fill="none" strokeLinejoin="round" strokeLinecap="round" pointerEvents="none" />;
                        }
                        return null;
                      })()
                    )
                  )}
                </svg>
                {!demoMode && (
                  <button
                    onClick={() => {
                      removeImage(image.id);
                    }}
                    className={`absolute top-2 right-2 z-50 p-1.5 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100
                      ${darkMode 
                        ? 'bg-gray-800/90 text-gray-100 hover:bg-gray-700' 
                        : 'bg-white/80 text-gray-700 hover:bg-white'}`}
                    title="删除图片"
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
                        d="M6 18L18 6M6 6l12 12" 
                      />
                    </svg>
                  </button>
                )}
                <ExifPanel imageInfo={image} />
              </div>
            </div>
          ))}
        </div>
      )}
      {textPopover}
    </div>
  );
};

export default ImageViewer; 