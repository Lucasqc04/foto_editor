import React, { useState, useRef } from 'react';
import { Download, Loader2, CheckCircle, PenTool, Trash2, RotateCw } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';

interface DigitalSignatureProps {
  onConversionComplete: () => void;
}

const DigitalSignature: React.FC<DigitalSignatureProps> = ({ onConversionComplete }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureColor, setSignatureColor] = useState('#000000');
  const [signatureSize, setSignatureSize] = useState(3);
  const [signaturePosition, setSignaturePosition] = useState({ x: 50, y: 80 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setUploadedFile(files[0]);
      setProcessedImage(null);
      loadImageToCanvas(files[0]);
    }
  };

  const loadImageToCanvas = async (file: File) => {
    if (!imageCanvasRef.current) return;

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

    const canvas = imageCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = signatureCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = signatureCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d')!;
    ctx.lineTo(x, y);
    ctx.strokeStyle = signatureColor;
    ctx.lineWidth = signatureSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const applySignature = async () => {
    if (!uploadedFile || !signatureCanvasRef.current || !imageCanvasRef.current) return;

    setIsProcessing(true);

    try {
      const finalCanvas = canvasRef.current!;
      const ctx = finalCanvas.getContext('2d')!;
      
      // Copiar imagem original
      finalCanvas.width = imageCanvasRef.current.width;
      finalCanvas.height = imageCanvasRef.current.height;
      ctx.drawImage(imageCanvasRef.current, 0, 0);
      
      // Aplicar assinatura na posição especificada
      const signatureCanvas = signatureCanvasRef.current;
      const signatureX = (signaturePosition.x / 100) * finalCanvas.width - signatureCanvas.width / 2;
      const signatureY = (signaturePosition.y / 100) * finalCanvas.height - signatureCanvas.height / 2;
      
      ctx.drawImage(signatureCanvas, signatureX, signatureY);
      
      const dataUrl = finalCanvas.toDataURL('image/png');
      setProcessedImage(dataUrl);
      onConversionComplete();
    } catch (error) {
      console.error('Erro ao aplicar assinatura:', error);
      alert('Erro ao aplicar assinatura. Tente novamente.');
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
    clearSignature();
  };

  React.useEffect(() => {
    if (signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      canvas.width = 400;
      canvas.height = 150;
      
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Assinatura Digital</h2>
        <p className="text-gray-600">
          Adicione sua assinatura digital em documentos e imagens
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
          {/* Signature Drawing Area */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-medium text-gray-700 mb-4">Desenhe sua assinatura:</h3>
            
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-4 mb-4">
              <canvas
                ref={signatureCanvasRef}
                className="border border-gray-200 rounded cursor-crosshair mx-auto block"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor da assinatura
                </label>
                <input
                  type="color"
                  value={signatureColor}
                  onChange={(e) => setSignatureColor(e.target.value)}
                  className="w-full h-10 rounded border border-gray-300"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Espessura: {signatureSize}px
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={signatureSize}
                  onChange={(e) => setSignatureSize(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearSignature}
                  className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Limpar
                </button>
              </div>
            </div>
          </div>

          {/* Position Controls */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-medium text-gray-700 mb-4">Posição da assinatura:</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posição horizontal: {signaturePosition.x}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={signaturePosition.x}
                  onChange={(e) => setSignaturePosition(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posição vertical: {signaturePosition.y}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={signaturePosition.y}
                  onChange={(e) => setSignaturePosition(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                onClick={() => setSignaturePosition({ x: 20, y: 20 })}
                className="bg-gray-200 text-gray-700 py-1 px-2 rounded text-sm hover:bg-gray-300"
              >
                Superior Esquerda
              </button>
              <button
                onClick={() => setSignaturePosition({ x: 50, y: 20 })}
                className="bg-gray-200 text-gray-700 py-1 px-2 rounded text-sm hover:bg-gray-300"
              >
                Superior Centro
              </button>
              <button
                onClick={() => setSignaturePosition({ x: 80, y: 20 })}
                className="bg-gray-200 text-gray-700 py-1 px-2 rounded text-sm hover:bg-gray-300"
              >
                Superior Direita
              </button>
              <button
                onClick={() => setSignaturePosition({ x: 20, y: 80 })}
                className="bg-gray-200 text-gray-700 py-1 px-2 rounded text-sm hover:bg-gray-300"
              >
                Inferior Esquerda
              </button>
              <button
                onClick={() => setSignaturePosition({ x: 50, y: 80 })}
                className="bg-gray-200 text-gray-700 py-1 px-2 rounded text-sm hover:bg-gray-300"
              >
                Inferior Centro
              </button>
              <button
                onClick={() => setSignaturePosition({ x: 80, y: 80 })}
                className="bg-gray-200 text-gray-700 py-1 px-2 rounded text-sm hover:bg-gray-300"
              >
                Inferior Direita
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-medium text-gray-700 mb-2">Preview do documento:</h4>
            <div className="relative inline-block">
              <img
                src={URL.createObjectURL(uploadedFile)}
                alt="Documento"
                className="max-w-full max-h-64 rounded-lg shadow-md"
              />
              <div
                className="absolute bg-white bg-opacity-90 border border-gray-300 rounded p-1"
                style={{
                  left: `${signaturePosition.x}%`,
                  top: `${signaturePosition.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <span className="text-xs text-gray-600">Assinatura aqui</span>
              </div>
            </div>
          </div>

          <button
            onClick={applySignature}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Aplicando assinatura...
              </>
            ) : (
              <>
                <PenTool className="h-5 w-5" />
                Aplicar Assinatura
              </>
            )}
          </button>
        </div>
      )}

      {processedImage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">Assinatura aplicada com sucesso!</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Documento assinado:</h4>
              <img
                src={processedImage}
                alt="Documento assinado"
                className="w-full max-w-xs rounded-lg shadow-md"
              />
            </div>
            
            <div className="flex flex-col justify-center">
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

      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={imageCanvasRef} className="hidden" />

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownload}
        defaultFilename="documento-assinado"
        fileExtension="png"
      />
    </div>
  );
};

export default DigitalSignature;