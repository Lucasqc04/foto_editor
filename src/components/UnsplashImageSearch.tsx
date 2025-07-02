import React, { useState, useRef } from 'react';
import { Search, Download, Loader2, Image as ImageIcon, Heart, Eye, ExternalLink, Grid, List, Filter, X, Check, Info } from 'lucide-react';
import { createApi } from 'unsplash-js';

interface UnsplashImageSearchProps {
  onConversionComplete: () => void;
}

interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  width: number;
  height: number;
  likes: number;
  user: {
    name: string;
    username: string;
    profile_image: {
      small: string;
    };
  };
  links: {
    html: string;
    download: string;
  };
  tags?: Array<{ title: string }>;
}

const unsplash = createApi({
  accessKey: import.meta.env.VITE_UNSPLASH_ACCESS_KEY,
});

const UnsplashImageSearch: React.FC<UnsplashImageSearchProps> = ({ onConversionComplete }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnsplashImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedOrientation, setSelectedOrientation] = useState<'all' | 'landscape' | 'portrait' | 'squarish'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [downloadedImages, setDownloadedImages] = useState<Set<string>>(new Set());
  const [selectedImage, setSelectedImage] = useState<UnsplashImage | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { value: 'all', label: 'Todas as Categorias' },
    { value: 'nature', label: 'Natureza' },
    { value: 'people', label: 'Pessoas' },
    { value: 'technology', label: 'Tecnologia' },
    { value: 'business', label: 'Negócios' },
    { value: 'food', label: 'Comida' },
    { value: 'travel', label: 'Viagem' },
    { value: 'architecture', label: 'Arquitetura' },
    { value: 'animals', label: 'Animais' },
    { value: 'sports', label: 'Esportes' },
    { value: 'art', label: 'Arte' },
    { value: 'wallpapers', label: 'Wallpapers' }
  ];

  const popularSearches = [
    'natureza', 'paisagem', 'tecnologia', 'negócios', 'pessoas',
    'comida', 'viagem', 'animais', 'arte', 'esportes', 'arquitetura'
  ];

  const searchImages = async (query: string, page: number = 1, resetResults: boolean = true) => {
    if (!query.trim()) return;

    setIsSearching(true);
    
    try {
      const searchParams: any = {
        query: selectedCategory === 'all' ? query : `${query} ${selectedCategory}`,
        page,
        perPage: 20,
        orientation: selectedOrientation === 'all' ? undefined : selectedOrientation,
        contentFilter: 'high'
      };

      const result = await unsplash.search.getPhotos(searchParams);
      
      if (result.errors) {
        console.error('Unsplash API errors:', result.errors);
        alert('Erro ao buscar imagens. Verifique sua conexão e tente novamente.');
        return;
      }

      const photos = result.response?.results || [];
      
      if (resetResults) {
        setSearchResults(photos);
        setCurrentPage(1);
      } else {
        setSearchResults(prev => [...prev, ...photos]);
      }
      
      setTotalPages(result.response?.total_pages || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Erro na busca:', error);
      alert('Erro ao conectar com o Unsplash. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) return;
    
    setSearchQuery(searchTerm);
    searchImages(searchTerm, 1, true);
  };

  const loadMoreImages = () => {
    if (currentPage < totalPages && !isSearching) {
      searchImages(searchQuery, currentPage + 1, false);
    }
  };

  const downloadImage = async (image: UnsplashImage, quality: 'thumb' | 'small' | 'regular' | 'full' = 'regular') => {
    setIsDownloading(image.id);
    
    try {
      // Trigger download endpoint on Unsplash (required by their API)
      await unsplash.photos.trackDownload({ downloadLocation: image.links.download });
      
      // Download the image
      const response = await fetch(image.urls[quality]);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const filename = `unsplash-${image.id}-${image.user.username}.jpg`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      
      // Mark as downloaded
      setDownloadedImages(prev => new Set([...prev, image.id]));
      onConversionComplete();
      
    } catch (error) {
      console.error('Erro no download:', error);
      alert('Erro ao baixar a imagem. Tente novamente.');
    } finally {
      setIsDownloading(null);
    }
  };

  const openImageDetails = (image: UnsplashImage) => {
    setSelectedImage(image);
  };

  const closeImageDetails = () => {
    setSelectedImage(null);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header mais discreto */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Banco de Imagens Unsplash</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Pesquise e baixe imagens de alta qualidade do Unsplash. 
          Mais de 4 milhões de fotos gratuitas e livres de direitos autorais.
        </p>
      </div>

      {/* Search Section */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="space-y-4">
          {/* Main Search */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Pesquisar imagens... (ex: paisagem, tecnologia, pessoas)"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={isSearching || !searchQuery.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  Buscar
                </>
              )}
            </button>
          </div>

          {/* Popular Searches */}
          <div>
            <p className="text-sm text-gray-600 mb-2">Pesquisas populares:</p>
            <div className="flex flex-wrap gap-2">
              {popularSearches.map((term) => (
                <button
                  key={term}
                  onClick={() => handleSearch(term)}
                  className="text-xs bg-white text-gray-700 px-3 py-1 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors border"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="h-4 w-4 inline mr-1" />
                Categoria:
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Orientação:
              </label>
              <select
                value={selectedOrientation}
                onChange={(e) => setSelectedOrientation(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">Todas</option>
                <option value="landscape">Paisagem</option>
                <option value="portrait">Retrato</option>
                <option value="squarish">Quadrada</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visualização:
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                  Grade
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <List className="h-4 w-4" />
                  Lista
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {searchResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Resultados da pesquisa "{searchQuery}"
            </h3>
            <div className="text-sm text-gray-600">
              {searchResults.length} imagens carregadas
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {searchResults.map((image) => (
                <div key={image.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative group">
                    <img
                      src={image.urls.small}
                      alt={image.alt_description || image.description || 'Imagem do Unsplash'}
                      className="w-full h-48 object-cover cursor-pointer"
                      onClick={() => openImageDetails(image)}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openImageDetails(image)}
                          className="bg-white text-gray-800 p-2 rounded-full hover:bg-gray-100 transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => downloadImage(image)}
                          disabled={isDownloading === image.id}
                          className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
                          title="Baixar imagem"
                        >
                          {isDownloading === image.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : downloadedImages.has(image.id) ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <img
                        src={image.user.profile_image.small}
                        alt={image.user.name}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {image.user.name}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {formatNumber(image.likes)}
                      </div>
                      <div>
                        {image.width} × {image.height}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {searchResults.map((image) => (
                <div key={image.id} className="bg-white rounded-lg shadow-md p-4 flex gap-4">
                  <img
                    src={image.urls.small}
                    alt={image.alt_description || image.description || 'Imagem do Unsplash'}
                    className="w-24 h-24 object-cover rounded-lg cursor-pointer"
                    onClick={() => openImageDetails(image)}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <img
                        src={image.user.profile_image.small}
                        alt={image.user.name}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="font-medium text-gray-700">
                        {image.user.name}
                      </span>
                    </div>
                    
                    {(image.description || image.alt_description) && (
                      <p className="text-sm text-gray-600 mb-2">
                        {image.description || image.alt_description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {formatNumber(image.likes)}
                        </div>
                        <div>
                          {image.width} × {image.height}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => openImageDetails(image)}
                          className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Detalhes
                        </button>
                        <button
                          onClick={() => downloadImage(image)}
                          disabled={isDownloading === image.id}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {isDownloading === image.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : downloadedImages.has(image.id) ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                          {downloadedImages.has(image.id) ? 'Baixado' : 'Baixar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {currentPage < totalPages && (
            <div className="text-center mt-6">
              <button
                onClick={loadMoreImages}
                disabled={isSearching}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    Carregar mais imagens
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {searchResults.length === 0 && searchQuery && !isSearching && (
        <div className="text-center py-12">
          <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Nenhuma imagem encontrada
          </h3>
          <p className="text-gray-500 mb-4">
            Tente usar palavras-chave diferentes ou mais gerais
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSearchResults([]);
              searchInputRef.current?.focus();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Nova pesquisa
          </button>
        </div>
      )}

      {/* Empty State */}
      {searchResults.length === 0 && !searchQuery && (
        <div className="text-center py-12">
          <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Pesquise por imagens incríveis
          </h3>
          <p className="text-gray-500 mb-4">
            Digite uma palavra-chave para encontrar imagens de alta qualidade do Unsplash
          </p>
          <div className="text-sm text-gray-400">
            💡 Dica: Use termos em inglês para melhores resultados
          </div>
        </div>
      )}

      {/* Image Details Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <img
                  src={selectedImage.user.profile_image.small}
                  alt={selectedImage.user.name}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <h3 className="font-medium text-gray-800">
                    {selectedImage.user.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    @{selectedImage.user.username}
                  </p>
                </div>
              </div>
              <button
                onClick={closeImageDetails}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Image */}
            <div className="flex-1 overflow-auto">
              <img
                src={selectedImage.urls.regular}
                alt={selectedImage.alt_description || selectedImage.description || 'Imagem do Unsplash'}
                className="w-full h-auto"
              />
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {formatNumber(selectedImage.likes)} curtidas
                  </div>
                  <div>
                    {selectedImage.width} × {selectedImage.height} pixels
                  </div>
                </div>
                <a
                  href={selectedImage.links.html}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver no Unsplash
                </a>
              </div>

              {(selectedImage.description || selectedImage.alt_description) && (
                <p className="text-sm text-gray-700 mb-3">
                  {selectedImage.description || selectedImage.alt_description}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => downloadImage(selectedImage, 'small')}
                  disabled={isDownloading === selectedImage.id}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm font-medium"
                >
                  Baixar Pequena
                </button>
                <button
                  onClick={() => downloadImage(selectedImage, 'regular')}
                  disabled={isDownloading === selectedImage.id}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {isDownloading === selectedImage.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    'Baixar Média'
                  )}
                </button>
                <button
                  onClick={() => downloadImage(selectedImage, 'full')}
                  disabled={isDownloading === selectedImage.id}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                >
                  Baixar Grande
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnsplashImageSearch;
        