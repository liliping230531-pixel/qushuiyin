import React, { useState, useRef, useCallback } from 'react';
import { IconBrush, IconHand, IconUndo, IconReset, IconUpload, IconMagic, IconDownload, IconClose } from './components/Icons';
import CanvasBoard, { CanvasBoardHandle } from './components/CanvasBoard';
import ImageCompare from './components/ImageCompare';
import { ToolMode } from './types';
import { removeWatermark } from './services/geminiService';

const App: React.FC = () => {
  // State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [mode, setMode] = useState<ToolMode>(ToolMode.DRAW);
  // Default brush size set to 40
  const [brushSize, setBrushSize] = useState<number>(40);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasMask, setHasMask] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const canvasRef = useRef<CanvasBoardHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
          setResultImage(null); // Clear previous result
          setShowCompare(false);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleProcess = async () => {
    if (!imageSrc || !canvasRef.current) return;
    
    const maskData = canvasRef.current.getMaskDataURL();
    if (!maskData) return;

    setIsProcessing(true);
    try {
      const result = await removeWatermark(imageSrc, maskData);
      setResultImage(result);
      setShowCompare(true);
    } catch (error) {
      alert("去水印失败，请重试。可能原因：API配额限制或网络问题。");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (resultImage) {
      setImageSrc(resultImage);
      setResultImage(null);
      setShowCompare(false);
      // Reset mask on new image
      canvasRef.current?.resetMask();
    }
  };

  const handleDownload = () => {
    const url = resultImage || imageSrc || '';
    if (!url) return;

    // Detect mime type to set correct extension
    let extension = 'png';
    const match = url.match(/^data:image\/(\w+);base64,/);
    if (match) {
        extension = match[1] === 'jpeg' ? 'jpg' : match[1];
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = `watermark-removed-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetImage = () => {
    setImageSrc(null);
    setResultImage(null);
    setHasMask(false);
    setShowCompare(false);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 relative overflow-hidden font-sans text-slate-800 selection:bg-brand-200">
      
      {/* Decorative Background Mesh */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-200/30 blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-200/30 blur-[120px] animate-pulse-slow" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Header */}
      <header className="h-16 flex items-center px-8 justify-between shrink-0 z-20 glass-panel border-b-0 shadow-sm">
        <div className="flex items-center gap-3">
           <div className="w-9 h-9 bg-gradient-to-tr from-brand-500 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
              <IconMagic className="w-5 h-5"/>
           </div>
           <h1 className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
             一键去水印大师 <span className="text-xs font-medium text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full ml-1 align-middle border border-brand-100">AI V1.0</span>
           </h1>
        </div>
        <div>
           {imageSrc && (
             <button 
                onClick={handleResetImage}
                className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-sm font-medium"
             >
               <IconClose className="w-4 h-4" /> 结束编辑
             </button>
           )}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 relative z-10 overflow-hidden flex flex-col">
        
        {/* State: No Image (Hero Upload) */}
        {!imageSrc ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in-up">
                <div className="text-center mb-12">
                    <h2 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-indigo-500 to-purple-500 mb-6 tracking-tight drop-shadow-sm">
                        让照片回归纯净
                    </h2>
                    <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-light">
                        搭载 Nano Banana 局部重绘模型<br/>
                        <span className="text-slate-400 text-base">简单涂抹 · 智能识别 · 无痕修复</span>
                    </p>
                </div>

                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative w-full max-w-xl aspect-[2/1] rounded-[2rem] border-2 border-dashed border-slate-300/80 hover:border-brand-400 bg-white/40 hover:bg-white/70 backdrop-blur-sm transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-5 shadow-xl hover:shadow-2xl shadow-brand-900/5 hover:shadow-brand-500/10 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 via-white/0 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <div className="w-24 h-24 bg-white rounded-full shadow-lg shadow-slate-200/50 flex items-center justify-center text-brand-500 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 z-10 border border-slate-50">
                        <IconUpload className="w-10 h-10" />
                    </div>
                    <div className="text-center z-10">
                        <p className="text-2xl font-bold text-slate-700 group-hover:text-brand-600 transition-colors">点击上传图片</p>
                        <p className="text-sm text-slate-400 mt-2 font-medium">支持 JPG, PNG 等常见格式</p>
                    </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
            </div>
        ) : (
            // State: Image Loaded (Canvas)
            <>
                {/* Loading Overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in-up">
                     <div className="relative">
                        <div className="w-20 h-20 border-4 border-brand-100 border-t-brand-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <IconMagic className="w-8 h-8 text-brand-500 animate-pulse"/>
                        </div>
                     </div>
                     <h3 className="text-xl font-bold text-slate-800 mt-6">正在施展魔法...</h3>
                     <p className="text-slate-500 mt-2">AI 正在重绘细节，请稍候</p>
                  </div>
                )}

                {/* Comparison View */}
                {showCompare && resultImage && imageSrc && (
                    <ImageCompare 
                        beforeImage={imageSrc}
                        afterImage={resultImage}
                        onClose={() => setShowCompare(false)}
                        onApply={handleApply}
                        onDownload={handleDownload}
                    />
                )}

                {/* Canvas Area */}
                <CanvasBoard 
                    ref={canvasRef}
                    imageSrc={imageSrc}
                    mode={mode}
                    brushSize={brushSize}
                    onMaskChange={setHasMask}
                />
                
                {/* Floating Start Button */}
                {!showCompare && (
                     <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-10 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) transform ${hasMask ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-90 pointer-events-none'}`}>
                        <button 
                            onClick={handleProcess}
                            disabled={isProcessing}
                            className="group flex items-center gap-3 bg-slate-900 hover:bg-black text-white px-10 py-4 rounded-full shadow-2xl shadow-brand-500/20 font-bold text-lg transition-all hover:shadow-brand-500/40 active:scale-95 border border-slate-800"
                        >
                            <IconMagic className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            <span>开始去水印</span>
                        </button>
                     </div>
                )}
            </>
        )}
      </main>

      {/* Footer / Toolbar - Only visible when editing */}
      {imageSrc && (
        <footer className="h-24 glass-panel border-t-0 border-t-white/20 px-8 flex items-center justify-center shrink-0 z-20 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] mb-6 mx-6 rounded-3xl">
             
             <div className="flex items-center gap-8 w-full max-w-4xl justify-between">
                {/* Left: Re-upload (Mini) */}
                <div className="flex-1 flex justify-start">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl hover:bg-slate-100/80 text-slate-500 hover:text-brand-600 transition-all duration-200 group"
                        title="更换图片"
                    >
                        <IconUpload className="w-6 h-6 mb-1 group-hover:-translate-y-0.5 transition-transform"/>
                        <span className="text-[10px] font-bold">更换</span>
                    </button>
                </div>

                {/* Center: Tools */}
                <div className="flex items-center gap-6 bg-slate-100/50 p-2 rounded-2xl border border-white/50 shadow-inner">
                    {/* Mode Switcher */}
                    <div className="flex bg-white rounded-xl p-1 shadow-sm">
                        <button 
                            onClick={() => setMode(ToolMode.DRAW)}
                            className={`px-6 py-2 rounded-lg transition-all flex items-center gap-2 font-medium ${mode === ToolMode.DRAW ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                        >
                            <IconBrush className="w-4 h-4"/>
                            涂抹
                        </button>
                        <button 
                            onClick={() => setMode(ToolMode.PAN)}
                            className={`px-6 py-2 rounded-lg transition-all flex items-center gap-2 font-medium ${mode === ToolMode.PAN ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                        >
                            <IconHand className="w-4 h-4"/>
                            移动
                        </button>
                    </div>

                    <div className="w-px h-8 bg-slate-300 mx-2"></div>

                    {/* Brush Control */}
                    <div className={`flex items-center gap-4 px-2 transition-opacity duration-200 ${mode === ToolMode.DRAW ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Size</span>
                        <div className="relative flex items-center group">
                            <input 
                                type="range" 
                                min="5" 
                                max="100" 
                                value={brushSize} 
                                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                className="w-32 h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-slate-900 hover:accent-brand-600 transition-colors"
                            />
                             {/* Brush Preview Popup */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 hidden group-hover:flex flex-col items-center">
                                <div 
                                    className="rounded-full bg-red-500/80 shadow-lg border-2 border-white backdrop-blur-sm"
                                    style={{ width: brushSize, height: brushSize }}
                                ></div>
                                <div className="text-xs font-bold text-slate-600 bg-white px-2 py-1 rounded-md shadow-sm mt-2">{brushSize}px</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: History */}
                <div className="flex-1 flex justify-end gap-2">
                    <button 
                        onClick={() => canvasRef.current?.undo()}
                        className="p-4 rounded-2xl hover:bg-white text-slate-600 hover:text-slate-900 hover:shadow-lg transition-all border border-transparent hover:border-slate-100"
                        title="撤销"
                    >
                        <IconUndo className="w-5 h-5"/>
                    </button>
                    <button 
                        onClick={() => canvasRef.current?.resetMask()}
                        className="p-4 rounded-2xl hover:bg-white text-slate-600 hover:text-red-500 hover:shadow-lg transition-all border border-transparent hover:border-slate-100"
                        title="清空涂抹"
                    >
                        <IconReset className="w-5 h-5"/>
                    </button>
                </div>
             </div>
      </footer>
      )}
    </div>
  );
};

export default App;