import React, { useState, useRef, useCallback } from 'react';
import { Download, Loader2, CheckCircle, Ruler, RotateCw, Eye } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';
import ImageViewer from './ImageViewer';

interface PixelMeasurerProps {
  onConversionComplete: () => void;
}

interface Measurement {
  id: number;
  type: 'line' | 'area';
  points: { x: number; y: number }[];
  value: number;
  unit: string;
}

const PixelMeasurer: React.FC<PixelMeasurerProps> = ({ onConversionComplete }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [measurementMode, setMeasurementMode] = useState<'line' | 'area'>('line');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [pixelScale, setPixelScale] = useState(1);
  const [unit, setUnit] = useState('px');
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageSrc, setViewerImageSrc] = useState('');
  const [viewerImageAlt, setViewerImageAlt] = useState('');

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
      setMeasurements([]);
      setCurrentPoints([]);
      setIsDrawing(false);
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

  const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const calculatePolygonArea = (points: { x: number; y: number }[]): number => {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  };

  const drawMeasurements = (tempPoints?: { x: number; y: number }[]) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar medições existentes
    measurements.forEach((measurement, index) => {
      if (measurement.type === 'line') {
        drawLine(ctx, measurement.points[0], measurement.points[1], `${measurement.value.toFixed(2)} ${measurement.unit}`, index);
      } else {
        drawPolygon(ctx, measurement.points, `${measurement.value.toFixed(2)} ${measurement.unit}`, index);
      }
    });

    // Desenhar medição em progresso
    if (tempPoints && tempPoints.length > 0) {
      if (measurementMode === 'line' && tempPoints.length === 2) {
        const distance = calculateDistance(tempPoints[0], tempPoints[1]);
        drawLine(ctx, tempPoints[0], tempPoints[1], `${(distance / pixelScale).toFixed(2)} ${unit}`, -1, true);
      } else if (measurementMode === 'area' && tempPoints.length >= 3) {
        const area = calculatePolygonArea(tempPoints);
        drawPolygon(ctx, tempPoints, `${(area / (pixelScale * pixelScale)).toFixed(2)} ${unit}²`, -1, true);
      } else if (tempPoints.length > 0) {
        // Desenhar pontos individuais
        tempPoints.forEach((point, index) => {
          ctx.fillStyle = '#4F46E5';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText((index + 1).toString(), point.x, point.y + 4);
        });
      }
    }
  };

  const drawLine = (ctx: CanvasRenderingContext2D, p1: { x: number; y: number }, p2: { x: number; y: number }, label: string, index: number, isTemp = false) => {
    ctx.strokeStyle = isTemp ? '#EF4444' : '#4F46E5';
    ctx.lineWidth = 3;
    ctx.setLineDash(isTemp ? [8, 8] : []);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // Desenhar pontos
    ctx.fillStyle = isTemp ? '#EF4444' : '#4F46E5';
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Desenhar bordas brancas nos pontos
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Desenhar label
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(midX - 50, midY - 15, 100, 20);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, midX, midY + 3);

    if (!isTemp && index >= 0) {
      ctx.fillText(`#${index + 1}`, midX, midY - 25);
    }
  };

  const drawPolygon = (ctx: CanvasRenderingContext2D, points: { x: number; y: number }[], label: string, index: number, isTemp = false) => {
    if (points.length < 3) return;

    ctx.strokeStyle = isTemp ? '#EF4444' : '#4F46E5';
    ctx.fillStyle = isTemp ? 'rgba(239, 68, 68, 0.2)' : 'rgba(79, 70, 229, 0.2)';
    ctx.lineWidth = 3;
    ctx.setLineDash(isTemp ? [8, 8] : []);

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Desenhar pontos
    ctx.fillStyle = isTemp ? '#EF4444' : '#4F46E5';
    points.forEach((point, pointIndex) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText((pointIndex + 1).toString(), point.x, point.y + 4);
      
      ctx.fillStyle = isTemp ? '#EF4444' : '#4F46E5';
    });

    // Desenhar label no centroide
    const centroid = {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length
    };

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(centroid.x - 50, centroid.y - 15, 100, 20);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, centroid.x, centroid.y + 3);

    if (!isTemp && index >= 0) {
      ctx.fillText(`#${index + 1}`, centroid.x, centroid.y - 25);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasCoordinates(e);

    if (measurementMode === 'line') {
      if (currentPoints.length === 0) {
        setCurrentPoints([point]);
        setIsDrawing(true);
      } else if (currentPoints.length === 1) {
        const newPoints = [currentPoints[0], point];
        const distance = calculateDistance(newPoints[0], newPoints[1]);
        const measurement: Measurement = {
          id: Date.now(),
          type: 'line',
          points: newPoints,
          value: distance / pixelScale,
          unit
        };
        setMeasurements(prev => [...prev, measurement]);
        setCurrentPoints([]);
        setIsDrawing(false);
        drawMeasurements();
      }
    } else if (measurementMode === 'area') {
      const newPoints = [...currentPoints, point];
      setCurrentPoints(newPoints);
      setIsDrawing(true);
      drawMeasurements(newPoints);
    }
  };

  const handleCanvasRightClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevenir menu de contexto
    
    if (measurementMode === 'area' && currentPoints.length >= 3) {
      // Finalizar área com clique direito
      const area = calculatePolygonArea(currentPoints);
      const measurement: Measurement = {
        id: Date.now(),
        type: 'area',
        points: currentPoints,
        value: area / (pixelScale * pixelScale),
        unit: unit + '²'
      };
      setMeasurements(prev => [...prev, measurement]);
      setCurrentPoints([]);
      setIsDrawing(false);
      drawMeasurements();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const point = getCanvasCoordinates(e);
    
    if (measurementMode === 'line' && currentPoints.length === 1) {
      drawMeasurements([currentPoints[0], point]);
    } else if (measurementMode === 'area' && currentPoints.length > 0) {
      drawMeasurements([...currentPoints, point]);
    }
  };

  const clearMeasurements = () => {
    setMeasurements([]);
    setCurrentPoints([]);
    setIsDrawing(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const exportMeasurements = async () => {
    if (!uploadedFile || !imageRef.current || measurements.length === 0) return;

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

      // Desenhar medições escaladas
      measurements.forEach((measurement, index) => {
        const scaledPoints = measurement.points.map(point => ({
          x: point.x * scaleX,
          y: point.y * scaleY
        }));

        if (measurement.type === 'line') {
          drawLine(tempCtx, scaledPoints[0], scaledPoints[1], `${measurement.value.toFixed(2)} ${measurement.unit}`, index);
        } else {
          drawPolygon(tempCtx, scaledPoints, `${measurement.value.toFixed(2)} ${measurement.unit}`, index);
        }
      });

      const dataUrl = tempCanvas.toDataURL('image/png', 0.95);
      setProcessedImage(dataUrl);
      onConversionComplete();
    } catch (error) {
      console.error('Erro ao exportar medições:', error);
      alert('Erro ao exportar medições. Tente novamente.');
    } finally {
      setIsProcessing(false);
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
    setImageUrl('');
    setProcessedImage(null);
    setMeasurements([]);
    setCurrentPoints([]);
    setIsDrawing(false);
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
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Ferramenta de Medida por Pixel</h2>
        <p className="text-gray-600">
          Meça distâncias e áreas em suas imagens com precisão pixel por pixel
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
          {/* Controls */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modo de medição:
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setMeasurementMode('line');
                      setCurrentPoints([]);
                      setIsDrawing(false);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      measurementMode === 'line'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Ruler className="h-4 w-4" />
                    Distância
                  </button>
                  <button
                    onClick={() => {
                      setMeasurementMode('area');
                      setCurrentPoints([]);
                      setIsDrawing(false);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      measurementMode === 'area'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    Área
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unidade de medida:
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="px">Pixels</option>
                  <option value="mm">Milímetros</option>
                  <option value="cm">Centímetros</option>
                  <option value="in">Polegadas</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Escala: {pixelScale} pixels = 1 {unit}
              </label>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={pixelScale}
                onChange={(e) => setPixelScale(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={clearMeasurements}
                className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <RotateCw className="h-4 w-4" />
                Limpar Medições
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-medium text-blue-800 mb-2">Como usar:</h3>
            <div className="text-sm text-blue-700 space-y-1">
              {measurementMode === 'line' ? (
                <>
                  <p>• <strong>Distância:</strong> Clique em dois pontos para medir a distância entre eles</p>
                  <p>• O primeiro clique marca o ponto inicial, o segundo clique marca o ponto final</p>
                </>
              ) : (
                <>
                  <p>• <strong>Área:</strong> Clique em vários pontos para formar um polígono</p>
                  <p>• <strong>Clique direito</strong> para finalizar o polígono (mínimo 3 pontos)</p>
                  <p>• Os pontos são conectados automaticamente na ordem de criação</p>
                </>
              )}
              <p>• Ajuste a escala se você souber a medida real de algum objeto na imagem</p>
              <p>• As medições aparecerão em tempo real na imagem</p>
              <div className="mt-2 p-2 bg-blue-100 rounded">
                <strong>Status:</strong> {isDrawing ? 
                  `${measurementMode === 'line' ? 'Medindo distância...' : `Criando área... (${currentPoints.length} pontos - clique direito para finalizar)`}` 
                  : 'Pronto para medir'}
              </div>
            </div>
          </div>

          {/* Image with overlay */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-medium text-gray-700 mb-4">
              Clique na imagem para fazer medições:
            </h4>
            <div className="flex justify-center">
              <div ref={containerRef} className="relative inline-block border border-gray-300 rounded-lg overflow-hidden shadow-md">
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Imagem para medição"
                  className="block max-w-full h-auto"
                  style={{ maxHeight: '500px' }}
                  onLoad={onImageLoad}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 cursor-crosshair"
                  onClick={handleCanvasClick}
                  onContextMenu={handleCanvasRightClick}
                  onMouseMove={handleMouseMove}
                />
              </div>
            </div>
          </div>

          {/* Measurements List */}
          {measurements.length > 0 && (
            <div className="bg-white rounded-xl p-6 border">
              <h4 className="font-medium text-gray-700 mb-4">Medições realizadas:</h4>
              <div className="space-y-2">
                {measurements.map((measurement, index) => (
                  <div key={measurement.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div>
                      <span className="font-medium">#{index + 1}</span>
                      <span className="ml-2 text-gray-600">
                        {measurement.type === 'line' ? 'Distância' : 'Área'}:
                      </span>
                      <span className="ml-2 font-mono text-blue-600">
                        {measurement.value.toFixed(2)} {measurement.unit}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setMeasurements(prev => prev.filter(m => m.id !== measurement.id));
                        drawMeasurements();
                      }}
                      className="text-red-500 hover:text-red-700 p-1 text-xl"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={exportMeasurements}
            disabled={measurements.length === 0 || isProcessing}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Exportando medições...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Exportar com Medições
              </>
            )}
          </button>
        </div>
      )}

      {processedImage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">Medições exportadas com sucesso!</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Imagem com medições:</h4>
              <div className="relative group">
                <img
                  src={processedImage}
                  alt="Imagem com medições"
                  className="w-full max-w-xs rounded-lg shadow-md cursor-pointer transition-transform hover:scale-105"
                  onClick={() => openImageViewer(processedImage, 'Imagem com medições')}
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
                onClick={() => openImageViewer(processedImage, 'Imagem com medições')}
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
        defaultFilename="imagem-com-medicoes"
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

export default PixelMeasurer;