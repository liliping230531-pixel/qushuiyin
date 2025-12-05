import React, { useState, useRef, useEffect } from 'react';

interface ImageCompareProps {
  beforeImage: string;
  afterImage: string;
  onClose: () => void;
  onApply: () => void;
  onDownload: () => void;
}

const ImageCompare: React.FC<ImageCompareProps> = ({ beforeImage, afterImage, onClose, onApply, onDownload }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => setIsResizing(true);
  const handleMouseUp = () => setIsResizing(false);
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="absolute inset-0 z-20 bg-slate-100 flex flex-col">
       {/* Toolbar for Compare Mode */}
       <div className="bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm z-30">
            <h3 className="font-semibold text-slate-700">对比预览</h3>
            <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                    取消
                </button>
                 <button onClick={onDownload} className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-900">
                    下载结果
                </button>
                <button onClick={onApply} className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium">
                    应用并继续
                </button>
            </div>
       </div>

       {/* Compare Area */}
       <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
            <div 
                ref={containerRef}
                className="relative max-w-full max-h-full select-none shadow-2xl"
                style={{ width: 'fit-content' }} // This might need refinement depending on aspect ratio, but for now fit content
            >
                {/* After Image (Background) */}
                <img 
                    src={afterImage} 
                    alt="After" 
                    className="block max-w-full max-h-[80vh] object-contain pointer-events-none"
                />

                {/* Before Image (Foreground - Clipped) */}
                <div 
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${sliderPosition}%` }}
                >
                    <img 
                        src={beforeImage} 
                        alt="Before" 
                        className="block w-full h-full object-cover pointer-events-none"
                        // Note: object-cover works here because parent has exact same aspect ratio
                        style={{ width: containerRef.current?.clientWidth, height: containerRef.current?.clientHeight }}
                    />
                     {/* Label */}
                    <div className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                        原图
                    </div>
                </div>

                {/* Slider Handle */}
                <div 
                    className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                    style={{ left: `${sliderPosition}%` }}
                    onMouseDown={handleMouseDown}
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-400">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 18l-6-6 6-6"/>
                            <path d="M9 18l6-6-6-6" transform="rotate(180 12 12) translate(6,0)"/> 
                        </svg>
                    </div>
                </div>

                {/* Label After */}
                <div className="absolute top-4 right-4 bg-brand-600/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                    去水印后
                </div>
            </div>
       </div>
    </div>
  );
};

export default ImageCompare;