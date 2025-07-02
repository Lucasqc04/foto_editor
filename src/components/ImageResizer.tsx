import React, { useState } from 'react';
import { Download, Loader2, CheckCircle, Maximize2, Minimize2, Eye } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';
import ImageViewer from './ImageViewer';
import { resizeImage, compressImage } from '../utils/imageUtils';

interface ImageResizerProps {
  onConversionComplete: () => void;
}

const ImageResizer: React.FC<ImageResizerProps> = ({ onConversionComplete }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageSrc, setViewerImageSrc] = useState('');
  const [viewerImageAlt, setViewerImageAlt] = useState('');
  
  const [resizeMode, setResizeMode] = useState<'resize' | 'compress'>('resize');
  const [newWidth, setNewWidth] = useState<number>(800);
  const [newHeight, setNewHeight] = useState<number>(600);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [quality, setQuality] = useState(0.8);
  const [maxSizeMB, setMaxSizeMB] = useState(1);

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setUploadedFile(file);
      setProcessedImage(null);
      
      // Obter dimensões originais
      const img = new Image();
      img.onload = () => {
        setOriginalDimensions({ width: img.width, height: img.height });
        setNewWidth(img.width);
        setNewHeight(img.height);
      };
      img.src = URL.createObjectURL(file);
    }
  };

  const handleWidthChange = (width: number) => {
    setNewWidth(width);
    if (maintainAspectRatio && originalDimensions) {
      const aspectRatio = originalDimensions.height / originalDimensions.width;
      setNewHeight(Math.round(width * aspectRatio));
    }
  };

  const handleHeightChange = (height: number) => {
    setNewHeight(height);
    if (maintainAspectRatio && originalDimensions) {
      const aspectRatio = originalDimensions.width / originalDimensions.height;
      setNewWidth(Math.round(height * aspectRatio));
    }
  };

  const handleProcess = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    try {
      let processedDataUrl: string;
      
      if (resizeMode === 'resize') {
        processedDataUrl = await resizeImage(uploadedFile, newWidth, newHeight, quality);
      } else {
        processedDataUrl = await compressImage(uploadedFile, maxSizeMB, quality);
      }
      
      setProcessedImage(processedDataUrl);
      onConversionComplete();
    } catch (error) {
      console.error('Erro no processamento:', error);
      alert('Erro ao processar a imagem. Tente novamente.');
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
    setProcessedImage(null);
    setOriginalDimensions(null);
  };

  const openImageViewer = (src: string, alt: string) => {
    setViewerImageSrc(src);
    setViewerImageAlt(alt);
    setShowImageViewer(true);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Redimensionar & Comprimir</h2>
        <p className="text-gray-600">
          Altere o tamanho ou comprima suas imagens mantendo a qualidade
        </p>
      </div>

      <FileUpload
        onFileSelect={handleFileSelect}
        fileType="image"
        uploadedFiles={uploadedFile ? [uploadedFile] : []}
        onRemoveFile={handleReset}
      />

      {uploadedFile && originalDimensions && (
        <div className="bg-gray-50 rounded-xl p-6 space-y-6">
          <div className="text-center">
            <div className="inline-flex bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setResizeMode('resize')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  resizeMode === 'resize'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <Maximize2 className="h-4 w-4 inline mr-2" />
                Redimensionar
              </button>
              <button
                onClick={() => setResizeMode('compress')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  resizeMode === 'compress'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <Minimize2 className="h-4 w-4 inline mr-2" />
                Comprimir
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-gray-700 mb-2">Dimensões originais:</h3>
            <p className="text-gray-600">
              {originalDimensions.width} × {originalDimensions.height} pixels
            </p>
          </div>

          {resizeMode === 'resize' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  id="maintain-aspect"
                  checked={maintainAspectRatio}
                  onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="maintain-aspect" className="text-sm font-medium text-gray-700">
                  Manter proporção
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Largura (px)
                  </label>
                  <input
                    type="number"
                    value={newWidth}
                    onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Altura (px)
                  </label>
                  <input
                    type="number"
                    value={newHeight}
                    onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamanho máximo (MB)
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={maxSizeMB}
                  onChange={(e) => setMaxSizeMB(parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Qualidade ({Math.round(quality * 100)}%)
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleProcess}
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
                {resizeMode === 'resize' ? <Maximize2 className="h-5 w-5" /> : <Minimize2 className="h-5 w-5" />}
                {resizeMode === 'resize' ? 'Redimensionar' : 'Comprimir'}
              </>
            )}
          </button>
        </div>
      )}

      {processedImage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">Processamento concluído!</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Preview:</h4>
              <div className="relative group">
                <img
                  src={processedImage}
                  alt="Imagem processada"
                  className="w-full max-w-xs rounded-lg shadow-md cursor-pointer transition-transform hover:scale-105"
                  onClick={() => openImageViewer(processedImage, 'Imagem Processada')}
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
                onClick={() => openImageViewer(processedImage, 'Imagem Processada')}
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
        defaultFilename={`imagem-${resizeMode === 'resize' ? 'redimensionada' : 'comprimida'}`}
        fileExtension="jpg"
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

export default ImageResizer;