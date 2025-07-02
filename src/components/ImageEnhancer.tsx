import React, { useState, useRef } from 'react';
import { Download, Loader2, CheckCircle, Sparkles, Sliders, Zap, Eye } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';
import ImageViewer from './ImageViewer';

interface ImageEnhancerProps {
  onConversionComplete: () => void;
}

type EnhancementType = 'denoise' | 'sharpen' | 'upscale' | 'auto-enhance';

const ImageEnhancer: React.FC<ImageEnhancerProps> = ({ onConversionComplete }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [enhancementType, setEnhancementType] = useState<EnhancementType>('auto-enhance');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageSrc, setViewerImageSrc] = useState('');
  const [viewerImageAlt, setViewerImageAlt] = useState('');

  // Enhancement parameters
  const [denoiseStrength, setDenoiseStrength] = useState(0.5);
  const [sharpenAmount, setSharpenAmount] = useState(1.0);
  const [upscaleFactor, setUpscaleFactor] = useState(2);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const enhancementTypes = [
    {
      id: 'auto-enhance',
      label: 'Melhoria Automática',
      icon: Zap,
      description: 'Aplica automaticamente melhorias de brilho, contraste e nitidez'
    },
    {
      id: 'denoise',
      label: 'Remover Ruído',
      icon: Sparkles,
      description: 'Remove ruído e granulação da imagem'
    },
    {
      id: 'sharpen',
      label: 'Aumentar Nitidez',
      icon: Sliders,
      description: 'Melhora a nitidez e definição da imagem'
    },
    {
      id: 'upscale',
      label: 'Aumentar Resolução',
      icon: Sparkles,
      description: 'Aumenta a resolução mantendo a qualidade'
    },
  ];

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setUploadedFile(files[0]);
      setProcessedImage(null);
    }
  };

  const applyAutoEnhancement = (imageData: ImageData): ImageData => {
    const data = imageData.data;
    const enhanced = new ImageData(new Uint8ClampedArray(data), imageData.width, imageData.height);
    
    // Auto contrast and brightness adjustment
    let min = 255, max = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      min = Math.min(min, gray);
      max = Math.max(max, gray);
    }
    
    const range = max - min;
    const scale = range > 0 ? 255 / range : 1;
    
    for (let i = 0; i < enhanced.data.length; i += 4) {
      // Contrast and brightness
      enhanced.data[i] = Math.min(255, Math.max(0, (data[i] - min) * scale));
      enhanced.data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - min) * scale));
      enhanced.data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - min) * scale));
      
      // Slight saturation boost
      const avg = (enhanced.data[i] + enhanced.data[i + 1] + enhanced.data[i + 2]) / 3;
      enhanced.data[i] = Math.min(255, avg + (enhanced.data[i] - avg) * 1.2);
      enhanced.data[i + 1] = Math.min(255, avg + (enhanced.data[i + 1] - avg) * 1.2);
      enhanced.data[i + 2] = Math.min(255, avg + (enhanced.data[i + 2] - avg) * 1.2);
    }
    
    return enhanced;
  };

  const applyDenoise = (imageData: ImageData): ImageData => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const enhanced = new ImageData(new Uint8ClampedArray(data), width, height);
    
    // Simple bilateral filter for noise reduction
    const kernelSize = 3;
    const offset = Math.floor(kernelSize / 2);
    
    for (let y = offset; y < height - offset; y++) {
      for (let x = offset; x < width - offset; x++) {
        let r = 0, g = 0, b = 0, totalWeight = 0;
        
        for (let ky = -offset; ky <= offset; ky++) {
          for (let kx = -offset; kx <= offset; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const weight = Math.exp(-(kx * kx + ky * ky) / (2 * denoiseStrength * denoiseStrength));
            
            r += data[idx] * weight;
            g += data[idx + 1] * weight;
            b += data[idx + 2] * weight;
            totalWeight += weight;
          }
        }
        
        const idx = (y * width + x) * 4;
        enhanced.data[idx] = r / totalWeight;
        enhanced.data[idx + 1] = g / totalWeight;
        enhanced.data[idx + 2] = b / totalWeight;
      }
    }
    
    return enhanced;
  };

  const applySharpen = (imageData: ImageData): ImageData => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const enhanced = new ImageData(new Uint8ClampedArray(data), width, height);
    
    // Unsharp mask
    const kernel = [
      [0, -sharpenAmount, 0],
      [-sharpenAmount, 1 + 4 * sharpenAmount, -sharpenAmount],
      [0, -sharpenAmount, 0]
    ];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0, g = 0, b = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const weight = kernel[ky + 1][kx + 1];
            
            r += data[idx] * weight;
            g += data[idx + 1] * weight;
            b += data[idx + 2] * weight;
          }
        }
        
        const idx = (y * width + x) * 4;
        enhanced.data[idx] = Math.min(255, Math.max(0, r));
        enhanced.data[idx + 1] = Math.min(255, Math.max(0, g));
        enhanced.data[idx + 2] = Math.min(255, Math.max(0, b));
      }
    }
    
    return enhanced;
  };

  const applyUpscale = (canvas: HTMLCanvasElement, factor: number): HTMLCanvasElement => {
    const newCanvas = document.createElement('canvas');
    const ctx = newCanvas.getContext('2d')!;
    
    newCanvas.width = canvas.width * factor;
    newCanvas.height = canvas.height * factor;
    
    // Use bicubic interpolation for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);
    
    return newCanvas;
  };

  const enhanceImage = async () => {
    if (!uploadedFile || !canvasRef.current) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(uploadedFile);
      });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      setProgress(25);

      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      switch (enhancementType) {
        case 'auto-enhance':
          imageData = applyAutoEnhancement(imageData);
          break;
        case 'denoise':
          imageData = applyDenoise(imageData);
          break;
        case 'sharpen':
          imageData = applySharpen(imageData);
          break;
        case 'upscale':
          // Upscale is handled differently
          break;
      }

      setProgress(75);

      if (enhancementType === 'upscale') {
        const upscaledCanvas = applyUpscale(canvas, upscaleFactor);
        setProcessedImage(upscaledCanvas.toDataURL('image/png'));
      } else {
        ctx.putImageData(imageData, 0, 0);
        setProcessedImage(canvas.toDataURL('image/png'));
      }

      setProgress(100);
      onConversionComplete();
    } catch (error) {
      console.error('Erro no processamento:', error);
      alert('Erro ao processar imagem. Tente novamente.');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleDownload = (filename: string) => {
    if (!processedImage) return;

    const link = document.createElement('a');
    link.href = processedImage;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setUploadedFile(null);
    setProcessedImage(null);
    setProgress(0);
  };

  const openImageViewer = (src: string, alt: string) => {
    setViewerImageSrc(src);
    setViewerImageAlt(alt);
    setShowImageViewer(true);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Melhorar Qualidade da Imagem</h2>
        <p className="text-gray-600">
          Remova ruído, aumente a nitidez e melhore a qualidade das suas imagens
        </p>
      </div>

      <FileUpload
        onFileSelect={handleFileSelect}
        fileType="image"
        uploadedFiles={uploadedFile ? [uploadedFile] : []}
        onRemoveFile={handleReset}
      />

      {uploadedFile && (
        <div className="space-y-6">
          {/* Enhancement Type Selection */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-medium text-gray-700 mb-4">Tipo de melhoria:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enhancementTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setEnhancementType(type.id as EnhancementType)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      enhancementType === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-gray-800">{type.label}</span>
                    </div>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parameters */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <h3 className="font-medium text-gray-700">Configurações:</h3>
            
            {enhancementType === 'denoise' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Força da remoção de ruído: {denoiseStrength.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={denoiseStrength}
                  onChange={(e) => setDenoiseStrength(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            {enhancementType === 'sharpen' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Intensidade da nitidez: {sharpenAmount.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={sharpenAmount}
                  onChange={(e) => setSharpenAmount(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            {enhancementType === 'upscale' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fator de ampliação: {upscaleFactor}x
                </label>
                <select
                  value={upscaleFactor}
                  onChange={(e) => setUpscaleFactor(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={2}>2x (Dobrar tamanho)</option>
                  <option value={3}>3x (Triplicar tamanho)</option>
                  <option value={4}>4x (Quadruplicar tamanho)</option>
                </select>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-medium text-gray-700 mb-2">Imagem original:</h4>
            <img
              src={URL.createObjectURL(uploadedFile)}
              alt="Original"
              className="max-w-full max-h-64 rounded-lg shadow-md mx-auto"
            />
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Processando...</span>
                <span className="text-blue-600">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={enhanceImage}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Melhorar Imagem
              </>
            )}
          </button>
        </div>
      )}

      {processedImage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">Imagem melhorada com sucesso!</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Resultado:</h4>
              <div className="relative group">
                <img
                  src={processedImage}
                  alt="Imagem melhorada"
                  className="w-full max-w-xs rounded-lg shadow-md cursor-pointer transition-transform hover:scale-105"
                  onClick={() => openImageViewer(processedImage, 'Imagem Melhorada')}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="bg-white/90 p-2 rounded-full">
                    <Eye className="h-5 w-5 text-gray-700" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-center space-y-3">
              <button
                onClick={() => openImageViewer(processedImage, 'Imagem Melhorada')}
                className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="h-5 w-5" />
                Ver em Tela Cheia
              </button>
              <button
                onClick={() => setShowDownloadModal(true)}
                className="bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-5 w-5" />
                Baixar Imagem
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownload}
        defaultFilename={`imagem-melhorada-${enhancementType}`}
        fileExtension="png"
      />

      <ImageViewer
        src={viewerImageSrc}
        alt={viewerImageAlt}
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
        onDownload={processedImage && viewerImageSrc === processedImage ? () => setShowDownloadModal(true) : undefined}
      />
    </div>
  );
};

export default ImageEnhancer;