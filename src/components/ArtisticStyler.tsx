import React, { useState, useRef } from 'react';
import { Download, Loader2, CheckCircle, Zap, Palette, Brush, Eye } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';
import ImageViewer from './ImageViewer';

interface ArtisticStylerProps {
  onConversionComplete: () => void;
}

type ArtStyle = 'pencil-sketch' | 'vintage' | 'pop-art' | 'glass' | 'outline';

const ArtisticStyler: React.FC<ArtisticStylerProps> = ({ onConversionComplete }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>('pencil-sketch');
  const [intensity, setIntensity] = useState(0.8);
  const [progress, setProgress] = useState(0);
  const [outlineColor1, setOutlineColor1] = useState('#ff0000');
  const [outlineColor2, setOutlineColor2] = useState('#0000ff');
  const [outlineColorMode, setOutlineColorMode] = useState<'single' | 'gradient' | 'rainbow'>('rainbow');
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageSrc, setViewerImageSrc] = useState('');
  const [viewerImageAlt, setViewerImageAlt] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const artStyles = [
    {
      id: 'pencil-sketch',
      name: '⭐ Esboço a Lápis',
      description: 'Desenho em preto e branco com traços de lápis - Recomendado!',
      icon: Brush
    },
    {
      id: 'vintage',
      name: '⭐ Vintage',
      description: 'Efeito retrô com cores desbotadas e textura antiga - Recomendado!',
      icon: Palette
    },
    {
      id: 'outline',
      name: 'Contornos Personalizados',
      description: 'Contornos coloridos personalizáveis com fundo simplificado',
      icon: Zap
    },
    {
      id: 'glass',
      name: 'Vidro',
      description: 'Efeito de distorção como se visto através de vidro',
      icon: Palette
    },
    {
      id: 'pop-art',
      name: 'Pop Art',
      description: 'Estilo pop art com cores contrastantes e efeitos gráficos',
      icon: Zap
    }
  ];

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setUploadedFile(files[0]);
      setProcessedImage(null);
    }
  };

  const applyPencilSketchEffect = (imageData: ImageData): ImageData => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    
    // Convert to grayscale and apply edge detection
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Sobel edge detection
        let gx = 0, gy = 0;
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            const gray = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3;
            
            // Sobel kernels
            const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
            const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
            const kernelIdx = (dy + 1) * 3 + (dx + 1);
            
            gx += gray * sobelX[kernelIdx];
            gy += gray * sobelY[kernelIdx];
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const edge = 255 - Math.min(255, magnitude);
        
        result.data[idx] = edge;
        result.data[idx + 1] = edge;
        result.data[idx + 2] = edge;
      }
    }
    
    return result;
  };

  const applyVintageEffect = (imageData: ImageData, intensity: number): ImageData => {
    const data = imageData.data;
    const result = new ImageData(new Uint8ClampedArray(data), imageData.width, imageData.height);
    
    for (let i = 0; i < data.length; i += 4) {
      // Sepia tone
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      result.data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
      result.data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
      result.data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
      
      // Reduce brightness and add noise
      const noise = (Math.random() - 0.5) * intensity * 50;
      result.data[i] = Math.max(0, Math.min(255, result.data[i] * 0.8 + noise));
      result.data[i + 1] = Math.max(0, Math.min(255, result.data[i + 1] * 0.8 + noise));
      result.data[i + 2] = Math.max(0, Math.min(255, result.data[i + 2] * 0.8 + noise));
    }
    
    return result;
  };

  const applyPopArtEffect = (imageData: ImageData, intensity: number): ImageData => {
    const data = imageData.data;
    const result = new ImageData(new Uint8ClampedArray(data), imageData.width, imageData.height);
    
    const colors = [
      [255, 0, 0],    // Red
      [0, 255, 0],    // Green
      [0, 0, 255],    // Blue
      [255, 255, 0],  // Yellow
      [255, 0, 255],  // Magenta
      [0, 255, 255],  // Cyan
    ];
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Find closest pop art color
      let minDistance = Infinity;
      let closestColor = [r, g, b];
      
      colors.forEach(color => {
        const distance = Math.sqrt(
          Math.pow(r - color[0], 2) +
          Math.pow(g - color[1], 2) +
          Math.pow(b - color[2], 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestColor = color;
        }
      });
      
      // Blend with original based on intensity
      result.data[i] = r + (closestColor[0] - r) * intensity;
      result.data[i + 1] = g + (closestColor[1] - g) * intensity;
      result.data[i + 2] = b + (closestColor[2] - b) * intensity;
    }
    
    return result;
  };

  const applyGlassEffect = (imageData: ImageData, intensity: number): ImageData => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    
    const distortion = intensity * 20;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Create wave distortion
        const waveX = Math.sin(y * 0.01) * distortion;
        const waveY = Math.sin(x * 0.01) * distortion;
        
        const sourceX = Math.max(0, Math.min(width - 1, Math.floor(x + waveX)));
        const sourceY = Math.max(0, Math.min(height - 1, Math.floor(y + waveY)));
        
        const sourceIdx = (sourceY * width + sourceX) * 4;
        const targetIdx = (y * width + x) * 4;
        
        result.data[targetIdx] = data[sourceIdx];
        result.data[targetIdx + 1] = data[sourceIdx + 1];
        result.data[targetIdx + 2] = data[sourceIdx + 2];
        result.data[targetIdx + 3] = data[sourceIdx + 3];
      }
    }
    
    return result;
  };

  const applyOutlineEffect = (imageData: ImageData, intensity: number): ImageData => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    
    // First, create edge detection
    const edges = new Uint8ClampedArray(width * height);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        // Sobel edge detection
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            
            const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
            const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
            const kernelIdx = (dy + 1) * 3 + (dx + 1);
            
            gx += gray * sobelX[kernelIdx];
            gy += gray * sobelY[kernelIdx];
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edges[y * width + x] = magnitude > (intensity * 50) ? 255 : 0;
      }
    }
    
    // Apply outline effect with custom colors
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const edgeIdx = y * width + x;
        
        if (edges[edgeIdx] > 0) {
          // Color the edges based on selected mode
          let rgb: [number, number, number];
          
          if (outlineColorMode === 'single') {
            rgb = hexToRgb(outlineColor1);
          } else if (outlineColorMode === 'gradient') {
            const factor = x / width; // Horizontal gradient
            rgb = interpolateColor(hexToRgb(outlineColor1), hexToRgb(outlineColor2), factor);
          } else { // rainbow
            const hue = (x + y) % 360;
            rgb = hslToRgb(hue / 360, 0.8, 0.5);
          }
          
          result.data[idx] = rgb[0];
          result.data[idx + 1] = rgb[1];
          result.data[idx + 2] = rgb[2];
        } else {
          // Desaturate background more
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          result.data[idx] = gray * 0.2 + data[idx] * 0.8;
          result.data[idx + 1] = gray * 0.2 + data[idx + 1] * 0.8;
          result.data[idx + 2] = gray * 0.2 + data[idx + 2] * 0.8;
        }
      }
    }
    
    return result;
  };

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [255, 0, 0];
  };

  // Helper function to interpolate between two colors
  const interpolateColor = (color1: [number, number, number], color2: [number, number, number], factor: number): [number, number, number] => {
    return [
      Math.round(color1[0] + (color2[0] - color1[0]) * factor),
      Math.round(color1[1] + (color2[1] - color1[1]) * factor),
      Math.round(color1[2] + (color2[2] - color1[2]) * factor)
    ];
  };

  const applyArtisticStyle = async () => {
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

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let processedData: ImageData;

      setProgress(50);

      switch (selectedStyle) {
        case 'pencil-sketch':
          processedData = applyPencilSketchEffect(imageData);
          break;
        case 'vintage':
          processedData = applyVintageEffect(imageData, intensity);
          break;
        case 'glass':
          processedData = applyGlassEffect(imageData, intensity);
          break;
        case 'outline':
          processedData = applyOutlineEffect(imageData, intensity);
          break;
        case 'pop-art':
          processedData = applyPopArtEffect(imageData, intensity);
          break;
        default:
          processedData = imageData;
      }

      setProgress(75);

      ctx.putImageData(processedData, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      setProcessedImage(dataUrl);

      setProgress(100);
      onConversionComplete();
    } catch (error) {
      console.error('Erro ao aplicar estilo:', error);
      alert('Erro ao aplicar estilo artístico. Tente novamente.');
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
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Estilo Artístico com IA</h2>
        <p className="text-gray-600">
          Transforme suas fotos em obras de arte com diferentes estilos artísticos
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
          {/* Style Selection */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-medium text-gray-700 mb-4">Escolha o estilo artístico:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {artStyles.map((style) => {
                const Icon = style.icon;
                return (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id as ArtStyle)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedStyle === style.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-gray-800">{style.name}</span>
                    </div>
                    <p className="text-sm text-gray-600">{style.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Outline Color Controls */}
          {selectedStyle === 'outline' && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-medium text-gray-700 mb-4">Configurações de Contorno:</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modo de cor:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setOutlineColorMode('single')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        outlineColorMode === 'single'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Cor única
                    </button>
                    <button
                      onClick={() => setOutlineColorMode('gradient')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        outlineColorMode === 'gradient'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Gradiente
                    </button>
                    <button
                      onClick={() => setOutlineColorMode('rainbow')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        outlineColorMode === 'rainbow'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Arco-íris
                    </button>
                  </div>
                </div>

                {outlineColorMode === 'single' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor do contorno:
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={outlineColor1}
                        onChange={(e) => setOutlineColor1(e.target.value)}
                        className="w-12 h-10 rounded border border-gray-300"
                      />
                      <span className="text-sm text-gray-600">{outlineColor1}</span>
                    </div>
                  </div>
                )}

                {outlineColorMode === 'gradient' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cor inicial:
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={outlineColor1}
                          onChange={(e) => setOutlineColor1(e.target.value)}
                          className="w-12 h-10 rounded border border-gray-300"
                        />
                        <span className="text-sm text-gray-600">{outlineColor1}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cor final:
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={outlineColor2}
                          onChange={(e) => setOutlineColor2(e.target.value)}
                          className="w-12 h-10 rounded border border-gray-300"
                        />
                        <span className="text-sm text-gray-600">{outlineColor2}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Intensity Control */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intensidade do efeito: {Math.round(intensity * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={intensity}
                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-medium text-gray-700 mb-2">Imagem original:</h4>
            <div className="relative group">
              <img
                src={URL.createObjectURL(uploadedFile)}
                alt="Original"
                className="max-w-full max-h-64 rounded-lg shadow-md mx-auto cursor-pointer transition-transform hover:scale-105"
                onClick={() => openImageViewer(URL.createObjectURL(uploadedFile), 'Imagem Original')}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-white/90 p-2 rounded-full">
                  <Eye className="h-5 w-5 text-gray-700" />
                </div>
              </div>
            </div>
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Aplicando estilo artístico...</span>
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
            onClick={applyArtisticStyle}
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
                <Zap className="h-5 w-5" />
                Aplicar Estilo Artístico
              </>
            )}
          </button>
        </div>
      )}

      {processedImage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">Estilo aplicado com sucesso!</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Resultado:</h4>
              <div className="relative group">
                <img
                  src={processedImage}
                  alt="Imagem com estilo artístico"
                  className="w-full max-w-xs rounded-lg shadow-md cursor-pointer transition-transform hover:scale-105"
                  onClick={() => openImageViewer(processedImage, `Imagem processada - ${selectedStyle}`)}
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
                onClick={() => openImageViewer(processedImage, `Imagem processada - ${selectedStyle}`)}
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
                Baixar Obra de Arte
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
        defaultFilename={`arte-${selectedStyle}`}
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

export default ArtisticStyler;
// Converts HSL to RGB. h, s, l are in [0,1]
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  ];
}
