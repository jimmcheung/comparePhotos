import React, { useCallback, useState, useEffect } from 'react';
import { useImageStore } from '../stores/imageStore';
import { useSettingsStore } from '../stores/settingsStore';
import { processImageFile } from '../utils/imageProcessing';
import FormatConversionModal, { FileToConvert } from './FormatConversionModal';
import { convertHeif, needsConversion } from '../utils/formatConverter';
import { formatShutterSpeed } from '../utils/exifUtils';

const NORMAL_IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|bmp)$/i;
const SPECIAL_IMAGE_EXT = /\.(heic|heif)$/i;

const ImageUploader: React.FC = () => {
  const { themeMode, demoMode } = useSettingsStore();
  const { addImages, clearImages, removeImage, images, addImage } = useImageStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const isDarkTheme = themeMode === 'dark';
  const isSpecialTheme = themeMode === 'green' || themeMode === 'blue';

  // 格式转换状态
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [filesToConvert, setFilesToConvert] = useState<FileToConvert[]>([]);
  const [filesToProcess, setFilesToProcess] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [shouldClearImages, setShouldClearImages] = useState(true);
  
  // 新增两个状态保存用户选择的格式和质量
  const [outputFormat, setOutputFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [quality, setQuality] = useState(0.85);
  
  // 添加清理缓存的效果
  useEffect(() => {
    // 组件卸载时清理RAW处理相关缓存（已废弃，无需处理）
  }, []);
  
  // 处理普通图片文件（无需转换）
  const processNormalFiles = useCallback(async (files: File[], shouldClear: boolean = true) => {
    if (!files.length) return;

    if (shouldClear && images.length > 0) {
      clearImages();
    }

    setIsProcessing(true);
    try {
      const processedImages = await Promise.all(
        files.map(processImageFile)
      );
      addImages(processedImages);
    } catch (error) {
      console.error('图片处理失败:', error);
      alert('部分图片处理失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  }, [addImages, clearImages, images.length]);

  // 处理包括特殊格式在内的所有文件
  const handleFiles = useCallback(async (files: FileList, shouldClear: boolean = true) => {
    if (!files.length) return;
    const filesToConvert: FileToConvert[] = [];
    const normalFiles: File[] = [];
    for (const file of Array.from(files)) {
      const lowerName = file.name.toLowerCase();
      if (NORMAL_IMAGE_EXT.test(lowerName)) {
        normalFiles.push(file);
      } else if (SPECIAL_IMAGE_EXT.test(lowerName)) {
        // 检查是否需要转换
        try {
          const { needsConversion: requiresConversion, type } = await needsConversion(file);
      if (requiresConversion && type) {
            filesToConvert.push({ file, type, status: 'pending' });
          } else {
            normalFiles.push(file);
          }
        } catch (error) {
          console.warn(`检查文件格式失败: ${file.name}`, error);
          // 不再push type: 'raw'，只log
        }
      } else {
        // 其它未知格式，忽略或可提示不支持
      }
    }
    if (filesToConvert.length > 0) {
      setFilesToConvert(filesToConvert);
      setFilesToProcess(normalFiles);
      setShouldClearImages(shouldClear);
      setOutputFormat('image/jpeg');
      setQuality(0.85);
      setShowConversionModal(true);
    } else if (normalFiles.length > 0) {
      processNormalFiles(normalFiles, shouldClear);
    }
  }, [processNormalFiles]);
  
  // 执行文件格式转换
  const performConversion = useCallback(async () => {
    if (filesToConvert.length === 0) return;
    
    setIsConverting(true);
    const convertedFiles: File[] = [];
    
    // 更新文件状态的辅助函数
    const updateFileStatus = (index: number, updates: Partial<FileToConvert>) => {
      setFilesToConvert(prev => 
        prev.map((file, i) => i === index ? { ...file, ...updates } : file)
      );
    };
    
    // 逐个处理文件
    for (let i = 0; i < filesToConvert.length; i++) {
      const fileToConvert = filesToConvert[i];
      
      try {
        // 更新状态为转换中
        updateFileStatus(i, { status: 'converting', progress: 0 });
        
        if (fileToConvert.type === 'heif') {
          // 转换HEIF/HEIC格式
          const blob = await convertHeif(fileToConvert.file, outputFormat, quality, (progress: number) => {
            updateFileStatus(i, { progress });
          });
          
          if (blob) {
            const ext = outputFormat === 'image/png' ? '.png' : '.jpg';
            const convertedFile = new File(
              [blob],
              fileToConvert.file.name.replace(/\.(heic|heif)$/i, ext),
              { type: outputFormat }
            );
            convertedFiles.push(convertedFile);
            updateFileStatus(i, { status: 'success' });
          } else {
            updateFileStatus(i, { status: 'error', error: '转换失败' });
          }
        }
      } catch (error) {
        console.error(`转换文件失败:`, error);
        updateFileStatus(i, { 
          status: 'error', 
          error: error instanceof Error ? error.message : '未知错误' 
        });
      }
    }
    
    // 所有文件处理完毕后，处理转换成功的文件和普通文件
    const allFiles = [...convertedFiles, ...filesToProcess];
    if (allFiles.length > 0) {
      await processNormalFiles(allFiles, shouldClearImages);
    }
    
    // 保持转换模态框打开，直到用户点击关闭
  }, [filesToConvert, filesToProcess, shouldClearImages, processNormalFiles, outputFormat, quality]);
  
  // 取消转换
  const cancelConversion = useCallback(() => {
    // 如果有普通文件，仍然处理它们
    if (filesToProcess.length > 0) {
      processNormalFiles(filesToProcess, shouldClearImages);
    }
    
    // 关闭转换弹窗
    setShowConversionModal(false);
    setFilesToConvert([]);
    setFilesToProcess([]);
  }, [filesToProcess, shouldClearImages, processNormalFiles]);
  
  // 关闭转换弹窗
  const closeConversionModal = useCallback(() => {
    setShowConversionModal(false);
    setFilesToConvert([]);
    setFilesToProcess([]);
    setIsConverting(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.heic,.heif';
    input.multiple = true;
    input.onchange = (e) => {
      if (e.target instanceof HTMLInputElement && e.target.files) {
        handleFiles(e.target.files);
      }
    };
    input.click();
  }, [handleFiles]);

  const renderImageList = () => (
    <div className="w-full">
      {!demoMode && (
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*,.heic,.heif';
              input.multiple = true;
              input.onchange = (e) => {
                if (e.target instanceof HTMLInputElement && e.target.files) {
                  handleFiles(e.target.files, true);
                }
              };
              input.click();
            }}
            className={`px-7 py-3 rounded-full backdrop-blur-md transition-all duration-200 ${
              isDarkTheme 
                ? 'bg-[#2458d0] hover:bg-[#1c46af] text-white' 
                : 'bg-[#2458d0] hover:bg-[#1c46af] text-white'
            } font-medium text-sm scale-105`}
          >
            重新上传
          </button>
          <button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*,.heic,.heif';
              input.multiple = true;
              input.onchange = (e) => {
                if (e.target instanceof HTMLInputElement && e.target.files) {
                  handleFiles(e.target.files, false);
                }
              };
              input.click();
            }}
            className={`p-2 rounded-lg font-medium transition-all duration-200
              ${isDarkTheme ? 'bg-sky-500/20 text-gray-100 hover:bg-sky-500/30' : 'bg-sky-500/10 text-gray-700 hover:bg-sky-500/20'}`}
            title="添加图片"
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
          <button
            onClick={clearImages}
            className={`p-2 rounded-lg font-medium transition-all duration-200
              ${isDarkTheme ? 'bg-sky-500/20 text-gray-100 hover:bg-sky-500/30' : 'bg-sky-500/10 text-gray-700 hover:bg-sky-500/20'}`}
            title="清空图片"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      )}
      
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${demoMode ? 'p-0' : ''}`}>
        {images.map((image) => (
          <div 
            key={image.id} 
            className="relative group aspect-[3/2] rounded-lg overflow-hidden"
            style={{
              backgroundColor: isDarkTheme ? '#1a1a1a' : '#f3f4f6' // #f3f4f6 is gray-100
            }}
          >
            <img
              src={image.url}
              alt={image.name}
              className="w-full h-full object-contain"
            />
            {!demoMode && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <button
                  onClick={() => removeImage(image.id)}
                  className={`absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200
                    ${isDarkTheme ? 'bg-gray-900/80 text-gray-100 hover:bg-gray-900' : 'bg-white/80 text-gray-700 hover:bg-white'}`}
                >
                  <svg
                    className="w-4 h-4"
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
                {image.exif && (
                <div className="absolute bottom-0 left-0 right-0 p-3 text-sm text-white bg-gradient-to-t from-black/70 to-transparent">
                  <div className="space-y-1">
                    {image.exif.Make !== 'Unknown' && image.exif.Model !== 'Unknown' && (
                      <p>{image.exif.Make} {image.exif.Model}</p>
                    )}
                    {image.exif.LensModel !== 'Unknown' && (
                      <p>{image.exif.LensModel}</p>
                    )}
                    {image.exif.FocalLength > 0 && (
                      <p>{image.exif.FocalLength}mm</p>
                    )}
                    {image.exif.FNumber > 0 && (
                      <p>f/{image.exif.FNumber}</p>
                    )}
                    {image.exif.ISO > 0 && (
                      <p>{image.exif.ISO}</p>
                    )}
                    {image.exif.ExposureTime !== '0' && (
                      <p>{formatShutterSpeed(image.exif.ExposureTime)}</p>
                    )}
                  </div>
                </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // 处理初始上传区域的渲染
  if (images.length === 0) {
    return (
      <>
        <div className={`flex flex-col items-center justify-center min-h-screen ${demoMode ? 'demo-mode' : 'pt-12'}`}
             style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
          <div className={`w-full max-w-4xl ${demoMode ? 'p-0 demo-content' : 'p-4 -mt-48'}`}>
            {demoMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map((image) => (
                  <div key={image.id} className={`relative aspect-[3/2] rounded-lg overflow-hidden`}
                       style={{ background: 'var(--bg-secondary)' }}>
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-sm text-white bg-gradient-to-t from-black/70 to-transparent">
                      <div className="space-y-1">
                        {image.exif.Make !== 'Unknown' && image.exif.Model !== 'Unknown' && (
                          <p>{image.exif.Make} {image.exif.Model}</p>
                        )}
                        {image.exif.LensModel !== 'Unknown' && (
                          <p>{image.exif.LensModel}</p>
                        )}
                        {image.exif.FocalLength > 0 && (
                          <p>{image.exif.FocalLength}mm</p>
                        )}
                        {image.exif.FNumber > 0 && (
                          <p>f/{image.exif.FNumber}</p>
                        )}
                        {image.exif.ISO > 0 && (
                          <p>{image.exif.ISO}</p>
                        )}
                        {image.exif.ExposureTime !== '0' && (
                          <p>{formatShutterSpeed(image.exif.ExposureTime)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {isProcessing ? (
                  <div className="text-center">
                    <p style={{ color: 'var(--text-secondary)' }}>处理中...</p>
                  </div>
                ) : images.length === 0 ? (
                  <div className="flex flex-col items-center justify-center">
                    <div
                      className="flex flex-col items-center justify-center w-[480px] h-[320px] border-4 border-dashed rounded-2xl p-8 cursor-pointer
                        transition-all duration-200"
                      style={{
                        borderColor: themeMode === 'light' 
                          ? '#cdcdcd' 
                          : themeMode === 'dark'
                            ? 'rgb(140 140 140 / 50%)'
                            : 'var(--border-color)',
                        background: themeMode === 'light' 
                          ? '#f9fafb' 
                          : (themeMode === 'green' || themeMode === 'blue' 
                            ? 'var(--control-bg)' 
                            : 'var(--bg-secondary)'),
                        color: 'var(--text-primary)',
                      }}
                      onClick={handleClick}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                    >
                      <svg
                        className="mx-auto h-12 w-12"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                        />
                      </svg>
                      <h3 className="mt-4 text-base font-medium" style={{ color: 'var(--text-primary)' }}>点击或拖放图片到此处</h3>
                      <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>支持导入图片进行对比</p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>支持格式：JPG、PNG、GIF、WebP、HEIC等</p>
                    </div>
                    <div className="mt-4 flex items-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>隐私声明：所有图片仅在您的浏览器中本地处理，不会上传到任何服务器</span>
                    </div>
                  </div>
                ) : (
                  renderImageList()
                )}
              </>
            )}
          </div>
        </div>

        {/* 格式转换确认弹窗 */}
        {showConversionModal && (
          <FormatConversionModal
            isOpen={showConversionModal}
            files={filesToConvert}
            onClose={closeConversionModal}
            onConfirm={performConversion}
            onCancel={cancelConversion}
            isConverting={isConverting}
            outputFormat={outputFormat}
            setOutputFormat={setOutputFormat}
            quality={quality}
            setQuality={setQuality}
          />
        )}
      </>
    );
  }

  // 已有图片的情况下渲染
  return (
    <div>
      {renderImageList()}
      
      <FormatConversionModal
        isOpen={showConversionModal}
        onClose={closeConversionModal}
        onConfirm={performConversion}
        onCancel={cancelConversion}
        files={filesToConvert}
        isConverting={isConverting}
        outputFormat={outputFormat}
        setOutputFormat={setOutputFormat}
        quality={quality}
        setQuality={setQuality}
      />
    </div>
  );
};

export default ImageUploader;