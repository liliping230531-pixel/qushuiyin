import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { ToolMode, Point, Path } from '../types';

interface CanvasBoardProps {
  imageSrc: string | null;
  mode: ToolMode;
  brushSize: number;
  onMaskChange: (hasMask: boolean) => void;
}

export interface CanvasBoardHandle {
  getMaskDataURL: () => string | null;
  resetMask: () => void;
  undo: () => void;
}

const CanvasBoard = forwardRef<CanvasBoardHandle, CanvasBoardProps>(({ imageSrc, mode, brushSize, onMaskChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState<Point>({ x: 0, y: 0 });
  const [paths, setPaths] = useState<Path[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);

  // Load Image
  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        setImgObj(img);
        // Center image
        if (containerRef.current) {
            const { clientWidth, clientHeight } = containerRef.current;
            const scaleX = clientWidth / img.width;
            const scaleY = clientHeight / img.height;
            const fitScale = Math.min(scaleX, scaleY, 1) * 0.9;
            setScale(fitScale);
            setOffset({
                x: (clientWidth - img.width * fitScale) / 2,
                y: (clientHeight - img.height * fitScale) / 2
            });
        }
        // Reset paths when image changes
        setPaths([]);
      };
    } else {
        setImgObj(null);
        setPaths([]);
    }
  }, [imageSrc]);

  useEffect(() => {
    onMaskChange(paths.length > 0);
  }, [paths, onMaskChange]);

  // Main Draw Loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to container
    canvas.width = containerRef.current.clientWidth;
    canvas.height = containerRef.current.clientHeight;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!imgObj) return;

    ctx.save();
    // Apply transformations
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw Image
    ctx.drawImage(imgObj, 0, 0);

    // Draw Paths (Mask)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Config for mask visual
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'; // Red 500 with 50% opacity

    const drawPath = (path: Path) => {
        if (path.points.length < 1) return;
        ctx.beginPath();
        ctx.lineWidth = path.size / scale; // Adjust line width relative to scale so it looks consistent on image
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        ctx.stroke();
    };

    paths.forEach(drawPath);

    // Draw current drawing path
    if (currentPath.length > 0) {
        drawPath({ points: currentPath, size: brushSize });
    }

    ctx.restore();

  }, [imgObj, offset, scale, paths, currentPath, brushSize]);

  useEffect(() => {
    requestAnimationFrame(draw);
  }, [draw]);

  // Handle Mouse/Touch Events
  const getPointerPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const getCanvasCoords = (screenPos: Point): Point => {
      // Inverse of translate + scale
      return {
          x: (screenPos.x - offset.x) / scale,
          y: (screenPos.y - offset.y) / scale
      };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imgObj) return;
    e.preventDefault(); // Prevent scrolling on touch
    setIsDragging(true);
    const pos = getPointerPos(e);
    setLastPos(pos);

    if (mode === ToolMode.DRAW) {
        const canvasPos = getCanvasCoords(pos);
        setCurrentPath([canvasPos]);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging || !imgObj) return;
      e.preventDefault();
      const pos = getPointerPos(e);

      if (mode === ToolMode.PAN) {
          const dx = pos.x - lastPos.x;
          const dy = pos.y - lastPos.y;
          setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
          setLastPos(pos);
      } else if (mode === ToolMode.DRAW) {
          const canvasPos = getCanvasCoords(pos);
          setCurrentPath(prev => [...prev, canvasPos]);
          setLastPos(pos);
      }
  };

  const handlePointerUp = () => {
      if (isDragging && mode === ToolMode.DRAW && currentPath.length > 0) {
          setPaths(prev => [...prev, { points: currentPath, size: brushSize }]);
      }
      setIsDragging(false);
      setCurrentPath([]);
  };

  // Zoom Handler
  const handleWheel = (e: React.WheelEvent) => {
      if (!imgObj) return;
      // Zoom centered on cursor could be implemented, but simple center zoom is easier/safer for now
      // Or cursor centered:
      const rect = canvasRef.current!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.min(Math.max(0.1, scale + delta), 10);
      
      // Calculate offset adjustment to keep mouse point stable
      const scaleRatio = newScale / scale;
      const newOffsetX = mouseX - (mouseX - offset.x) * scaleRatio;
      const newOffsetY = mouseY - (mouseY - offset.y) * scaleRatio;

      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getMaskDataURL: () => {
        if (!imgObj) return null;
        // Create an offscreen canvas to generate the binary mask
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = imgObj.width;
        maskCanvas.height = imgObj.height;
        const ctx = maskCanvas.getContext('2d');
        if (!ctx) return null;

        // Fill black
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

        // Draw paths in white
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'white';
        
        paths.forEach(path => {
            if (path.points.length < 1) return;
            ctx.beginPath();
            ctx.lineWidth = path.size; // This is already in image coords because we stored image coords
            ctx.moveTo(path.points[0].x, path.points[0].y);
            for(let i=1; i<path.points.length; i++){
                ctx.lineTo(path.points[i].x, path.points[i].y);
            }
            ctx.stroke();
        });

        return maskCanvas.toDataURL('image/png');
    },
    resetMask: () => {
        setPaths([]);
    },
    undo: () => {
        setPaths(prev => prev.slice(0, -1));
    }
  }));

  return (
    <div 
        ref={containerRef} 
        className="w-full h-full relative overflow-hidden bg-transparent cursor-crosshair select-none"
        style={{ cursor: mode === ToolMode.PAN ? (isDragging ? 'grabbing' : 'grab') : 'crosshair' }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onWheel={handleWheel}
        className="block touch-none"
      />
    </div>
  );
});

export default CanvasBoard;