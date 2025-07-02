import React, { useState } from 'react';
import { Download, Loader2, CheckCircle, FileText, Plus, Trash2 } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';
import { convertImagesToPdf } from '../utils/pdfUtils';

interface ImageToPdfProps {
  onConversionComplete: () => void;
}

const ImageToPdf: React.FC<ImageToPdfProps> = ({ onConversionComplete }) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const handleFileSelect = (files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
    setPdfBlob(null);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleConvert = async () => {
    if (uploadedFiles.length === 0) return;

    setIsConverting(true);
    try {
      const pdf = await convertImagesToPdf(uploadedFiles, { pageSize, orientation });
      setPdfBlob(pdf);
      onConversionComplete();
    } catch (error) {
      console.error('Erro na conversão:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = (filename: string) => {
    if (!pdfBlob) return;

    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newFiles = [...uploadedFiles];
    const [movedFile] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, movedFile);
    setUploadedFiles(newFiles);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Imagens para PDF</h2>
        <p className="text-gray-600">
          Converta uma ou múltiplas imagens em um arquivo PDF
        </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tamanho da página
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as 'A4' | 'Letter')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Orientação
              </label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="portrait">Retrato</option>
                <option value="landscape">Paisagem</option>
              </select>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-700 mb-2">
              Ordem das páginas ({uploadedFiles.length} imagens)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="relative group bg-white rounded-lg p-2 shadow-sm border"
                >
                  <div className="text-xs text-gray-500 mb-1">Página {index + 1}</div>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-20 object-cover rounded"
                  />
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleConvert}
            disabled={isConverting}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isConverting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <FileText className="h-5 w-5" />
                Gerar PDF
              </>
            )}
          </button>
        </div>
      )}

      {pdfBlob && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">PDF gerado com sucesso!</h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 mb-1">
                Arquivo PDF com {uploadedFiles.length} página(s)
              </p>
              <p className="text-sm text-gray-500">
                Tamanho: {(pdfBlob.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            
            <button
              onClick={() => setShowDownloadModal(true)}
              className="bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="h-5 w-5" />
              Baixar PDF
            </button>
          </div>
        </div>
      )}

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownload}
        defaultFilename="imagens-para-pdf"
        fileExtension="pdf"
      />
    </div>
  );
};

export default ImageToPdf;