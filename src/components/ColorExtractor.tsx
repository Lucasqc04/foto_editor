import React, { useState, useRef } from 'react';
import { Download, Loader2, CheckCircle, Palette, Copy, Eye } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';

interface ColorExtractorProps {
  onConversionComplete: () => void;
}

interface ColorInfo {
  hex: string;
  rgb: string;
  hsl: string;
  percentage: number;
}

const ColorExtractor: React.FC<ColorExtractorProps> = ({ onConversionComplete }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedColors, setExtractedColors] = useState<ColorInfo[]>([]);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [colorCount, setColorCount] = useState(8);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setUploadedFile(files[0]);
      setExtractedColors([]);
    }
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const rgbToHsl = (r: number, g: number, b: number): string => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }

    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  };

  const extractColors = async () => {
    if (!uploadedFile || !canvasRef.current) return;

    setIsProcessing(true);

    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(uploadedFile);
      });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
      
      // Redimensionar para análise mais rápida
      const maxSize = 200;
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Contar cores
      const colorMap = new Map<string, number>();
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const alpha = data[i + 3];
        
        // Ignorar pixels transparentes
        if (alpha < 128) continue;
        
        // Quantizar cores para reduzir variações
        const qr = Math.round(r / 16) * 16;
        const qg = Math.round(g / 16) * 16;
        const qb = Math.round(b / 16) * 16;
        
        const colorKey = `${qr},${qg},${qb}`;
        colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
      }
      
      // Ordenar por frequência e pegar as cores mais dominantes
      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, colorCount);
      
      const totalPixels = sortedColors.reduce((sum, [, count]) => sum + count, 0);
      
      const colors: ColorInfo[] = sortedColors.map(([colorKey, count]) => {
        const [r, g, b] = colorKey.split(',').map(Number);
        return {
          hex: rgbToHex(r, g, b),
          rgb: `rgb(${r}, ${g}, ${b})`,
          hsl: rgbToHsl(r, g, b),
          percentage: (count / totalPixels) * 100
        };
      });
      
      setExtractedColors(colors);
      onConversionComplete();
    } catch (error) {
      console.error('Erro na extração de cores:', error);
      alert('Erro ao extrair cores. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    alert(`Cor ${color} copiada para a área de transferência!`);
  };

  const exportPalette = (filename: string) => {
    const paletteData = {
      colors: extractedColors,
      totalColors: extractedColors.length,
      extractedFrom: uploadedFile?.name || 'imagem',
      extractedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(paletteData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setUploadedFile(null);
    setExtractedColors([]);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Extrator de Paleta de Cores</h2>
        <p className="text-gray-600">
          Extraia as cores dominantes de qualquer imagem e crie paletas personalizadas
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
          {/* Settings */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de cores para extrair: {colorCount}
              </label>
              <input
                type="range"
                min="3"
                max="16"
                value={colorCount}
                onChange={(e) => setColorCount(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-5 w-5 text-gray-500" />
              <h4 className="font-medium text-gray-700">Imagem original:</h4>
            </div>
            <img
              src={URL.createObjectURL(uploadedFile)}
              alt="Original"
              className="max-w-full max-h-64 rounded-lg shadow-md mx-auto"
            />
          </div>

          <button
            onClick={extractColors}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Extraindo cores...
              </>
            ) : (
              <>
                <Palette className="h-5 w-5" />
                Extrair Paleta de Cores
              </>
            )}
          </button>
        </div>
      )}

      {extractedColors.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">
              Paleta extraída com sucesso! ({extractedColors.length} cores)
            </h3>
          </div>
          
          <div className="space-y-6">
            {/* Color Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {extractedColors.map((color, index) => (
                <div key={index} className="bg-white rounded-lg p-4 shadow-sm border">
                  <div
                    className="w-full h-16 rounded-lg mb-3 border border-gray-200"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-gray-600">{color.hex}</span>
                      <button
                        onClick={() => copyColor(color.hex)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Copiar HEX"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-gray-600">{color.rgb}</span>
                      <button
                        onClick={() => copyColor(color.rgb)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Copiar RGB"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">
                      {color.percentage.toFixed(1)}% da imagem
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Color Bar */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-medium text-gray-700 mb-3">Paleta linear:</h4>
              <div className="flex h-12 rounded-lg overflow-hidden border border-gray-200">
                {extractedColors.map((color, index) => (
                  <div
                    key={index}
                    className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ 
                      backgroundColor: color.hex,
                      width: `${color.percentage}%`
                    }}
                    title={`${color.hex} (${color.percentage.toFixed(1)}%)`}
                    onClick={() => copyColor(color.hex)}
                  />
                ))}
              </div>
            </div>

            {/* Export Options */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const allColors = extractedColors.map(c => c.hex).join(', ');
                  copyColor(allColors);
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiar Todas as Cores
              </button>
              <button
                onClick={() => setShowDownloadModal(true)}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar Paleta
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={exportPalette}
        defaultFilename="paleta-cores"
        fileExtension="json"
      />
    </div>
  );
};

export default ColorExtractor;