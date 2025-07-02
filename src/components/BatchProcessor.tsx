import React, { useState } from 'react';
import { Download, Loader2, CheckCircle, Package, Archive, Image, FileText } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';
import JSZip from 'jszip';
import { convertImageFormat, resizeImage } from '../utils/imageUtils';

interface BatchProcessorProps {
  onConversionComplete: () => void;
}

interface ProcessedFile {
  name: string;
  blob: Blob;
  url: string;
}

const BatchProcessor: React.FC<BatchProcessorProps> = ({ onConversionComplete }) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [processingMode, setProcessingMode] = useState<'convert' | 'resize' | 'compress'>('convert');
  const [progress, setProgress] = useState(0);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  
  // Conversion settings
  const [outputFormat, setOutputFormat] = useState<'png' | 'jpg' | 'webp'>('jpg');
  const [quality, setQuality] = useState(0.9);
  
  // Resize settings
  const [newWidth, setNewWidth] = useState(800);
  const [newHeight, setNewHeight] = useState(600);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);

  const handleFileSelect = (files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
    setProcessedFiles([]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (uploadedFiles.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    const processed: ProcessedFile[] = [];

    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        let processedDataUrl: string;
        let fileName: string;

        switch (processingMode) {
          case 'convert':
            processedDataUrl = await convertImageFormat(file, outputFormat, quality);
            fileName = `${file.name.split('.')[0]}.${outputFormat}`;
            break;
          case 'resize':
            processedDataUrl = await resizeImage(file, newWidth, newHeight, quality);
            fileName = `resized_${file.name}`;
            break;
          case 'compress':
            processedDataUrl = await convertImageFormat(file, 'jpg', quality);
            fileName = `compressed_${file.name.split('.')[0]}.jpg`;
            break;
          default:
            continue;
        }

        // Convert data URL to blob
        const response = await fetch(processedDataUrl);
        const blob = await response.blob();

        processed.push({
          name: fileName,
          blob,
          url: processedDataUrl,
        });

        setProgress(((i + 1) / uploadedFiles.length) * 100);
      }

      setProcessedFiles(processed);
      onConversionComplete();
    } catch (error) {
      console.error('Erro no processamento em lote:', error);
      alert('Erro ao processar arquivos. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSingle = (file: ProcessedFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllAsZip = async (filename: string) => {
    if (processedFiles.length === 0) return;

    const zip = new JSZip();
    
    processedFiles.forEach((file) => {
      zip.file(file.name, file.blob);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setUploadedFiles([]);
    setProcessedFiles([]);
    setProgress(0);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Processamento em Lote</h2>
        <p className="text-gray-600">
          Processe múltiplas imagens de uma vez e baixe tudo em um arquivo ZIP
        </p>
      </div>

      {/* Mode Selection */}
      <div className="flex flex-wrap gap-2 justify-center">
        {[
          { id: 'convert', label: 'Converter Formato', icon: Image },
          { id: 'resize', label: 'Redimensionar', icon: Package },
          { id: 'compress', label: 'Comprimir', icon: Archive },
        ].map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.id}
              onClick={() => {
                setProcessingMode(mode.id as any);
                setProcessedFiles([]);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                processingMode === mode.id
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

      <FileUpload
        onFileSelect={handleFileSelect}
        fileType="image"
        multiple={true}
        uploadedFiles={uploadedFiles}
        onRemoveFile={handleRemoveFile}
      />

      {uploadedFiles.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-700">
              {uploadedFiles.length} arquivo(s) selecionado(s)
            </h3>
            <button
              onClick={handleReset}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Limpar tudo
            </button>
          </div>

          {/* Settings based on mode */}
          {processingMode === 'convert' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formato de saída
                </label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value as 'png' | 'jpg' | 'webp')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="jpg">JPG</option>
                  <option value="png">PNG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>
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
                  className="w-full"
                />
              </div>
            </div>
          )}

          {processingMode === 'resize' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  id="maintain-aspect-batch"
                  checked={maintainAspectRatio}
                  onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <label htmlFor="maintain-aspect-batch" className="text-sm font-medium text-gray-700">
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
                    onChange={(e) => setNewWidth(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Altura (px)
                  </label>
                  <input
                    type="number"
                    value={newHeight}
                    onChange={(e) => setNewHeight(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {processingMode === 'compress' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Qualidade de compressão ({Math.round(quality * 100)}%)
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
              <p className="text-sm text-gray-500 mt-1">
                Menor qualidade = arquivos menores
              </p>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Processando arquivos...</span>
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
            onClick={processFiles}
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
                <Package className="h-5 w-5" />
                Processar {uploadedFiles.length} arquivo(s)
              </>
            )}
          </button>
        </div>
      )}

      {processedFiles.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">
              {processedFiles.length} arquivo(s) processado(s) com sucesso!
            </h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-700">
                Todos os arquivos foram processados e estão prontos para download.
              </p>
              <button
                onClick={() => setShowDownloadModal(true)}
                className="bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Archive className="h-4 w-4" />
                Baixar ZIP
              </button>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-700 mb-3">Arquivos processados:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {processedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-3 border flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div>
                        <p className="font-medium text-gray-700 text-sm truncate max-w-32">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.blob.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => downloadSingle(file)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Baixar arquivo"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={downloadAllAsZip}
        defaultFilename={`processed-images-${processingMode}`}
        fileExtension="zip"
      />
    </div>
  );
};

export default BatchProcessor;