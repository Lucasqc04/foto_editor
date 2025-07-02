import React, { useState, useRef, useCallback } from 'react';
import { Camera, Download, RotateCw, Square, Circle, Loader2, Settings, Eye } from 'lucide-react';
import DownloadModal from './DownloadModal';
import ImageViewer from './ImageViewer';

interface WebcamCaptureProps {
  onConversionComplete: () => void;
}

type CaptureFormat = 'square' | 'rectangle' | 'circle';

const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onConversionComplete }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [captureFormat, setCaptureFormat] = useState<CaptureFormat>('rectangle');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageSrc, setViewerImageSrc] = useState('');
  const [viewerImageAlt, setViewerImageAlt] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      alert('Erro ao acessar a câmera. Verifique as permissões.');
    } finally {
      setIsLoading(false);
    }
  }, [facingMode]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // Definir dimensões baseadas no formato escolhido
    let canvasWidth, canvasHeight, cropX, cropY, cropWidth, cropHeight;

    switch (captureFormat) {
      case 'square':
        const squareSize = Math.min(videoWidth, videoHeight);
        canvasWidth = canvasHeight = squareSize;
        cropX = (videoWidth - squareSize) / 2;
        cropY = (videoHeight - squareSize) / 2;
        cropWidth = cropHeight = squareSize;
        break;
      case 'circle':
        const circleSize = Math.min(videoWidth, videoHeight);
        canvasWidth = canvasHeight = circleSize;
        cropX = (videoWidth - circleSize) / 2;
        cropY = (videoHeight - circleSize) / 2;
        cropWidth = cropHeight = circleSize;
        break;
      default: // rectangle
        canvasWidth = videoWidth;
        canvasHeight = videoHeight;
        cropX = cropY = 0;
        cropWidth = videoWidth;
        cropHeight = videoHeight;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Aplicar transformações para câmera frontal
    if (facingMode === 'user') {
      ctx.scale(-1, 1);
      ctx.translate(-canvasWidth, 0);
    }

    // Para formato circular, criar máscara
    if (captureFormat === 'circle') {
      ctx.beginPath();
      ctx.arc(canvasWidth / 2, canvasHeight / 2, canvasWidth / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    // Desenhar a imagem recortada
    ctx.drawImage(
      video,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, canvasWidth, canvasHeight
    );

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    onConversionComplete();
  };

  const switchCamera = () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleDownload = (filename: string) => {
    if (!capturedImage) return;

    const link = document.createElement('a');
    link.href = capturedImage;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const openImageViewer = (src: string, alt: string) => {
    setViewerImageSrc(src);
    setViewerImageAlt(alt);
    setShowImageViewer(true);
  };

  const getPreviewStyle = () => {
    const baseStyle = "w-full h-auto max-h-96 object-cover border-4 border-white shadow-lg";
    
    switch (captureFormat) {
      case 'square':
        return `${baseStyle} aspect-square`;
      case 'circle':
        return `${baseStyle} aspect-square rounded-full`;
      default:
        return `${baseStyle} rounded-lg`;
    }
  };

  React.useEffect(() => {
    if (facingMode && !isStreaming && !capturedImage) {
      startCamera();
    }
  }, [facingMode, startCamera, isStreaming, capturedImage]);

  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Captura de Webcam</h2>
        <p className="text-gray-600">
          Tire fotos diretamente da sua câmera com diferentes formatos
        </p>
      </div>

      <div className="bg-gray-50 rounded-xl p-6">
        {!capturedImage ? (
          <div className="space-y-4">
            {/* Format Selection */}
            <div className="flex justify-center gap-2 mb-4">
              <h3 className="text-sm font-medium text-gray-700 mr-4 flex items-center">
                <Settings className="h-4 w-4 mr-1" />
                Formato:
              </h3>
              {[
                { id: 'rectangle', label: 'Retângulo', icon: Square },
                { id: 'square', label: 'Quadrado', icon: Square },
                { id: 'circle', label: 'Círculo', icon: Circle },
              ].map((format) => {
                const Icon = format.icon;
                return (
                  <button
                    key={format.id}
                    onClick={() => setCaptureFormat(format.id as CaptureFormat)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      captureFormat === format.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {format.label}
                  </button>
                );
              })}
            </div>

            <div className="relative bg-black rounded-lg overflow-hidden">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
              
              {/* Preview overlay for format guidance */}
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div 
                  className={`border-2 border-white border-dashed ${
                    captureFormat === 'circle' ? 'rounded-full' : 'rounded-lg'
                  } ${
                    captureFormat === 'square' ? 'aspect-square w-64' : 
                    captureFormat === 'circle' ? 'aspect-square w-64' : 
                    'w-80 h-48'
                  }`}
                />
              </div>
              
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={getPreviewStyle()}
                style={{ 
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                  minHeight: '300px'
                }}
              />
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={switchCamera}
                className="bg-gray-600 text-white p-3 rounded-full hover:bg-gray-700 transition-colors"
                title="Trocar câmera"
              >
                <RotateCw className="h-6 w-6" />
              </button>
              
              <button
                onClick={capturePhoto}
                disabled={!isStreaming}
                className="bg-blue-600 text-white p-4 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Capturar foto"
              >
                <Camera className="h-8 w-8" />
              </button>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>Clique no botão da câmera para capturar uma foto</p>
              <p>Use o botão de rotação para alternar entre câmeras</p>
              <p>Escolha o formato desejado antes de capturar</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="relative group inline-block">
                <img
                  src={capturedImage}
                  alt="Foto capturada"
                  className={`max-w-full max-h-96 shadow-md mx-auto cursor-pointer transition-transform hover:scale-105 ${
                    captureFormat === 'circle' ? 'rounded-full' : 'rounded-lg'
                  }`}
                  onClick={() => openImageViewer(capturedImage!, 'Foto Capturada')}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="bg-white/90 p-2 rounded-full">
                    <Eye className="h-5 w-5 text-gray-700" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => openImageViewer(capturedImage!, 'Foto Capturada')}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Eye className="h-5 w-5" />
                Ver em Tela Cheia
              </button>
              
              <button
                onClick={retakePhoto}
                className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Camera className="h-5 w-5" />
                Nova Foto
              </button>
              
              <button
                onClick={() => setShowDownloadModal(true)}
                className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="h-5 w-5" />
                Baixar Foto
              </button>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownload}
        defaultFilename={`foto-webcam-${captureFormat}`}
        fileExtension="jpg"
      />

      <ImageViewer
        src={viewerImageSrc}
        alt={viewerImageAlt}
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
        onDownload={capturedImage && viewerImageSrc === capturedImage ? () => setShowDownloadModal(true) : undefined}
      />
    </div>
  );
};

export default WebcamCapture;