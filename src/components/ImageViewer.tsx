import { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, RefreshCw } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: () => void;
}

export default function ImageViewer({ src, alt, isOpen, onClose, onDownload }: ImageViewerProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Reset quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);
  
  // Garantir que o arrastar seja liberado mesmo se o mouse sair da tela
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);
  
  // Configura um event listener não-passivo para o evento wheel
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      const newZoom = Math.max(0.5, Math.min(5, zoomLevel + delta));
      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / rect.width;
        const mouseY = (e.clientY - rect.top) / rect.height;
        if (newZoom > 1) {
          const newPositionX = position.x - (mouseX - 0.5) * (newZoom - zoomLevel) * rect.width;
          const newPositionY = position.y - (mouseY - 0.5) * (newZoom - zoomLevel) * rect.height;
          setPosition({ x: newPositionX, y: newPositionY });
        } else if (zoomLevel > 1 && newZoom <= 1) {
          setPosition({ x: 0, y: 0 });
        }
      }
      setZoomLevel(newZoom);
    };
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [zoomLevel, position]);
  
  // Processa o src da imagem para exibir corretamente (base64 ou URL)
  const getImageUrl = () => {
    if (!src) return '';
    if (src.startsWith('http') || src.startsWith('data:')) {
      return src;
    }
    return `data:image/jpeg;base64,${src}`;
  };
  
  // Função para realizar o download da imagem diretamente
  const handleDirectDownload = () => {
    if (!src) return;
    
    try {
      const imageUrl = getImageUrl();
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `imagem_${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Falha ao baixar imagem:', error);
    }
  };
  
  const handleDownloadClick = () => {
    if (onDownload) {
      onDownload();
    } else {
      handleDirectDownload();
    }
  };
  
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 5));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
  };
  
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };
  
  const handleResetView = () => {
    setZoomLevel(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/90" onClick={onClose} />
  
      {/* Conteúdo do visualizador */}
      <div className="relative z-10 flex flex-col w-full h-full">
        {/* Cabeçalho com controles */}
        <div className="w-full flex flex-wrap items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-black/80">
          <div className="text-white text-base sm:text-xl font-medium truncate max-w-[50%] sm:max-w-[60%]">
            {alt}
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 bg-black/40 px-3 py-2 rounded-full">
              <button onClick={handleZoomOut} className="text-white hover:bg-black/40 p-2 rounded transition-colors">
                <ZoomOut className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <span className="text-white text-sm sm:text-base font-medium">{(zoomLevel * 100).toFixed(0)}%</span>
              <button onClick={handleZoomIn} className="text-white hover:bg-black/40 p-2 rounded transition-colors">
                <ZoomIn className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
            <button onClick={handleRotate} className="text-white hover:bg-black/40 p-2 rounded-full transition-colors">
              <RotateCw className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button onClick={handleResetView} className="text-white hover:bg-black/40 p-2 rounded-full transition-colors">
              <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button
              onClick={handleDownloadClick}
              className="text-white hover:bg-black/40 p-2 rounded-full transition-colors"
            >
              <Download className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button onClick={onClose} className="text-white hover:bg-black/40 p-2 rounded-full transition-colors">
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>
  
        {/* Container da imagem */}
        <div 
          ref={containerRef}
          className="flex-1 w-full flex items-center justify-center overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : (zoomLevel > 1 ? 'grab' : 'default') }}
        >
          <div 
            className="p-4 bg-black/20 rounded-lg"
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px)`, 
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              maxWidth: '90%',
              maxHeight: '80vh' 
            }}
          >
            <img
              ref={imageRef}
              src={getImageUrl()}
              alt={alt}
              className="max-h-[calc(80vh-120px)] max-w-full object-contain select-none shadow-xl"
              style={{ 
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`, 
                transformOrigin: 'center', 
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
              }}
              draggable="false"
              onDragStart={e => e.preventDefault()}
            />
          </div>
        </div>
  
        {/* Instruções na parte inferior */}
        <div className="py-3 sm:py-4 px-3 sm:px-6 text-white text-xs sm:text-sm bg-black/80 w-full text-center">
          <span className="hidden sm:inline">Use a roda do mouse para zoom • {zoomLevel > 1 ? 'Arraste para mover • ' : ''}Clique fora da imagem para fechar</span>
          <span className="sm:hidden">Pinch para zoom • {zoomLevel > 1 ? 'Arraste para mover • ' : ''}Toque fora da imagem para fechar</span>
        </div>
      </div>
    </div>
  );
}
