import { useState } from 'react';
import { ImageIcon, FileText, Compass as Compress, Palette, Heart, Scissors, Video, Layers, Package, Camera, Grid, Eraser, Sparkles, Brush, Ruler, PenTool, Zap, ScanLine, Languages, Copy, Calendar as CalendarIcon, ShieldCheck, Search } from 'lucide-react';
import Header from './components/Header';
import IntelligentSearch from './components/IntelligentSearch';
import ConversionTabs from './components/ConversionTabs';
import ImageConverter from './components/ImageConverter';
import ImageToPdf from './components/ImageToPdf';
import ImageResizer from './components/ImageResizer';
import AdvancedImageEditor from './components/AdvancedImageEditor';
import VideoConverter from './components/VideoConverter';
import PdfTools from './components/PdfTools';
import BatchProcessor from './components/BatchProcessor';
import WebcamCapture from './components/WebcamCapture';
import ImageCollage from './components/ImageCollage';
import BackgroundRemover from './components/BackgroundRemover';
import ImageEnhancer from './components/ImageEnhancer';
import ColorExtractor from './components/ColorExtractor';
import DigitalSignature from './components/DigitalSignature';
import ObjectRemover from './components/ObjectRemover';
import PixelMeasurer from './components/PixelMeasurer';
import ArtisticStyler from './components/ArtisticStyler';
import DocumentScanner from './components/DocumentScanner';
import TextTranslator from './components/TextTranslator';
import DuplicateImageDetector from './components/DuplicateImageDetector';
import CalendarCreator from './components/CalendarCreator';
import SensitiveTextDetector from './components/SensitiveTextDetector';
import UnsplashImageSearch from './components/UnsplashImageSearch';
import EtiquetaML from './components/EtiquetaML';
import DonationButton from './components/DonationButton';

type ConversionType = 'convert' | 'pdf' | 'resize' | 'edit' | 'video' | 'pdf-tools' | 'batch' | 'webcam' | 'collage' | 'remove-bg' | 'enhance' | 'colors' | 'signature' | 'object-remove' | 'measure' | 'artistic' | 'scanner' | 'translate' | 'duplicate-detector' | 'calendar-creator' | 'sensitive-text-detector' | 'unsplash-search' | 'etiqueta-ml';

function App() {
  const [activeTab, setActiveTab] = useState<ConversionType>('convert');
  const [showDonation, setShowDonation] = useState(false);

  const tabs = [
    { id: 'convert', label: 'Converter Formato', icon: ImageIcon },
    { id: 'pdf', label: 'Imagem para PDF', icon: FileText },
    { id: 'resize', label: 'Redimensionar/Comprimir', icon: Compress },
    { id: 'translate', label: 'Extrair Texto & Traduzir', icon: Languages },
    { id: 'unsplash-search', label: 'Buscar Imagens Unsplash', icon: Search },
    { id: 'edit', label: 'Editor Avançado', icon: Scissors },
    { id: 'remove-bg', label: 'Remover Fundo', icon: Eraser },
    { id: 'enhance', label: 'Melhorar Qualidade', icon: Sparkles },
    { id: 'colors', label: 'Paleta de Cores', icon: Palette },
    { id: 'signature', label: 'Assinatura Digital', icon: PenTool },
    { id: 'object-remove', label: 'Remover Objetos', icon: Brush },
    { id: 'measure', label: 'Medidas por Pixel', icon: Ruler },
    { id: 'artistic', label: 'Estilo Artístico', icon: Zap },
    { id: 'scanner', label: 'Scanner Documentos', icon: ScanLine },
    { id: 'duplicate-detector', label: 'Detectar Duplicatas', icon: Copy },
    { id: 'calendar-creator', label: 'Calendário Personalizado', icon: CalendarIcon },
    { id: 'sensitive-text-detector', label: 'Proteger Dados Sensíveis', icon: ShieldCheck },
    { id: 'video', label: 'Vídeo & GIF', icon: Video },
    { id: 'pdf-tools', label: 'Ferramentas PDF', icon: Layers },
    { id: 'batch', label: 'Processamento em Lote', icon: Package },
    { id: 'webcam', label: 'Captura Webcam', icon: Camera },
    { id: 'collage', label: 'Colagem de Imagens', icon: Grid },
    { id: 'etiqueta-ml', label: 'Etiqueta ML', icon: FileText },
  ];

  const handleConversionComplete = () => {
    setShowDonation(true);
  };

  const handleSearchSelection = (componentId: string) => {
    setActiveTab(componentId as ConversionType);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />
      
      <IntelligentSearch onSelectComponent={handleSearchSelection} />
      
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-2 md:mb-4">
            Conversor de Imagens Pro
          </h1>
          <p className="text-sm md:text-lg text-gray-600 max-w-4xl mx-auto mb-6">
            Suite completa de ferramentas para imagens, PDFs e vídeos. 
            Converta, edite, comprima e processe seus arquivos com qualidade profissional.
          </p>

          {/* Destaque sutil para Busca de Imagens */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Search className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Precisa de imagens? Use o banco do Unsplash com milhões de fotos gratuitas
              </span>
            </div>
            <button
              onClick={() => setActiveTab('unsplash-search')}
              className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Pesquisar Imagens
            </button>
          </div>
        </div>

        <ConversionTabs 
          tabs={tabs.filter(tab => tab.id !== 'unsplash-search')} 
          activeTab={activeTab} 
          onTabChange={(tab) => setActiveTab(tab as ConversionType)} 
        />

        <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 mb-6 md:mb-8">
          {activeTab === 'convert' && (
            <ImageConverter onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'pdf' && (
            <ImageToPdf onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'resize' && (
            <ImageResizer onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'translate' && (
            <TextTranslator onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'edit' && (
            <AdvancedImageEditor onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'remove-bg' && (
            <BackgroundRemover onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'enhance' && (
            <ImageEnhancer onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'colors' && (
            <ColorExtractor onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'signature' && (
            <DigitalSignature onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'object-remove' && (
            <ObjectRemover onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'measure' && (
            <PixelMeasurer onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'artistic' && (
            <ArtisticStyler onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'scanner' && (
            <DocumentScanner onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'duplicate-detector' && (
            <DuplicateImageDetector onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'calendar-creator' && (
            <CalendarCreator onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'sensitive-text-detector' && (
            <SensitiveTextDetector onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'video' && (
            <VideoConverter onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'pdf-tools' && (
            <PdfTools onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'batch' && (
            <BatchProcessor onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'webcam' && (
            <WebcamCapture onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'collage' && (
            <ImageCollage onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'unsplash-search' && (
            <UnsplashImageSearch onConversionComplete={handleConversionComplete} />
          )}
          {activeTab === 'etiqueta-ml' && (
            <EtiquetaML />
          )}
        </div>

        {showDonation && (
          <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50">
            <DonationButton onClose={() => setShowDonation(false)} />
          </div>
        )}
      </main>

      <footer className="bg-gray-800 text-white py-6 md:py-8 mt-12 md:mt-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-5 w-5 text-red-400" />
            <span className="text-base md:text-lg">Feito com amor para a comunidade</span>
          </div>
          <p className="text-gray-400 mb-2 text-sm md:text-base">
            Conversor de Imagens Pro - Todas as conversões são feitas localmente no seu navegador
          </p>
          <p className="text-xs md:text-sm text-gray-500">
            🔒 Privacidade total • 🚀 Processamento local • 💯 Gratuito e sem anúncios
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;