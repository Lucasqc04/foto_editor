import React, { useState } from 'react';
import { Download, Loader2, CheckCircle, RefreshCw, Eye } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';
import ImageViewer from './ImageViewer';
import { convertImageFormat } from '../utils/imageUtils';

interface ImageConverterProps {
  onConversionComplete: () => void;
}

const ImageConverter: React.FC<ImageConverterProps> = ({ onConversionComplete }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState<'png' | 'jpg' | 'jpeg' | 'webp' | 'avif' | 'bmp' | 'tiff' | 'ico' | 'gif' | 'svg' | 'heic' | 'heif' | 'tga' | 'dds' | 'hdr' | 'exr' | 'psd' | 'raw' | 'cr2' | 'nef' | 'arw'>('jpg');
  const [isConverting, setIsConverting] = useState(false);
  const [convertedImage, setConvertedImage] = useState<string | null>(null);
  const [quality, setQuality] = useState(0.9);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageSrc, setViewerImageSrc] = useState('');
  const [viewerImageAlt, setViewerImageAlt] = useState('');

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setUploadedFile(files[0]);
      setConvertedImage(null);
    }
  };

  const handleConvert = async () => {
    if (!uploadedFile) return;

    setIsConverting(true);
    try {
      const convertedDataUrl = await convertImageFormat(uploadedFile, outputFormat, quality);
      setConvertedImage(convertedDataUrl);
      onConversionComplete();
    } catch (error) {
      console.error('Erro na conversão:', error);
      alert('Erro ao converter a imagem. Tente novamente.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = (filename: string) => {
    if (!convertedImage) return;

    const link = document.createElement('a');
    link.href = convertedImage;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setUploadedFile(null);
    setConvertedImage(null);
  };

  const openImageViewer = (src: string, alt: string) => {
    setViewerImageSrc(src);
    setViewerImageAlt(alt);
    setShowImageViewer(true);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Converter Formato</h2>
        <p className="text-gray-600">
          Converta suas imagens entre mais de 20 formatos diferentes
        </p>
      </div>

      <FileUpload
        onFileSelect={handleFileSelect}
        fileType="image"
        uploadedFiles={uploadedFile ? [uploadedFile] : []}
        onRemoveFile={handleReset}
      />

      {uploadedFile && (
        <div className="bg-gray-50 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Formato de saída
              </label>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as 'png' | 'jpg' | 'jpeg' | 'webp' | 'avif' | 'bmp' | 'tiff' | 'ico' | 'gif' | 'svg' | 'heic' | 'heif' | 'tga' | 'dds' | 'hdr' | 'exr' | 'psd' | 'raw' | 'cr2' | 'nef' | 'arw')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <optgroup label="Formatos Web">
                  <option value="jpg">JPG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="png">PNG</option>
                  <option value="webp">WebP</option>
                  <option value="avif">AVIF</option>
                  <option value="gif">GIF</option>
                  <option value="svg">SVG</option>
                </optgroup>
                <optgroup label="Formatos Desktop">
                  <option value="bmp">BMP</option>
                  <option value="tiff">TIFF</option>
                  <option value="ico">ICO</option>
                  <option value="tga">TGA</option>
                  <option value="dds">DDS</option>
                </optgroup>
                <optgroup label="Formatos Mobile">
                  <option value="heic">HEIC</option>
                  <option value="heif">HEIF</option>
                </optgroup>
                <optgroup label="Formatos Profissionais">
                  <option value="hdr">HDR</option>
                  <option value="exr">EXR</option>
                  <option value="psd">PSD</option>
                </optgroup>
                <optgroup label="Formatos RAW">
                  <option value="raw">RAW</option>
                  <option value="cr2">CR2 (Canon)</option>
                  <option value="nef">NEF (Nikon)</option>
                  <option value="arw">ARW (Sony)</option>
                </optgroup>
              </select>
            </div>

            {(outputFormat === 'jpg' || outputFormat === 'jpeg' || outputFormat === 'webp' || outputFormat === 'avif' || outputFormat === 'heic' || outputFormat === 'heif') && (
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
            )}
          </div>

          <button
            onClick={handleConvert}
            disabled={isConverting}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isConverting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Convertendo...
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5" />
                Converter
              </>
            )}
          </button>
        </div>
      )}

      {convertedImage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">Conversão concluída!</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Preview:</h4>
              <div className="relative group">
                <img
                  src={convertedImage}
                  alt="Imagem convertida"
                  className="w-full max-w-xs rounded-lg shadow-md cursor-pointer transition-transform hover:scale-105"
                  onClick={() => openImageViewer(convertedImage, 'Imagem Convertida')}
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
                onClick={() => openImageViewer(convertedImage, 'Imagem Convertida')}
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
        defaultFilename={`converted-image`}
        fileExtension={outputFormat}
      />

      <ImageViewer
        src={viewerImageSrc}
        alt={viewerImageAlt}
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
        onDownload={convertedImage && viewerImageSrc === convertedImage ? () => setShowDownloadModal(true) : undefined}
      />
    </div>
  );
};

export default ImageConverter;