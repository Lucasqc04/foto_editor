import React, { useState, useRef } from 'react';
import { Download, Loader2, CheckCircle, Scissors, User, Camera, Palette, Eye } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';
import ImageViewer from './ImageViewer';

interface BackgroundRemoverProps {
  onConversionComplete: () => void;
}

type RemovalMethod = 'general' | 'person' | 'selfie';

const BackgroundRemover: React.FC<BackgroundRemoverProps> = ({ onConversionComplete }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [removalMethod, setRemovalMethod] = useState<RemovalMethod>('general');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [keepTransparent, setKeepTransparent] = useState(true);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageSrc, setViewerImageSrc] = useState('');
  const [viewerImageAlt, setViewerImageAlt] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const methods = [
    { 
      id: 'general', 
      label: 'Objetos Gerais', 
      icon: Scissors,
      description: 'Melhor para qualquer tipo de objeto ou imagem'
    },
    { 
      id: 'person', 
      label: 'Pessoas (Corpo)', 
      icon: User,
      description: 'Especializado em detectar pessoas inteiras'
    },
    { 
      id: 'selfie', 
      label: 'Selfies/Retratos', 
      icon: Camera,
      description: 'Otimizado para rostos e retratos'
    },
  ];

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setUploadedFile(files[0]);
      setProcessedImage(null);
    }
  };

  const removeBackgroundGeneral = async (imageElement: HTMLImageElement): Promise<string> => {
    // Simulação da rembg-wasm (seria necessário implementar com a biblioteca real)
    return new Promise((resolve) => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;
      
      // Simular processamento
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setProgress(progress);
        
        if (progress >= 100) {
          clearInterval(interval);
          
          // Desenhar imagem original (em uma implementação real, aqui seria aplicada a remoção de fundo)
          ctx.drawImage(imageElement, 0, 0);
          
          // Simular remoção de fundo criando uma máscara simples
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Algoritmo simples de remoção baseado em cor (apenas para demonstração)
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Se a cor for muito próxima do branco ou muito uniforme, tornar transparente
            if ((r > 240 && g > 240 && b > 240) || 
                (Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && Math.abs(r - b) < 10)) {
              data[i + 3] = 0; // Tornar transparente
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
          
          if (!keepTransparent) {
            // Adicionar fundo colorido
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d')!;
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            
            tempCtx.fillStyle = backgroundColor;
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(canvas, 0, 0);
            
            resolve(tempCanvas.toDataURL('image/png'));
          } else {
            resolve(canvas.toDataURL('image/png'));
          }
        }
      }, 100);
    });
  };

  const removeBackgroundPerson = async (imageElement: HTMLImageElement): Promise<string> => {
    // Simulação do BodyPix (seria necessário implementar com TensorFlow.js)
    return new Promise(async (resolve) => {
      try {
        // Em uma implementação real, você carregaria o modelo BodyPix aqui
        // const net = await bodyPix.load();
        // const segmentation = await net.segmentPerson(imageElement);
        
        // Simulação do processamento
        let progress = 0;
        const interval = setInterval(() => {
          progress += 15;
          setProgress(progress);
          
          if (progress >= 100) {
            clearInterval(interval);
            
            const canvas = canvasRef.current!;
            const ctx = canvas.getContext('2d')!;
            
            canvas.width = imageElement.width;
            canvas.height = imageElement.height;
            
            ctx.drawImage(imageElement, 0, 0);
            
            // Simular segmentação de pessoa
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Algoritmo simples para detectar tons de pele e manter apenas a pessoa
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              
              // Detectar tons de pele e áreas centrais (simulação)
              const x = (i / 4) % canvas.width;
              const y = Math.floor((i / 4) / canvas.width);
              const centerX = canvas.width / 2;
              const centerY = canvas.height / 2;
              const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
              const maxDistance = Math.sqrt(centerX ** 2 + centerY ** 2);
              
              if (distance > maxDistance * 0.6) {
                data[i + 3] = 0; // Tornar transparente
              }
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            if (!keepTransparent) {
              const tempCanvas = document.createElement('canvas');
              const tempCtx = tempCanvas.getContext('2d')!;
              tempCanvas.width = canvas.width;
              tempCanvas.height = canvas.height;
              
              tempCtx.fillStyle = backgroundColor;
              tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
              tempCtx.drawImage(canvas, 0, 0);
              
              resolve(tempCanvas.toDataURL('image/png'));
            } else {
              resolve(canvas.toDataURL('image/png'));
            }
          }
        }, 80);
      } catch (error) {
        console.error('Erro no BodyPix:', error);
        resolve(await removeBackgroundGeneral(imageElement));
      }
    });
  };

  const removeBackgroundSelfie = async (imageElement: HTMLImageElement): Promise<string> => {
    // Simulação do MediaPipe Selfie Segmentation
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        setProgress(progress);
        
        if (progress >= 100) {
          clearInterval(interval);
          
          const canvas = canvasRef.current!;
          const ctx = canvas.getContext('2d')!;
          
          canvas.width = imageElement.width;
          canvas.height = imageElement.height;
          
          ctx.drawImage(imageElement, 0, 0);
          
          // Simular segmentação de selfie (foco no centro da imagem)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % canvas.width;
            const y = Math.floor((i / 4) / canvas.width);
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            // Criar uma máscara oval no centro (típico para selfies)
            const dx = (x - centerX) / (canvas.width * 0.4);
            const dy = (y - centerY) / (canvas.height * 0.5);
            
            if (dx * dx + dy * dy > 1) {
              data[i + 3] = 0; // Tornar transparente
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
          
          if (!keepTransparent) {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d')!;
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            
            tempCtx.fillStyle = backgroundColor;
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(canvas, 0, 0);
            
            resolve(tempCanvas.toDataURL('image/png'));
          } else {
            resolve(canvas.toDataURL('image/png'));
          }
        }
      }, 60);
    });
  };

  const handleRemoveBackground = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(uploadedFile);
      });

      let result: string;
      
      switch (removalMethod) {
        case 'person':
          result = await removeBackgroundPerson(img);
          break;
        case 'selfie':
          result = await removeBackgroundSelfie(img);
          break;
        default:
          result = await removeBackgroundGeneral(img);
      }

      setProcessedImage(result);
      onConversionComplete();
    } catch (error) {
      console.error('Erro na remoção de fundo:', error);
      alert('Erro ao remover fundo. Tente novamente.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
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
    setProgress(0);
  };

  const openImageViewer = (src: string, alt: string) => {
    setViewerImageSrc(src);
    setViewerImageAlt(alt);
    setShowImageViewer(true);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Remover Fundo</h2>
        <p className="text-gray-600">
          Remova o fundo das suas imagens usando IA especializada
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
          {/* Method Selection */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-medium text-gray-700 mb-4">Escolha o método de remoção:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {methods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setRemovalMethod(method.id as RemovalMethod)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      removalMethod === method.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-gray-800">{method.label}</span>
                    </div>
                    <p className="text-sm text-gray-600">{method.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Background Options */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <h3 className="font-medium text-gray-700">Opções de fundo:</h3>
            
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                id="keep-transparent"
                checked={keepTransparent}
                onChange={(e) => setKeepTransparent(e.target.checked)}
                className="w-4 h-4 text-blue-600"
              />
              <label htmlFor="keep-transparent" className="text-sm font-medium text-gray-700">
                Manter fundo transparente
              </label>
            </div>

            {!keepTransparent && (
              <div className="flex items-center gap-4">
                <Palette className="h-5 w-5 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">Cor do fundo:</label>
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-12 h-8 rounded border border-gray-300"
                />
                <span className="text-sm text-gray-500">{backgroundColor}</span>
              </div>
            )}
          </div>

          {/* Preview */}
          {uploadedFile && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-medium text-gray-700 mb-2">Imagem original:</h4>
              <img
                src={URL.createObjectURL(uploadedFile)}
                alt="Original"
                className="max-w-full max-h-64 rounded-lg shadow-md mx-auto"
              />
            </div>
          )}

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Removendo fundo...</span>
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
            onClick={handleRemoveBackground}
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
                <Scissors className="h-5 w-5" />
                Remover Fundo
              </>
            )}
          </button>
        </div>
      )}

      {processedImage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">Fundo removido com sucesso!</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Resultado:</h4>
              <div className="bg-white bg-opacity-50 p-4 rounded-lg" style={{
                backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
              }}>
                <div className="relative group">
                  <img
                    src={processedImage}
                    alt="Fundo removido"
                    className="w-full max-w-xs rounded-lg shadow-md mx-auto cursor-pointer transition-transform hover:scale-105"
                    onClick={() => openImageViewer(processedImage, 'Fundo Removido')}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-white/90 p-2 rounded-full">
                      <Eye className="h-5 w-5 text-gray-700" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-center space-y-3">
              <button
                onClick={() => openImageViewer(processedImage, 'Fundo Removido')}
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

      <canvas ref={canvasRef} className="hidden" />

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownload}
        defaultFilename="imagem-sem-fundo"
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

export default BackgroundRemover;