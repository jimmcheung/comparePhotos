import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { ImageInfo } from '../stores/imageStore';
import { formatShutterSpeed } from '../utils/exifUtils';

interface Props {
  imageInfo: ImageInfo;
}

const ExifPanel: React.FC<Props> = ({ imageInfo }) => {
  const { darkMode, exifSettings } = useSettingsStore();
  const [resolution, setResolution] = useState<string>('');

  // 获取图片分辨率
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setResolution(`${img.naturalWidth} × ${img.naturalHeight}`);
    };
    img.src = imageInfo.url;
  }, [imageInfo.url]);

  // 过滤出需要显示的 EXIF 信息，排除无效值
  const visibleExif = Object.entries({
    ...imageInfo.exif,
    Resolution: resolution,
  }).filter(
    ([key, value]) => 
      // 首先检查该项是否在设置中启用
      exifSettings[key as keyof typeof exifSettings] && 
      // 过滤无效内容
      value !== undefined &&
      value !== null &&
      value !== '' &&
      value !== 'Unknown' &&
      value !== 'NaN' &&
      value !== 'Invalid Date' &&
      !(typeof value === 'number' && (isNaN(value) || value === 0)) &&
      !(typeof value === 'string' && (value === '0' || value.trim() === '0' || value.trim() === '0s'))
  );

  if (visibleExif.length === 0) return null;

  const formatExifValue = (key: string, value: any): string => {
    switch (key) {
      case 'FocalLength':
        return `${value}mm`;
      case 'FNumber':
        return `f/${value}`;
      case 'ExposureTime':
        return formatShutterSpeed(value);
      case 'DateTimeOriginal':
        return new Date(value).toLocaleString();
      case 'ISO':
        return value.toString();
      case 'Resolution':
      case 'FileName':
      case 'Make':
      case 'Model':
      case 'LensModel':
        return String(value);
      default:
        return String(value);
    }
  };

  const getExifLabel = (key: string) => {
    const labels: Record<string, string> = {
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
    return labels[key] || key;
  };

  // 组合相机品牌和型号
  const combinedExif = visibleExif.reduce((acc, [key, value]) => {
    if (key === 'Make' || key === 'Model') {
      if (!acc.camera) acc.camera = [];
      acc.camera.push(String(value));
      return acc;
    }
    return { ...acc, [key]: value };
  }, {} as { [key: string]: any, camera?: string[] });

  // 将 EXIF 数据分为主要和次要两类
  const primaryExif = {} as { [key: string]: any };
  const secondaryExif = {} as { [key: string]: any };

  Object.entries(combinedExif).forEach(([key, value]) => {
    if (key === 'camera' || key === 'FocalLength' || key === 'FNumber' || key === 'ExposureTime' || key === 'ISO') {
      primaryExif[key] = value;
    } else {
      secondaryExif[key] = value;
    }
  });

  return (
    <div className="absolute bottom-9 left-0 right-0 flex flex-col items-center space-y-2 pointer-events-none z-10">
      {/* 主要信息悬浮栏 */}
      {Object.keys(primaryExif).length > 0 && (
      <div className={`max-w-[95%] md:max-w-[85%] overflow-x-auto rounded-full px-5 py-2 backdrop-blur-md text-sm
          ${darkMode 
            ? 'bg-black/60 text-gray-100 shadow-lg shadow-black/30' 
            : 'bg-white/70 text-gray-700 shadow-lg shadow-black/10'} 
          transition-all duration-300 scrollbar-hide pointer-events-auto select-none`}>
        <div className="flex items-center space-x-2 flex-nowrap">
          {Object.entries(primaryExif).map(([key, value]) => {
            // 主要项目直接显示值，不显示标签
            if (key === 'camera' && Array.isArray(value)) {
              return (
                <div key="camera" className="font-medium whitespace-nowrap">{value.join(' ')}</div>
              );
            }
            // 所有参数项目，直接显示值，不显示标签
            return (
              <div key={key} className="font-medium whitespace-nowrap flex items-center">
                {key !== 'camera' && (
                  <span className="mx-2 h-1 w-1 rounded-full bg-current opacity-40 flex-shrink-0"></span>
                )}
                {String(formatExifValue(key, value))}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* 次要信息展示区 */}
      {Object.keys(secondaryExif).length > 0 && (
        <div className={`max-w-[80%] md:max-w-[60%] px-4 py-1.5 text-xs select-none
            ${darkMode 
              ? 'text-gray-300/80' 
              : 'text-gray-600/80'} 
            transition-all duration-300 pointer-events-auto`}>
          <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-1">
            {Object.entries(secondaryExif).map(([key, value]) => (
              <div key={key} className="flex items-center whitespace-nowrap">
                {formatExifValue(key, value)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExifPanel; 