import React, { useState, useRef, useCallback } from 'react';
import { Download, Loader2, CheckCircle, ScanLine, RotateCw, Eye, Settings } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';
import ImageViewer from './ImageViewer';

interface DocumentScannerProps {
  onConversionComplete: () => void;
}

interface Corner {
  x: number;
  y: number;
}

type FilterType = 'none' | 'blackwhite' | 'enhance' | 'bright' | 'contrast';

const DocumentScanner: React.FC<DocumentScannerProps> = ({ onConversionComplete }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [corners, setCorners] = useState<Corner[]>([]);
  const [selectedCorner, setSelectedCorner] = useState<number>(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageSrc, setViewerImageSrc] = useState('');
  const [viewerImageAlt, setViewerImageAlt] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('enhance');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filterOptions = [
    { id: 'none', label: 'Sem Filtro', description: 'Documento sem processamento' },
    { id: 'blackwhite', label: 'Preto e Branco', description: 'Converte para escala de cinza com alto contraste' },
    { id: 'enhance', label: 'Realçar', description: 'Melhora contraste e nitidez (Recomendado)' },
    { id: 'bright', label: 'Clarear', description: 'Aumenta brilho para documentos escuros' },
    { id: 'contrast', label: 'Alto Contraste', description: 'Máximo contraste para melhor legibilidade' },
  ];

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setProcessedImage(null);
      setCorners([]);
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

  const drawCorners = (cornersToDraw: Corner[]) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (cornersToDraw.length === 4) {
      // Desenhar linhas conectando os cantos
      ctx.strokeStyle = '#4F46E5';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.moveTo(cornersToDraw[0].x, cornersToDraw[0].y);
      cornersToDraw.forEach((corner, index) => {
        if (index > 0) ctx.lineTo(corner.x, corner.y);
      });
      ctx.closePath();
      ctx.stroke();

      // Desenhar área interna semi-transparente
      ctx.fillStyle = 'rgba(79, 70, 229, 0.1)';
      ctx.fill();
    }

    // Desenhar pontos dos cantos
    cornersToDraw.forEach((corner, index) => {
      const isSelected = index === selectedCorner;
      const radius = isSelected ? 12 : 8;
      
      ctx.fillStyle = isSelected ? '#EF4444' : '#4F46E5';
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Desenhar borda branca
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Desenhar número do canto
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText((index + 1).toString(), corner.x, corner.y + 4);
    });
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const findNearestCorner = (x: number, y: number, threshold: number = 25): number => {
    for (let i = 0; i < corners.length; i++) {
      const distance = Math.sqrt((corners[i].x - x) ** 2 + (corners[i].y - y) ** 2);
      if (distance < threshold) {
        return i;
      }
    }
    return -1;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);

    if (corners.length < 4) {
      // Adicionar novo canto
      const newCorners = [...corners, { x, y }];
      setCorners(newCorners);
      drawCorners(newCorners);
    } else {
      // Verificar se clicou próximo a um canto existente para selecioná-lo
      const nearestCornerIndex = findNearestCorner(x, y);
      if (nearestCornerIndex !== -1) {
        setSelectedCorner(nearestCornerIndex);
        setIsDragging(true);
        drawCorners(corners);
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || selectedCorner === -1) return;

    const { x, y } = getCanvasCoordinates(e);
    
    // Limitar as coordenadas dentro do canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const boundedX = Math.max(0, Math.min(canvas.width, x));
    const boundedY = Math.max(0, Math.min(canvas.height, y));

    const newCorners = [...corners];
    newCorners[selectedCorner] = { x: boundedX, y: boundedY };
    setCorners(newCorners);
    drawCorners(newCorners);
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setSelectedCorner(-1);
  };

  const resetCorners = () => {
    setCorners([]);
    setSelectedCorner(-1);
    setIsDragging(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const applyDocumentFilter = (ctx: CanvasRenderingContext2D, width: number, height: number, filterType: FilterType) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      switch (filterType) {
        case 'none':
          // Sem alteração
          break;

        case 'blackwhite':
          // Converter para escala de cinza com threshold
          const gray = r * 0.299 + g * 0.587 + b * 0.114;
          const bw = gray > 128 ? 255 : 0;
          data[i] = bw;
          data[i + 1] = bw;
          data[i + 2] = bw;
          break;

        case 'enhance':
          // Melhorar contraste e saturação
          const grayEnhance = r * 0.299 + g * 0.587 + b * 0.114;
          const enhanced = grayEnhance > 128 ? Math.min(255, grayEnhance * 1.3) : Math.max(0, grayEnhance * 0.7);
          data[i] = enhanced;
          data[i + 1] = enhanced;
          data[i + 2] = enhanced;
          break;

        case 'bright':
          // Aumentar brilho
          data[i] = Math.min(255, r * 1.4);
          data[i + 1] = Math.min(255, g * 1.4);
          data[i + 2] = Math.min(255, b * 1.4);
          break;

        case 'contrast':
          // Alto contraste
          const grayContrast = r * 0.299 + g * 0.587 + b * 0.114;
          const contrastValue = ((grayContrast - 128) * 1.8) + 128;
          const finalValue = Math.max(0, Math.min(255, contrastValue));
          data[i] = finalValue;
          data[i + 1] = finalValue;
          data[i + 2] = finalValue;
          break;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const scanDocument = async () => {
    if (!uploadedFile || !imageRef.current || corners.length !== 4) return;

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

      // Converter coordenadas dos cantos para a imagem original
      const originalCorners = corners.map(corner => ({
        x: corner.x * scaleX,
        y: corner.y * scaleY
      }));

      // Calcular dimensões do documento corrigido
      const width = Math.max(
        distance(originalCorners[0], originalCorners[1]),
        distance(originalCorners[3], originalCorners[2])
      );
      const height = Math.max(
        distance(originalCorners[0], originalCorners[3]),
        distance(originalCorners[1], originalCorners[2])
      );

      tempCanvas.width = Math.round(width);
      tempCanvas.height = Math.round(height);

      // Aplicar correção de perspectiva
      const correctedImageData = tempCtx.createImageData(tempCanvas.width, tempCanvas.height);
      const sourceImageData = getImageData(img);

      for (let y = 0; y < tempCanvas.height; y++) {
        for (let x = 0; x < tempCanvas.width; x++) {
          const u = x / (tempCanvas.width - 1);
          const v = y / (tempCanvas.height - 1);

          // Interpolação bilinear para mapear coordenadas
          const topX = originalCorners[0].x + u * (originalCorners[1].x - originalCorners[0].x);
          const topY = originalCorners[0].y + u * (originalCorners[1].y - originalCorners[0].y);
          const bottomX = originalCorners[3].x + u * (originalCorners[2].x - originalCorners[3].x);
          const bottomY = originalCorners[3].y + u * (originalCorners[2].y - originalCorners[3].y);

          const srcX = Math.round(topX + v * (bottomX - topX));
          const srcY = Math.round(topY + v * (bottomY - topY));

          if (srcX >= 0 && srcX < img.width && srcY >= 0 && srcY < img.height) {
            const srcIndex = (srcY * img.width + srcX) * 4;
            const dstIndex = (y * tempCanvas.width + x) * 4;

            correctedImageData.data[dstIndex] = sourceImageData.data[srcIndex];
            correctedImageData.data[dstIndex + 1] = sourceImageData.data[srcIndex + 1];
            correctedImageData.data[dstIndex + 2] = sourceImageData.data[srcIndex + 2];
            correctedImageData.data[dstIndex + 3] = 255;
          } else {
            // Preencher com branco se fora dos limites
            const dstIndex = (y * tempCanvas.width + x) * 4;
            correctedImageData.data[dstIndex] = 255;
            correctedImageData.data[dstIndex + 1] = 255;
            correctedImageData.data[dstIndex + 2] = 255;
            correctedImageData.data[dstIndex + 3] = 255;
          }
        }
      }

      tempCtx.putImageData(correctedImageData, 0, 0);

      // Aplicar filtro selecionado
      applyDocumentFilter(tempCtx, tempCanvas.width, tempCanvas.height, selectedFilter);

      const dataUrl = tempCanvas.toDataURL('image/png', 0.95);
      setProcessedImage(dataUrl);
      onConversionComplete();
    } catch (error) {
      console.error('Erro ao escanear documento:', error);
      alert('Erro ao escanear documento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const distance = (p1: Corner, p2: Corner): number => {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  };

  const getImageData = (img: HTMLImageElement): ImageData => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height);
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
    setCorners([]);
    setSelectedCorner(-1);
    setIsDragging(false);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  };

  const openImageViewer = (src: string, alt: string) => {
    setViewerImageSrc(src);
    setViewerImageAlt(alt);
    setShowImageViewer(true);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Scanner de Documentos</h2>
        <p className="text-gray-600">
          Selecione manualmente os cantos do documento para corrigir perspectiva
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
              <p>1. Clique nos 4 cantos do documento na ordem: <strong>superior esquerdo</strong>, <strong>superior direito</strong>, <strong>inferior direito</strong>, <strong>inferior esquerdo</strong></p>
              <p>2. Após selecionar os 4 cantos, você pode clicar e arrastar os pontos para ajustar a seleção</p>
              <p>3. Os pontos ficam vermelhos quando selecionados para arrastar</p>
              <p>4. Escolha um filtro e clique em "Escanear Documento" para processar</p>
              <div className="mt-2 p-2 bg-blue-100 rounded">
                <strong>Status:</strong> {corners.length}/4 cantos selecionados
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex justify-end">
            <button
              onClick={resetCorners}
              className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <RotateCw className="h-4 w-4" />
              Resetar Seleção
            </button>
          </div>

          {/* Filter Selection */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-gray-700" />
              <h3 className="font-medium text-gray-700">Filtro do documento:</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {filterOptions.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id as FilterType)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedFilter === filter.id
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="font-medium text-sm">{filter.label}</div>
                  <div className={`text-xs mt-1 ${
                    selectedFilter === filter.id ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {filter.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Image with overlay */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-medium text-gray-700 mb-4">
              Selecione os cantos do documento:
            </h4>
            <div className="flex justify-center">
              <div ref={containerRef} className="relative inline-block border border-gray-300 rounded-lg overflow-hidden shadow-md">
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Documento"
                  className="block max-w-full h-auto"
                  style={{ maxHeight: '500px' }}
                  onLoad={onImageLoad}
                />
                <canvas
                  ref={canvasRef}
                  className={`absolute top-0 left-0 ${
                    isDragging ? 'cursor-grabbing' : 'cursor-crosshair'
                  }`}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                />
              </div>
            </div>
          </div>

          <button
            onClick={scanDocument}
            disabled={isProcessing || corners.length !== 4}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Escaneando documento...
              </>
            ) : (
              <>
                <ScanLine className="h-5 w-5" />
                Escanear Documento
              </>
            )}
          </button>
        </div>
      )}

      {processedImage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">Documento escaneado com sucesso!</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Documento corrigido:</h4>
              <div className="relative group">
                <img
                  src={processedImage}
                  alt="Documento escaneado"
                  className="w-full max-w-xs rounded-lg shadow-md cursor-pointer transition-transform hover:scale-105"
                  onClick={() => openImageViewer(processedImage, 'Documento escaneado')}
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
                onClick={() => openImageViewer(processedImage, 'Documento escaneado')}
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
                Baixar Documento
              </button>
            </div>
          </div>
        </div>
      )}

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownload}
        defaultFilename="documento-escaneado"
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

export default DocumentScanner;