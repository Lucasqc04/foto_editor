import React, { useState, useRef, useCallback } from 'react';
import { Download, Loader2, CheckCircle, Target, Eye, RotateCw } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';
import ImageViewer from './ImageViewer';

interface ObjectRemoverProps {
  onConversionComplete: () => void;
}

const ObjectRemover: React.FC<ObjectRemoverProps> = ({ onConversionComplete }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageSrc, setViewerImageSrc] = useState('');
  const [viewerImageAlt, setViewerImageAlt] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [maskAreas, setMaskAreas] = useState<{ x: number; y: number; size: number }[]>([]);
  
  // Novos controles de intensidade
  const [inpaintingStrength, setInpaintingStrength] = useState(3);
  const [blurIntensity, setBlurIntensity] = useState(2);
  const [iterations, setIterations] = useState(5);
  const [algorithm, setAlgorithm] = useState<'simple' | 'advanced' | 'blur'>('advanced');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setProcessedImage(null);
      setMaskAreas([]);
    }
  };

  const onImageLoad = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return;

    const img = imageRef.current;
    const canvas = canvasRef.current;
    const rect = img.getBoundingClientRect();

    // Configurar canvas overlay
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Limpar canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const drawMaskAreas = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar todas as áreas marcadas
    maskAreas.forEach((area) => {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.arc(area.x, area.y, area.size, 0, Math.PI * 2);
      ctx.fill();

      // Borda para melhor visualização
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);
    
    const newArea = { x, y, size: brushSize };
    setMaskAreas(prev => [...prev, newArea]);
    drawMaskAreas();
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const { x, y } = getCanvasCoordinates(e);
    
    const newArea = { x, y, size: brushSize };
    setMaskAreas(prev => [...prev, newArea]);
    drawMaskAreas();
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const clearMask = () => {
    setMaskAreas([]);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const removeObjects = async () => {
    if (!uploadedFile || !imageRef.current || maskAreas.length === 0) return;

    setIsProcessing(true);

    try {
      // Criar canvas temporário para processamento
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error('Canvas context not available');

      // Carregar imagem original
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Calcular escala entre imagem exibida e original
      const displayRect = imageRef.current.getBoundingClientRect();
      const scaleX = img.width / displayRect.width;
      const scaleY = img.height / displayRect.height;

      tempCanvas.width = img.width;
      tempCanvas.height = img.height;

      // Desenhar imagem original
      tempCtx.drawImage(img, 0, 0);

      // Criar máscara das áreas a serem removidas
      const maskCanvas = document.createElement('canvas');
      const maskCtx = maskCanvas.getContext('2d')!;
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;
      
      // Preencher máscara com preto (áreas a manter)
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

      // Marcar áreas a remover em branco
      maskCtx.fillStyle = 'white';
      maskAreas.forEach((area) => {
        const scaledX = area.x * scaleX;
        const scaledY = area.y * scaleY;
        const scaledSize = area.size * Math.max(scaleX, scaleY);
        
        maskCtx.beginPath();
        maskCtx.arc(scaledX, scaledY, scaledSize, 0, Math.PI * 2);
        maskCtx.fill();
      });

      // Aplicar algoritmo de inpainting
      const originalImageData = tempCtx.getImageData(0, 0, img.width, img.height);
      const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      const result = await applyInpainting(originalImageData, maskImageData);
      
      tempCtx.putImageData(result, 0, 0);

      const dataUrl = tempCanvas.toDataURL('image/png', 0.95);
      setProcessedImage(dataUrl);
      onConversionComplete();
    } catch (error) {
      console.error('Erro ao remover objetos:', error);
      alert('Erro ao remover objetos. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyInpainting = async (originalData: ImageData, maskData: ImageData): Promise<ImageData> => {
    const width = originalData.width;
    const height = originalData.height;
    const result = new ImageData(new Uint8ClampedArray(originalData.data), width, height);
    
    switch (algorithm) {
      case 'simple':
        return applySimpleInpainting(result, maskData, width, height);
      case 'advanced':
        return applyAdvancedInpainting(result, maskData, width, height);
      case 'blur':
        return applyBlurInpainting(result, maskData, width, height);
      default:
        return result;
    }
  };

  const applySimpleInpainting = (result: ImageData, maskData: ImageData, width: number, height: number): ImageData => {
    for (let iter = 0; iter < iterations; iter++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          
          if (maskData.data[idx] > 128) {
            let r = 0, g = 0, b = 0, count = 0;
            
            const radius = Math.min(inpaintingStrength * 3, 15);
            for (let dy = -radius; dy <= radius; dy++) {
              for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const nIdx = (ny * width + nx) * 4;
                  
                  if (maskData.data[nIdx] < 128) {
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const weight = 1 / (1 + distance * 0.3);
                    
                    r += result.data[nIdx] * weight;
                    g += result.data[nIdx + 1] * weight;
                    b += result.data[nIdx + 2] * weight;
                    count += weight;
                  }
                }
              }
            }
            
            if (count > 0) {
              result.data[idx] = Math.round(r / count);
              result.data[idx + 1] = Math.round(g / count);
              result.data[idx + 2] = Math.round(b / count);
              result.data[idx + 3] = 255;
            }
          }
        }
      }
    }
    return result;
  };

  const applyAdvancedInpainting = (result: ImageData, maskData: ImageData, width: number, height: number): ImageData => {
    // Algoritmo mais sofisticado com pesos por direção
    for (let iter = 0; iter < iterations; iter++) {
      const tempData = new Uint8ClampedArray(result.data);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          
          if (maskData.data[idx] > 128) {
            let r = 0, g = 0, b = 0, totalWeight = 0;
            
            const radius = inpaintingStrength * 4;
            
            // Amostragem em múltiplas direções com pesos diferentes
            const directions = [
              [-1, 0], [1, 0], [0, -1], [0, 1], // Cardeais
              [-1, -1], [1, 1], [-1, 1], [1, -1], // Diagonais
            ];
            
            directions.forEach(([dx, dy]) => {
              for (let dist = 1; dist <= radius; dist++) {
                const nx = x + dx * dist;
                const ny = y + dy * dist;
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  const nIdx = (ny * width + nx) * 4;
                  
                  if (maskData.data[nIdx] < 128) {
                    const weight = (radius - dist + 1) / radius * inpaintingStrength;
                    
                    r += tempData[nIdx] * weight;
                    g += tempData[nIdx + 1] * weight;
                    b += tempData[nIdx + 2] * weight;
                    totalWeight += weight;
                    break; // Usar o primeiro pixel válido nesta direção
                  }
                }
              }
            });
            
            // Adicionar ruído sutil para evitar padrões artificiais
            const noise = (Math.random() - 0.5) * 5;
            
            if (totalWeight > 0) {
              result.data[idx] = Math.max(0, Math.min(255, Math.round(r / totalWeight + noise)));
              result.data[idx + 1] = Math.max(0, Math.min(255, Math.round(g / totalWeight + noise)));
              result.data[idx + 2] = Math.max(0, Math.min(255, Math.round(b / totalWeight + noise)));
              result.data[idx + 3] = 255;
            }
          }
        }
      }
    }
    return result;
  };

  const applyBlurInpainting = (result: ImageData, maskData: ImageData, width: number, height: number): ImageData => {
    // Aplicar blur gaussiano na região marcada
    const blurRadius = blurIntensity * 3;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        if (maskData.data[idx] > 128) {
          let r = 0, g = 0, b = 0, totalWeight = 0;
          
          for (let dy = -blurRadius; dy <= blurRadius; dy++) {
            for (let dx = -blurRadius; dx <= blurRadius; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = (ny * width + nx) * 4;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= blurRadius) {
                  // Peso gaussiano
                  const weight = Math.exp(-(distance * distance) / (2 * blurRadius * blurRadius));
                  
                  r += result.data[nIdx] * weight;
                  g += result.data[nIdx + 1] * weight;
                  b += result.data[nIdx + 2] * weight;
                  totalWeight += weight;
                }
              }
            }
          }
          
          if (totalWeight > 0) {
            result.data[idx] = Math.round(r / totalWeight);
            result.data[idx + 1] = Math.round(g / totalWeight);
            result.data[idx + 2] = Math.round(b / totalWeight);
            result.data[idx + 3] = 255;
          }
        }
      }
    }
    return result;
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
    setImageUrl('');
    setProcessedImage(null);
    setMaskAreas([]);
    setIsDrawing(false);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  };

  const openImageViewer = (src: string, alt: string) => {
    setViewerImageSrc(src);
    setViewerImageAlt(alt);
    setShowImageViewer(true);
  };

  // Atualizar desenho sempre que maskAreas mudar
  React.useEffect(() => {
    drawMaskAreas();
  }, [maskAreas]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Remoção Inteligente de Objetos</h2>
        <p className="text-gray-600">
          Marque os objetos que deseja remover e deixe a IA preencher o fundo automaticamente
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
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-medium text-blue-800 mb-2">Como usar:</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>1. Use o pincel para marcar os objetos que deseja remover (áreas em vermelho)</p>
              <p>2. Clique e arraste para cobrir completamente os objetos indesejados</p>
              <p>3. Ajuste o tamanho do pincel conforme necessário</p>
              <p>4. Clique em "Remover Objetos" para processar</p>
              <p>5. A IA preencherá automaticamente as áreas marcadas com conteúdo similar ao fundo</p>
              <div className="mt-2 p-2 bg-blue-100 rounded">
                <strong>Status:</strong> {maskAreas.length > 0 ? `${maskAreas.length} áreas marcadas` : 'Nenhuma área marcada'}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-700">Ferramentas de marcação:</h3>
              <button
                onClick={clearMask}
                className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <RotateCw className="h-4 w-4" />
                Limpar Marcações
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamanho do pincel: {brushSize}px
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Algoritmo de preenchimento:
                </label>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value as 'simple' | 'advanced' | 'blur')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="simple">Simples</option>
                  <option value="advanced">Avançado (Recomendado)</option>
                  <option value="blur">Blur Gaussiano</option>
                </select>
              </div>
            </div>

            {algorithm !== 'blur' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Intensidade de preenchimento: {inpaintingStrength}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={inpaintingStrength}
                    onChange={(e) => setInpaintingStrength(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Controla a área de análise para preenchimento
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Iterações: {iterations}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={iterations}
                    onChange={(e) => setIterations(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mais iterações = melhor qualidade (mais lento)
                  </p>
                </div>
              </div>
            )}

            {algorithm === 'blur' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Intensidade do blur: {blurIntensity}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={blurIntensity}
                  onChange={(e) => setBlurIntensity(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Controla o raio do efeito blur
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-medium text-blue-800 text-sm mb-1">Dica:</h4>
              <p className="text-xs text-blue-700">
                {algorithm === 'simple' && 'Algoritmo rápido, ideal para remoções simples'}
                {algorithm === 'advanced' && 'Melhor qualidade, análise em múltiplas direções'}
                {algorithm === 'blur' && 'Suaviza a área marcada, bom para objetos pequenos'}
              </p>
            </div>
          </div>

          {/* Image with overlay */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-medium text-gray-700 mb-4">
              Marque os objetos para remover (clique e arraste):
            </h4>
            <div className="flex justify-center">
              <div ref={containerRef} className="relative inline-block border border-gray-300 rounded-lg overflow-hidden shadow-md">
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Imagem para edição"
                  className="block max-w-full h-auto"
                  style={{ maxHeight: '500px' }}
                  onLoad={onImageLoad}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 cursor-crosshair"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                />
              </div>
            </div>
          </div>

          <button
            onClick={removeObjects}
            disabled={isProcessing || maskAreas.length === 0}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Removendo objetos...
              </>
            ) : (
              <>
                <Target className="h-5 w-5" />
                Remover Objetos
              </>
            )}
          </button>
        </div>
      )}

      {processedImage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">Objetos removidos com sucesso!</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Resultado:</h4>
              <div className="relative group">
                <img
                  src={processedImage}
                  alt="Imagem com objetos removidos"
                  className="w-full max-w-xs rounded-lg shadow-md cursor-pointer transition-transform hover:scale-105"
                  onClick={() => openImageViewer(processedImage, 'Imagem com objetos removidos')}
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
                onClick={() => openImageViewer(processedImage, 'Imagem com objetos removidos')}
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

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownload}
        defaultFilename="imagem-objetos-removidos"
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

export default ObjectRemover;