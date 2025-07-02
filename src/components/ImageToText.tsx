import React, { useState } from 'react';
import { FileText, Loader2, CheckCircle, Copy, Eye, Download } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';
import { extractTextFromImage } from '../utils/ocrUtils';

interface ImageToTextProps {
  onConversionComplete: () => void;
}

const ImageToText: React.FC<ImageToTextProps> = ({ onConversionComplete }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setUploadedFile(files[0]);
      setExtractedText('');
      setProgress(0);
    }
  };

  const handleExtractText = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    setProgress(0);
    
    try {
      const text = await extractTextFromImage(uploadedFile, (progress) => {
        setProgress(progress);
      });
      setExtractedText(text);
      onConversionComplete();
    } catch (error) {
      console.error('Erro na extração:', error);
      alert('Erro ao extrair texto da imagem. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(extractedText);
    alert('Texto copiado para a área de transferência!');
  };

  const handleDownloadText = (filename: string) => {
    const blob = new Blob([extractedText], { type: 'text/plain' });
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
    setExtractedText('');
    setProgress(0);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Extrair Texto (OCR)</h2>
        <p className="text-gray-600">
          Extraia texto de imagens usando tecnologia OCR avançada
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {uploadedFile && (
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-600">Preview da imagem:</span>
                </div>
              )}
            </div>
          </div>

          {uploadedFile && (
            <div className="max-w-md mx-auto">
              <img
                src={URL.createObjectURL(uploadedFile)}
                alt="Imagem para OCR"
                className="w-full rounded-lg shadow-md"
              />
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">Dicas para melhor resultado:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Use imagens com texto claro e legível</li>
              <li>• Evite imagens com muito ruído ou desfocadas</li>
              <li>• Textos em preto sobre fundo branco funcionam melhor</li>
              <li>• Imagens com boa resolução produzem melhores resultados</li>
            </ul>
          </div>

          {isProcessing && (
            <div className="space-y-3">
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
            onClick={handleExtractText}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Extraindo texto...
              </>
            ) : (
              <>
                <FileText className="h-5 w-5" />
                Extrair Texto
              </>
            )}
          </button>
        </div>
      )}

      {extractedText && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">Texto extraído com sucesso!</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-700">Texto reconhecido:</h4>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyText}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Copiar texto"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <textarea
                value={extractedText}
                readOnly
                className="w-full h-40 p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-800 resize-none"
                placeholder="O texto extraído aparecerá aqui..."
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleCopyText}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiar Texto
              </button>
              <button
                onClick={() => setShowDownloadModal(true)}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Baixar TXT
              </button>
            </div>
          </div>
        </div>
      )}

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownloadText}
        defaultFilename="texto-extraido"
        fileExtension="txt"
      />
    </div>
  );
};

export default ImageToText;