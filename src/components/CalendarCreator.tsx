import React, { useState, useRef } from 'react';
import { Download, Loader2, CheckCircle, Calendar, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';
import ImageViewer from './ImageViewer';

interface CalendarCreatorProps {
  onConversionComplete: () => void;
}

const CalendarCreator: React.FC<CalendarCreatorProps> = ({ onConversionComplete }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageSrc, setViewerImageSrc] = useState('');
  const [viewerImageAlt, setViewerImageAlt] = useState('');
  
  // Calendar settings
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [calendarStyle, setCalendarStyle] = useState<'classic' | 'modern' | 'minimal'>('modern');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [backgroundColor, setBackgroundColor] = useState('rgba(0, 0, 0, 0.6)');
  const [fontSize, setFontSize] = useState(16);
  const [position, setPosition] = useState<'top' | 'bottom' | 'center'>('bottom');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setProcessedImage(null);
    }
  };

  const getDaysInMonth = (month: number, year: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number): number => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarGrid = (month: number, year: number) => {
    const daysInMonth = getDaysInMonth(month, year);
    const firstDay = getFirstDayOfMonth(month, year);
    const grid: (number | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      grid.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      grid.push(day);
    }
    
    return grid;
  };

  const drawCalendar = async () => {
    if (!uploadedFile || !canvasRef.current || !imageRef.current) return;

    setIsProcessing(true);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Load and draw background image
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Set canvas size (A4 proportions)
      canvas.width = 1240;
      canvas.height = 1754;

      // Draw background image (cover fit)
      const canvasAspect = canvas.width / canvas.height;
      const imgAspect = img.width / img.height;
      
      let drawWidth, drawHeight, offsetX, offsetY;
      
      if (imgAspect > canvasAspect) {
        drawHeight = canvas.height;
        drawWidth = img.width * (canvas.height / img.height);
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = canvas.width;
        drawHeight = img.height * (canvas.width / img.width);
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // Apply overlay for better text readability
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate calendar position
      const calendarWidth = 800;
      const calendarHeight = 600;
      const calendarX = (canvas.width - calendarWidth) / 2;
      let calendarY;

      switch (position) {
        case 'top':
          calendarY = 100;
          break;
        case 'center':
          calendarY = (canvas.height - calendarHeight) / 2;
          break;
        case 'bottom':
        default:
          calendarY = canvas.height - calendarHeight - 100;
          break;
      }

      // Draw calendar based on style
      drawCalendarStyle(ctx, calendarX, calendarY, calendarWidth, calendarHeight);

      const dataUrl = canvas.toDataURL('image/png', 0.95);
      setProcessedImage(dataUrl);
      onConversionComplete();
    } catch (error) {
      console.error('Erro ao criar calendário:', error);
      alert('Erro ao criar calendário. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const drawCalendarStyle = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    width: number, 
    height: number
  ) => {
    const grid = generateCalendarGrid(selectedMonth, selectedYear);
    const cellWidth = width / 7;
    const headerHeight = 80;
    const titleHeight = 60;
    const cellHeight = (height - headerHeight - titleHeight) / 6;

    // Calendar background
    if (calendarStyle !== 'minimal') {
      ctx.fillStyle = calendarStyle === 'modern' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(x, y, width, height);
      
      if (calendarStyle === 'modern') {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
      }
    }

    // Title
    ctx.fillStyle = calendarStyle === 'minimal' ? textColor : '#333333';
    ctx.font = `bold ${fontSize + 20}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(
      `${monthNames[selectedMonth]} ${selectedYear}`,
      x + width / 2,
      y + titleHeight / 2 + 10
    );

    // Day headers
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = calendarStyle === 'minimal' ? textColor : '#666666';
    
    dayNames.forEach((day, index) => {
      const dayX = x + index * cellWidth + cellWidth / 2;
      const dayY = y + titleHeight + headerHeight / 2 + 5;
      ctx.fillText(day, dayX, dayY);
    });

    // Draw grid lines for classic/modern styles
    if (calendarStyle !== 'minimal') {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      
      // Vertical lines
      for (let i = 0; i <= 7; i++) {
        const lineX = x + i * cellWidth;
        ctx.beginPath();
        ctx.moveTo(lineX, y + titleHeight);
        ctx.lineTo(lineX, y + height);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let i = 0; i <= 7; i++) {
        const lineY = y + titleHeight + i * cellHeight;
        ctx.beginPath();
        ctx.moveTo(x, lineY);
        ctx.lineTo(x + width, lineY);
        ctx.stroke();
      }
    }

    // Draw days
    ctx.font = `${fontSize + 4}px Arial`;
    ctx.textAlign = 'center';
    
    let row = 0;
    let col = 0;
    
    grid.forEach((day) => {
      if (day !== null) {
        const dayX = x + col * cellWidth + cellWidth / 2;
        const dayY = y + titleHeight + headerHeight + row * cellHeight + cellHeight / 2 + 5;
        
        // Highlight today
        const today = new Date();
        const isToday = day === today.getDate() && 
                       selectedMonth === today.getMonth() && 
                       selectedYear === today.getFullYear();
        
        if (isToday && calendarStyle !== 'minimal') {
          ctx.fillStyle = '#4F46E5';
          ctx.beginPath();
          ctx.arc(dayX, dayY - 5, 20, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'white';
        } else {
          ctx.fillStyle = calendarStyle === 'minimal' ? textColor : '#333333';
        }
        
        ctx.fillText(day.toString(), dayX, dayY);
      }
      
      col++;
      if (col >= 7) {
        col = 0;
        row++;
      }
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

  const handleReset = () => {
    setUploadedFile(null);
    setImageUrl('');
    setProcessedImage(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  };

  const openImageViewer = (src: string, alt: string) => {
    setViewerImageSrc(src);
    setViewerImageAlt(alt);
    setShowImageViewer(true);
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Criador de Calendários Personalizados</h2>
        <p className="text-gray-600">
          Crie calendários mensais elegantes usando suas imagens como fundo
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
          {/* Calendar Settings */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-6">
            <h3 className="font-medium text-gray-700">Configurações do Calendário</h3>
            
            {/* Month/Year Selection */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => changeMonth('prev')}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-800">
                  {monthNames[selectedMonth]} {selectedYear}
                </div>
                <div className="text-sm text-gray-600">
                  Clique nas setas para navegar
                </div>
              </div>
              
              <button
                onClick={() => changeMonth('next')}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Style Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estilo do Calendário
                </label>
                <select
                  value={calendarStyle}
                  onChange={(e) => setCalendarStyle(e.target.value as 'classic' | 'modern' | 'minimal')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="modern">Moderno</option>
                  <option value="classic">Clássico</option>
                  <option value="minimal">Minimalista</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posição
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as 'top' | 'bottom' | 'center')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="top">Superior</option>
                  <option value="center">Centro</option>
                  <option value="bottom">Inferior</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamanho da Fonte: {fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor do Texto
                </label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opacidade do Fundo
                </label>
                <select
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="rgba(0, 0, 0, 0.3)">Leve (30%)</option>
                  <option value="rgba(0, 0, 0, 0.6)">Médio (60%)</option>
                  <option value="rgba(0, 0, 0, 0.8)">Forte (80%)</option>
                  <option value="rgba(255, 255, 255, 0.8)">Branco (80%)</option>
                </select>
              </div>
            </div>

            {/* Preview Image */}
            {imageUrl && (
              <div className="text-center">
                <h4 className="font-medium text-gray-700 mb-2">Preview da Imagem de Fundo:</h4>
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="max-h-48 rounded-lg shadow-md mx-auto cursor-pointer"
                  onClick={() => openImageViewer(imageUrl, 'Imagem de fundo')}
                />
              </div>
            )}
          </div>

          <button
            onClick={drawCalendar}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Criando calendário...
              </>
            ) : (
              <>
                <Calendar className="h-5 w-5" />
                Gerar Calendário
              </>
            )}
          </button>
        </div>
      )}

      {processedImage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">Calendário criado com sucesso!</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Calendário de {monthNames[selectedMonth]} {selectedYear}:</h4>
              <div className="relative group">
                <img
                  src={processedImage}
                  alt="Calendário personalizado"
                  className="w-full max-w-xs rounded-lg shadow-md cursor-pointer transition-transform hover:scale-105"
                  onClick={() => openImageViewer(processedImage, 'Calendário personalizado')}
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
                onClick={() => openImageViewer(processedImage, 'Calendário personalizado')}
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
                Baixar Calendário
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
      <img ref={imageRef} className="hidden" alt="" />

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownload}
        defaultFilename={`calendario-${monthNames[selectedMonth].toLowerCase()}-${selectedYear}`}
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

export default CalendarCreator;
