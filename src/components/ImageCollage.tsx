import React, { useState, useRef } from 'react';
import { Download, Loader2, CheckCircle, Grid, Layers, Plus, Eye } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';
import ImageViewer from './ImageViewer';

interface ImageCollageProps {
  onConversionComplete: () => void;
}

type CollageLayout = 'grid' | 'horizontal' | 'vertical' | 'mosaic';

const ImageCollage: React.FC<ImageCollageProps> = ({ onConversionComplete }) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [layout, setLayout] = useState<CollageLayout>('grid');
  const [spacing, setSpacing] = useState(10);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageSrc, setViewerImageSrc] = useState('');
  const [viewerImageAlt, setViewerImageAlt] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const layouts = [
    { id: 'grid', label: 'Grade', icon: Grid },
    { id: 'horizontal', label: 'Horizontal', icon: Layers },
    { id: 'vertical', label: 'Vertical', icon: Layers },
    { id: 'mosaic', label: 'Mosaico', icon: Plus },
  ];

  const handleFileSelect = (files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
    setProcessedImage(null);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const createCollage = async () => {
    if (uploadedFiles.length === 0) return;

    setIsProcessing(true);
    
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas não encontrado');

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Contexto do canvas não encontrado');

      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;

      // Fill background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load all images
      const images = await Promise.all(uploadedFiles.map(loadImage));

      switch (layout) {
        case 'grid':
          await createGridLayout(ctx, images);
          break;
        case 'horizontal':
          await createHorizontalLayout(ctx, images);
          break;
        case 'vertical':
          await createVerticalLayout(ctx, images);
          break;
        case 'mosaic':
          await createMosaicLayout(ctx, images);
          break;
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setProcessedImage(dataUrl);
      onConversionComplete();
    } catch (error) {
      console.error('Erro ao criar colagem:', error);
      alert('Erro ao criar colagem. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const createGridLayout = async (ctx: CanvasRenderingContext2D, images: HTMLImageElement[]) => {
    const cols = Math.ceil(Math.sqrt(images.length));
    const rows = Math.ceil(images.length / cols);
    
    const cellWidth = (canvasSize.width - spacing * (cols + 1)) / cols;
    const cellHeight = (canvasSize.height - spacing * (rows + 1)) / rows;

    images.forEach((img, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      
      const x = spacing + col * (cellWidth + spacing);
      const y = spacing + row * (cellHeight + spacing);
      
      // Calculate scale to fit image in cell while maintaining aspect ratio
      const scale = Math.min(cellWidth / img.width, cellHeight / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      
      // Center image in cell
      const offsetX = (cellWidth - scaledWidth) / 2;
      const offsetY = (cellHeight - scaledHeight) / 2;
      
      ctx.drawImage(img, x + offsetX, y + offsetY, scaledWidth, scaledHeight);
    });
  };

  const createHorizontalLayout = async (ctx: CanvasRenderingContext2D, images: HTMLImageElement[]) => {
    const totalSpacing = spacing * (images.length + 1);
    const availableWidth = canvasSize.width - totalSpacing;
    const cellWidth = availableWidth / images.length;
    const cellHeight = canvasSize.height - 2 * spacing;

    images.forEach((img, index) => {
      const x = spacing + index * (cellWidth + spacing);
      const y = spacing;
      
      const scale = Math.min(cellWidth / img.width, cellHeight / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      
      const offsetX = (cellWidth - scaledWidth) / 2;
      const offsetY = (cellHeight - scaledHeight) / 2;
      
      ctx.drawImage(img, x + offsetX, y + offsetY, scaledWidth, scaledHeight);
    });
  };

  const createVerticalLayout = async (ctx: CanvasRenderingContext2D, images: HTMLImageElement[]) => {
    const totalSpacing = spacing * (images.length + 1);
    const availableHeight = canvasSize.height - totalSpacing;
    const cellHeight = availableHeight / images.length;
    const cellWidth = canvasSize.width - 2 * spacing;

    images.forEach((img, index) => {
      const x = spacing;
      const y = spacing + index * (cellHeight + spacing);
      
      const scale = Math.min(cellWidth / img.width, cellHeight / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      
      const offsetX = (cellWidth - scaledWidth) / 2;
      const offsetY = (cellHeight - scaledHeight) / 2;
      
      ctx.drawImage(img, x + offsetX, y + offsetY, scaledWidth, scaledHeight);
    });
  };

  const createMosaicLayout = async (ctx: CanvasRenderingContext2D, images: HTMLImageElement[]) => {
    // Random mosaic layout
    const positions: Array<{x: number, y: number, width: number, height: number}> = [];
    
    images.forEach((img, index) => {
      const maxWidth = canvasSize.width / 3;
      const maxHeight = canvasSize.height / 3;
      
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
      const width = img.width * scale;
      const height = img.height * scale;
      
      let x, y;
      let attempts = 0;
      
      do {
        x = Math.random() * (canvasSize.width - width);
        y = Math.random() * (canvasSize.height - height);
        attempts++;
      } while (attempts < 50 && positions.some(pos => 
        x < pos.x + pos.width + spacing &&
        x + width + spacing > pos.x &&
        y < pos.y + pos.height + spacing &&
        y + height + spacing > pos.y
      ));
      
      positions.push({ x, y, width, height });
      ctx.drawImage(img, x, y, width, height);
      
      // Add border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
    });
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

  const openImageViewer = (src: string, alt: string) => {
    setViewerImageSrc(src);
    setViewerImageAlt(alt);
    setShowImageViewer(true);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Colagem de Imagens</h2>
        <p className="text-gray-600">
          Crie colagens personalizadas com suas imagens
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
        <div className="bg-gray-50 rounded-xl p-6 space-y-6">
          {/* Layout Selection */}
          <div>
            <h3 className="font-medium text-gray-700 mb-3">Layout da Colagem</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {layouts.map((layoutOption) => {
                const Icon = layoutOption.icon;
                return (
                  <button
                    key={layoutOption.id}
                    onClick={() => setLayout(layoutOption.id as CollageLayout)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg font-medium transition-all ${
                      layout === layoutOption.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    {layoutOption.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Espaçamento: {spacing}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={spacing}
                  onChange={(e) => setSpacing(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor de fundo
                </label>
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-full h-10 rounded border border-gray-300"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Largura do canvas
                </label>
                <input
                  type="number"
                  value={canvasSize.width}
                  onChange={(e) => setCanvasSize(prev => ({ ...prev, width: parseInt(e.target.value) || 1200 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Altura do canvas
                </label>
                <input
                  type="number"
                  value={canvasSize.height}
                  onChange={(e) => setCanvasSize(prev => ({ ...prev, height: parseInt(e.target.value) || 800 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <button
            onClick={createCollage}
            disabled={isProcessing || uploadedFiles.length === 0}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Criando colagem...
              </>
            ) : (
              <>
                <Layers className="h-5 w-5" />
                Criar Colagem
              </>
            )}
          </button>
        </div>
      )}

      {processedImage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">Colagem criada com sucesso!</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Preview:</h4>
              <div className="relative group">
                <img
                  src={processedImage}
                  alt="Colagem criada"
                  className="w-full rounded-lg shadow-md cursor-pointer transition-transform hover:scale-105"
                  onClick={() => openImageViewer(processedImage, 'Colagem Criada')}
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
                onClick={() => openImageViewer(processedImage, 'Colagem Criada')}
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
                Baixar Colagem
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
        defaultFilename="colagem-imagens"
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

export default ImageCollage;