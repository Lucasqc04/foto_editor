import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Loader2, CheckCircle, Edit3, RotateCw, Eye } from 'lucide-react';
import { fabric } from 'fabric';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';
import ImageViewer from './ImageViewer';

interface AdvancedImageEditorProps {
  onConversionComplete: () => void;
}

type EditorTool = 'select' | 'crop' | 'text' | 'brush' | 'eraser' | 'shapes' | 'stickers' | 'filters';

const AdvancedImageEditor: React.FC<AdvancedImageEditorProps> = ({ onConversionComplete }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [showPreview, setShowPreview] = useState(true);
  
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  
  // Tool states
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(24);
  const [selectedShape, setSelectedShape] = useState<'rectangle' | 'circle' | 'triangle'>('rectangle');
  
  // Filter states
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [sepia, setSepia] = useState(0);
  const [hue, setHue] = useState(0);

  // History for undo/redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Image viewer states
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageSrc, setViewerImageSrc] = useState('');
  const [viewerImageAlt, setViewerImageAlt] = useState('');

  const tools = [
    { id: 'select', label: 'Selecionar', icon: Move },
    { id: 'crop', label: 'Cortar', icon: Crop },
    { id: 'text', label: 'Texto', icon: Type },
    { id: 'brush', label: 'Pincel', icon: Brush },
    { id: 'eraser', label: 'Borracha', icon: Eraser },
    { id: 'shapes', label: 'Formas', icon: Square },
    { id: 'stickers', label: 'Adesivos', icon: Sticker },
    { id: 'filters', label: 'Filtros', icon: Palette },
  ];

  const stickers = ['😀', '😍', '🔥', '💯', '👍', '❤️', '⭐', '🎉', '💪', '🚀'];

  useEffect(() => {
    if (uploadedFile && canvasRef.current) {
      initializeFabricCanvas();
    }
    
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, [uploadedFile]);

  const initializeFabricCanvas = () => {
    if (!canvasRef.current || !uploadedFile) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
    });

    fabricCanvasRef.current = canvas;

    // Load image
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgUrl = e.target?.result as string;
      fabric.Image.fromURL(imgUrl, (img) => {
        // Scale image to fit canvas
        const scale = Math.min(
          canvas.width! / img.width!,
          canvas.height! / img.height!
        );
        
        img.scale(scale);
        img.set({
          left: (canvas.width! - img.width! * scale) / 2,
          top: (canvas.height! - img.height! * scale) / 2,
          selectable: false,
        });
        
        canvas.add(img);
        canvas.sendToBack(img);
        canvas.renderAll();
        
        saveToHistory();
      });
    };
    reader.readAsDataURL(uploadedFile);

    // Setup canvas events
    canvas.on('path:created', saveToHistory);
    canvas.on('object:added', saveToHistory);
    canvas.on('object:removed', saveToHistory);
    canvas.on('object:modified', saveToHistory);
  };

  const saveToHistory = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    
    const state = JSON.stringify(fabricCanvasRef.current.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      return newHistory.slice(-20); // Keep last 20 states
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0 && fabricCanvasRef.current) {
      const prevState = history[historyIndex - 1];
      fabricCanvasRef.current.loadFromJSON(prevState, () => {
        fabricCanvasRef.current!.renderAll();
      });
      setHistoryIndex(prev => prev - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1 && fabricCanvasRef.current) {
      const nextState = history[historyIndex + 1];
      fabricCanvasRef.current.loadFromJSON(nextState, () => {
        fabricCanvasRef.current!.renderAll();
      });
      setHistoryIndex(prev => prev + 1);
    }
  };

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setUploadedFile(files[0]);
      setProcessedImage(null);
    }
  };

  const handleToolChange = (tool: EditorTool) => {
    setActiveTool(tool);
    
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Reset canvas modes
    canvas.isDrawingMode = false;
    canvas.selection = true;
    
    switch (tool) {
      case 'brush':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.width = brushSize;
        canvas.freeDrawingBrush.color = brushColor;
        break;
      case 'eraser':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.width = brushSize * 2;
        canvas.freeDrawingBrush.color = '#ffffff';
        break;
      case 'select':
        canvas.selection = true;
        break;
    }
  };

  const addText = () => {
    if (!fabricCanvasRef.current) return;
    
    const text = new fabric.IText('Clique para editar', {
      left: 100,
      top: 100,
      fill: textColor,
      fontSize: textSize,
      fontFamily: 'Arial',
    });
    
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
  };

  const addShape = (shapeType: 'rectangle' | 'circle' | 'triangle') => {
    if (!fabricCanvasRef.current) return;
    
    let shape: fabric.Object;
    
    switch (shapeType) {
      case 'rectangle':
        shape = new fabric.Rect({
          left: 100,
          top: 100,
          width: 100,
          height: 60,
          fill: brushColor,
          stroke: '#000000',
          strokeWidth: 2,
        });
        break;
      case 'circle':
        shape = new fabric.Circle({
          left: 100,
          top: 100,
          radius: 50,
          fill: brushColor,
          stroke: '#000000',
          strokeWidth: 2,
        });
        break;
      case 'triangle':
        shape = new fabric.Triangle({
          left: 100,
          top: 100,
          width: 100,
          height: 100,
          fill: brushColor,
          stroke: '#000000',
          strokeWidth: 2,
        });
        break;
    }
    
    fabricCanvasRef.current.add(shape);
    fabricCanvasRef.current.setActiveObject(shape);
  };

  const addSticker = (emoji: string) => {
    if (!fabricCanvasRef.current) return;
    
    const text = new fabric.Text(emoji, {
      left: Math.random() * 400 + 100,
      top: Math.random() * 300 + 100,
      fontSize: 48,
    });
    
    fabricCanvasRef.current.add(text);
  };

  const applyFilters = () => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    const filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) sepia(${sepia}%) hue-rotate(${hue}deg)`;
    
    canvas.getElement().style.filter = filter;
  };

  const exportImage = async () => {
    if (!fabricCanvasRef.current) return;
    
    setIsProcessing(true);
    
    try {
      const dataUrl = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2, // Higher resolution
      });
      
      setProcessedImage(dataUrl);
      onConversionComplete();
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar imagem. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedImage) return;

    const link = document.createElement('a');
    link.href = processedImage;
    link.download = 'imagem-editada.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return;
    
    const objects = fabricCanvasRef.current.getObjects();
    const backgroundImage = objects[0]; // Assuming first object is the background image
    
    fabricCanvasRef.current.clear();
    if (backgroundImage) {
      fabricCanvasRef.current.add(backgroundImage);
      fabricCanvasRef.current.sendToBack(backgroundImage);
    }
    fabricCanvasRef.current.renderAll();
    saveToHistory();
  };

  const handleReset = () => {
    setUploadedFile(null);
    setProcessedImage(null);
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
      fabricCanvasRef.current = null;
    }
  };

  const openImageViewer = (src: string, alt: string) => {
    setViewerImageSrc(src);
    setViewerImageAlt(alt);
    setShowImageViewer(true);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="text-center">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Editor Avançado de Imagens</h2>
        <p className="text-sm md:text-base text-gray-600">
          Editor completo com ferramentas profissionais de edição
        </p>
      </div>

      <FileUpload
        onFileSelect={handleFileSelect}
        accept="image/*"
        maxSize={50 * 1024 * 1024} // 50MB for images
        uploadedFiles={uploadedFile ? [uploadedFile] : []}
        onRemoveFile={handleReset}
      />

      {uploadedFile && (
        <div className="space-y-4 md:space-y-6">
          {/* Mobile-friendly toolbar */}
          <div className="bg-gray-50 rounded-xl p-3 md:p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-700 text-sm md:text-base">Ferramentas</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="p-2 text-gray-600 hover:text-blue-600 md:hidden"
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-50"
                >
                  <Undo className="h-4 w-4" />
                </button>
                <button
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-50"
                >
                  <Redo className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => handleToolChange(tool.id as EditorTool)}
                    className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-lg font-medium transition-all text-xs ${
                      activeTool === tool.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="hidden md:block">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Canvas */}
          <div className={`bg-gray-100 rounded-xl p-2 md:p-4 ${!showPreview && 'hidden md:block'}`}>
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                className="border border-gray-300 rounded-lg shadow-md max-w-full h-auto"
                style={{ maxHeight: '70vh' }}
              />
            </div>
          </div>

          {/* Tool-specific controls */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            {activeTool === 'text' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Configurações de Texto</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-full h-10 rounded border border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tamanho: {textSize}px
                    </label>
                    <input
                      type="range"
                      min="12"
                      max="72"
                      value={textSize}
                      onChange={(e) => setTextSize(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={addText}
                      className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 text-sm"
                    >
                      Adicionar Texto
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(activeTool === 'brush' || activeTool === 'eraser') && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">
                  {activeTool === 'brush' ? 'Configurações do Pincel' : 'Configurações da Borracha'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tamanho: {brushSize}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={brushSize}
                      onChange={(e) => {
                        setBrushSize(parseInt(e.target.value));
                        if (fabricCanvasRef.current) {
                          fabricCanvasRef.current.freeDrawingBrush.width = parseInt(e.target.value);
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                  {activeTool === 'brush' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
                      <input
                        type="color"
                        value={brushColor}
                        onChange={(e) => {
                          setBrushColor(e.target.value);
                          if (fabricCanvasRef.current) {
                            fabricCanvasRef.current.freeDrawingBrush.color = e.target.value;
                          }
                        }}
                        className="w-full h-10 rounded border border-gray-300"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTool === 'shapes' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Formas</h4>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {[
                    { id: 'rectangle', label: 'Retângulo', icon: Square },
                    { id: 'circle', label: 'Círculo', icon: Circle },
                    { id: 'triangle', label: 'Triângulo', icon: Square },
                  ].map((shape) => {
                    const Icon = shape.icon;
                    return (
                      <button
                        key={shape.id}
                        onClick={() => addShape(shape.id as any)}
                        className="flex flex-col items-center gap-1 p-3 bg-white rounded-lg hover:bg-gray-100 text-xs"
                      >
                        <Icon className="h-5 w-5" />
                        <span className="hidden md:block">{shape.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cor de preenchimento</label>
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="w-full h-10 rounded border border-gray-300"
                  />
                </div>
              </div>
            )}

            {activeTool === 'stickers' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Adesivos</h4>
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                  {stickers.map((sticker, index) => (
                    <button
                      key={index}
                      onClick={() => addSticker(sticker)}
                      className="p-3 bg-white rounded-lg hover:bg-gray-100 text-2xl"
                    >
                      {sticker}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTool === 'filters' && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Filtros</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brilho: {brightness}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={brightness}
                      onChange={(e) => {
                        setBrightness(parseInt(e.target.value));
                        applyFilters();
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraste: {contrast}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={contrast}
                      onChange={(e) => {
                        setContrast(parseInt(e.target.value));
                        applyFilters();
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Saturação: {saturation}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={saturation}
                      onChange={(e) => {
                        setSaturation(parseInt(e.target.value));
                        applyFilters();
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Desfoque: {blur}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={blur}
                      onChange={(e) => {
                        setBlur(parseInt(e.target.value));
                        applyFilters();
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sépia: {sepia}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sepia}
                      onChange={(e) => {
                        setSepia(parseInt(e.target.value));
                        applyFilters();
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Matiz: {hue}°
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={hue}
                      onChange={(e) => {
                        setHue(parseInt(e.target.value));
                        applyFilters();
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col md:flex-row gap-3 pt-4 border-t">
              <button
                onClick={clearCanvas}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors text-sm md:text-base"
              >
                Limpar Edições
              </button>
              <button
                onClick={exportImage}
                disabled={isProcessing}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm md:text-base"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 md:h-5 md:w-5" />
                    Salvar Edição
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {processedImage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
            <h3 className="text-base md:text-lg font-medium text-green-800">Edição concluída!</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2 text-sm md:text-base">Preview:</h4>
              <img
                src={processedImage}
                alt="Imagem editada"
                className="w-full max-w-xs rounded-lg shadow-md"
              />
            </div>
            
            <div className="flex flex-col justify-center">
              <button
                onClick={handleDownload}
                className="bg-green-600 text-white py-2 md:py-3 px-4 md:px-6 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
              >
                <Download className="h-4 w-4 md:h-5 md:w-5" />
                Baixar Imagem Editada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && (
        <ImageViewer
          src={viewerImageSrc}
          alt={viewerImageAlt}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </div>
  );
};

export default AdvancedImageEditor;