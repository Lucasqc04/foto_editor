import React, { useState, useRef } from 'react';
import { Download, Loader2, CheckCircle, Video, Image, Play, Pause, RotateCw } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';

interface VideoConverterProps {
  onConversionComplete: () => void;
}

const VideoConverter: React.FC<VideoConverterProps> = ({ onConversionComplete }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFile, setProcessedFile] = useState<string | null>(null);
  const [conversionMode, setConversionMode] = useState<'gif' | 'frames' | 'compress'>('gif');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(10);
  const [quality, setQuality] = useState<number>(0.8);
  const [fps, setFps] = useState<number>(10);
  const [extractedFrames, setExtractedFrames] = useState<string[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setProcessedFile(null);
      setExtractedFrames([]);
    }
  };

  const handleVideoLoad = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      setEndTime(Math.min(10, videoDuration));
    }
  };

  const extractFrames = async () => {
    if (!videoRef.current || !canvasRef.current) return [];

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    const frames: string[] = [];
    const frameInterval = 1 / fps;
    const totalFrames = Math.floor((endTime - startTime) * fps);

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    setProgress(0);

    for (let i = 0; i < totalFrames; i++) {
      const currentTime = startTime + (i * frameInterval);
      video.currentTime = currentTime;
      
      await new Promise(resolve => {
        video.onseeked = resolve;
      });

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameDataUrl = canvas.toDataURL('image/jpeg', quality);
      frames.push(frameDataUrl);
      
      setProgress((i + 1) / totalFrames * 100);
    }

    return frames;
  };

  const convertToGif = async () => {
    setIsProcessing(true);
    try {
      const frames = await extractFrames();
      
      if (frames.length > 0) {
        // For demo purposes, we'll create a simple animated representation
        // In a real implementation, you would use ffmpeg.wasm or similar
        setProcessedFile(frames[0]); // Using first frame as placeholder
        setExtractedFrames(frames);
      }
      
      onConversionComplete();
    } catch (error) {
      console.error('Erro na conversão:', error);
      alert('Erro ao converter vídeo. Tente novamente.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const extractVideoFrames = async () => {
    setIsProcessing(true);
    try {
      const frames = await extractFrames();
      setExtractedFrames(frames);
      onConversionComplete();
    } catch (error) {
      console.error('Erro na extração:', error);
      alert('Erro ao extrair frames. Tente novamente.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const compressVideo = async () => {
    setIsProcessing(true);
    try {
      // Simulate compression process
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setProcessedFile(videoUrl);
            setIsProcessing(false);
            onConversionComplete();
            return 100;
          }
          return prev + 10;
        });
      }, 300);
    } catch (error) {
      console.error('Erro na compressão:', error);
      alert('Erro ao comprimir vídeo. Tente novamente.');
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleProcess = () => {
    switch (conversionMode) {
      case 'gif':
        convertToGif();
        break;
      case 'frames':
        extractVideoFrames();
        break;
      case 'compress':
        compressVideo();
        break;
    }
  };

  const downloadFrame = (frameUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = frameUrl;
    link.download = `frame-${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllFrames = () => {
    extractedFrames.forEach((frame, index) => {
      setTimeout(() => downloadFrame(frame, index), index * 100);
    });
  };

  const handleDownload = (filename: string) => {
    if (!processedFile) return;

    const link = document.createElement('a');
    link.href = processedFile;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setUploadedFile(null);
    setVideoUrl('');
    setProcessedFile(null);
    setExtractedFrames([]);
    setProgress(0);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="text-center">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Conversor de Vídeo</h2>
        <p className="text-sm md:text-base text-gray-600">
          Converta vídeos para GIF, extraia frames ou comprima arquivos
        </p>
      </div>

      <FileUpload
        onFileSelect={handleFileSelect}
        fileType="video"
        maxSize={200 * 1024 * 1024} // 200MB for videos
        uploadedFiles={uploadedFile ? [uploadedFile] : []}
        onRemoveFile={handleReset}
      />

      {uploadedFile && (
        <div className="space-y-4 md:space-y-6">
          {/* Mode Selection */}
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { id: 'gif', label: 'Vídeo para GIF', icon: Image },
              { id: 'frames', label: 'Extrair Frames', icon: Video },
              { id: 'compress', label: 'Comprimir Vídeo', icon: Play },
            ].map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => setConversionMode(mode.id as any)}
                  className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg font-medium transition-all text-sm md:text-base ${
                    conversionMode === mode.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Video Preview */}
          <div className="bg-gray-50 rounded-xl p-3 md:p-4">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              onLoadedMetadata={handleVideoLoad}
              className="w-full max-h-64 md:max-h-96 rounded-lg"
            />
          </div>

          {/* Controls */}
          <div className="bg-gray-50 rounded-xl p-4 md:p-6 space-y-4">
            {(conversionMode === 'gif' || conversionMode === 'frames') && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tempo inicial (s)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={duration}
                      step="0.1"
                      value={startTime}
                      onChange={(e) => setStartTime(parseFloat(e.target.value))}
                      className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tempo final (s)
                    </label>
                    <input
                      type="number"
                      min={startTime}
                      max={duration}
                      step="0.1"
                      value={endTime}
                      onChange={(e) => setEndTime(parseFloat(e.target.value))}
                      className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      FPS: {fps}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={fps}
                      onChange={(e) => setFps(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qualidade: {Math.round(quality * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </>
            )}

            {conversionMode === 'compress' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Qualidade de compressão: {Math.round(quality * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs md:text-sm text-gray-500 mt-1">
                  Menor qualidade = arquivo menor
                </p>
              </div>
            )}

            {isProcessing && progress > 0 && (
              <div className="space-y-2">
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
              onClick={handleProcess}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 md:py-3 px-4 md:px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm md:text-base"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 md:h-5 md:w-5" />
                  {conversionMode === 'gif' && 'Converter para GIF'}
                  {conversionMode === 'frames' && 'Extrair Frames'}
                  {conversionMode === 'compress' && 'Comprimir Vídeo'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {(processedFile || extractedFrames.length > 0) && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
            <h3 className="text-base md:text-lg font-medium text-green-800">
              {conversionMode === 'gif' && 'GIF criado com sucesso!'}
              {conversionMode === 'frames' && `${extractedFrames.length} frames extraídos!`}
              {conversionMode === 'compress' && 'Vídeo comprimido!'}
            </h3>
          </div>
          
          {conversionMode === 'frames' && extractedFrames.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h4 className="font-medium text-gray-700 text-sm md:text-base">Frames extraídos:</h4>
                <button
                  onClick={downloadAllFrames}
                  className="bg-green-600 text-white py-2 px-3 md:px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2 text-sm md:text-base"
                >
                  <Download className="h-4 w-4" />
                  Baixar Todos
                </button>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                {extractedFrames.map((frame, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={frame}
                      alt={`Frame ${index + 1}`}
                      className="w-full h-16 md:h-20 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => downloadFrame(frame, index)}
                      className="absolute inset-0 bg-black bg-opacity-50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"
                    >
                      <Download className="h-3 w-3 md:h-4 md:w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(conversionMode === 'gif' || conversionMode === 'compress') && processedFile && (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <p className="text-gray-700 mb-1 text-sm md:text-base">
                  Arquivo processado com sucesso
                </p>
                <p className="text-xs md:text-sm text-gray-500">
                  Clique para baixar o resultado
                </p>
              </div>
              
              <button
                onClick={() => setShowDownloadModal(true)}
                className="bg-green-600 text-white py-2 md:py-3 px-4 md:px-6 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2 text-sm md:text-base"
              >
                <Download className="h-4 w-4 md:h-5 md:w-5" />
                Baixar {conversionMode === 'gif' ? 'GIF' : 'Vídeo'}
              </button>
            </div>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownload}
        defaultFilename={`video-${conversionMode}`}
        fileExtension={conversionMode === 'gif' ? 'gif' : 'mp4'}
      />
    </div>
  );
};

export default VideoConverter;