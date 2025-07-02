import React, { useState, useRef, useCallback } from 'react';
import { Download, Loader2, CheckCircle, RotateCw, FlipHorizontal, FlipVertical, Crop, Palette, Type, Scissors } from 'lucide-react';
import Cropper from 'react-easy-crop';
import FileUpload from './FileUpload';

interface ImageEditorProps {
  onConversionComplete: () => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ onConversionComplete }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'crop' | 'rotate' | 'filter' | 'text'>('crop');
  
  // Crop states
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  
  // Transform states
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  
  // Filter states
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  
  // Text states
  const [textOverlay, setTextOverlay] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(24);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setProcessedImage(null);
      resetStates();
    }
  };

  const resetStates = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
    setTextOverlay('');
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const applyTransformations = async () => {
    if (!uploadedFile || !canvasRef.current) return;

    setIsProcessing(true);
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      let { width, height } = img;
      
      // Apply crop if in crop mode and crop area is defined
      if (activeMode === 'crop' && croppedAreaPixels) {
        width = croppedAreaPixels.width;
        height = croppedAreaPixels.height;
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(
          img,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          width,
          height
        );
      } else {
        canvas.width = width;
        canvas.height = height;
        
        // Apply transformations
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        
        // Apply filters
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;
        
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
        ctx.restore();
      }

      // Add text overlay if specified
      if (textOverlay && activeMode === 'text') {
        ctx.fillStyle = textColor;
        ctx.font = `${textSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(textOverlay, width / 2, height / 2);
      }

      const dataUrl = canvas.toDataURL('image/png');
      setProcessedImage(dataUrl);
      onConversionComplete();
    } catch (error) {
      console.error('Erro no processamento:', error);
      alert('Erro ao processar a imagem. Tente novamente.');
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

  const handleReset = () => {
    setUploadedFile(null);
    setImageUrl('');
    setProcessedImage(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Editor de Imagens</h2>
        <p className="text-gray-600">
          Corte, gire, aplique filtros e adicione texto às suas imagens
        </p>
      </div>

      <FileUpload
        onFileSelect={handleFileSelect}
        accept="image/*"
        uploadedFiles={uploadedFile ? [uploadedFile] : []}
        onRemoveFile={handleReset}
      />

      {uploadedFile && (
        <div className="space-y-6">
          {/* Mode Selection */}
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { id: 'crop', label: 'Cortar', icon: Crop },
              { id: 'rotate', label: 'Girar/Espelhar', icon: RotateCw },
              { id: 'filter', label: 'Filtros', icon: Palette },
              { id: 'text', label: 'Texto', icon: Type },
            ].map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => setActiveMode(mode.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeMode === mode.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {mode.label}
                </button>
              );
            })}
          </div>

          {/* Image Preview */}
          <div className="bg-gray-50 rounded-xl p-4">
            {activeMode === 'crop' ? (
              <div className="relative h-96 bg-gray-200 rounded-lg overflow-hidden">
                <Cropper
                  image={imageUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={undefined}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
            ) : (
              <div className="flex justify-center">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="max-h-96 rounded-lg"
                  style={{
                    transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-gray-50 rounded-xl p-6">
            {activeMode === 'crop' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zoom: {zoom.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {activeMode === 'rotate' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => setRotation(r => r + 90)}
                    className="flex items-center justify-center gap-2 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
                  >
                    <RotateCw className="h-4 w-4" />
                    Girar 90°
                  </button>
                  <button
                    onClick={() => setFlipH(!flipH)}
                    className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg ${
                      flipH ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    <FlipHorizontal className="h-4 w-4" />
                    Espelhar H
                  </button>
                  <button
                    onClick={() => setFlipV(!flipV)}
                    className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg ${
                      flipV ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    <FlipVertical className="h-4 w-4" />
                    Espelhar V
                  </button>
                  <button
                    onClick={() => {
                      setRotation(0);
                      setFlipH(false);
                      setFlipV(false);
                    }}
                    className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600"
                  >
                    Resetar
                  </button>
                </div>
              </div>
            )}

            {activeMode === 'filter' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brilho: {brightness}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraste: {contrast}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Saturação: {saturation}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={saturation}
                    onChange={(e) => setSaturation(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Desfoque: {blur}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={blur}
                    onChange={(e) => setBlur(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {activeMode === 'text' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Texto
                  </label>
                  <input
                    type="text"
                    value={textOverlay}
                    onChange={(e) => setTextOverlay(e.target.value)}
                    placeholder="Digite o texto..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor do texto
                    </label>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-full h-10 rounded-lg border border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                </div>
              </div>
            )}

            <button
              onClick={applyTransformations}
              disabled={isProcessing}
              className="w-full mt-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Scissors className="h-5 w-5" />
                  Aplicar Edições
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {processedImage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">Edição concluída!</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Preview:</h4>
              <img
                src={processedImage}
                alt="Imagem editada"
                className="w-full max-w-xs rounded-lg shadow-md"
              />
            </div>
            
            <div className="flex flex-col justify-center">
              <button
                onClick={handleDownload}
                className="bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-5 w-5" />
                Baixar Imagem Editada
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ImageEditor;