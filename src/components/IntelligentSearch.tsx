import React, { useState, useRef, useEffect } from 'react';
import { Search, X, TrendingUp, Zap } from 'lucide-react';
import { searchComponents, getPopularSuggestions, ComponentConfig } from '../utils/searchConfig';

interface IntelligentSearchProps {
  onSelectComponent: (componentId: string) => void;
}

// Função para destacar termos de pesquisa
const highlightSearchTerms = (text: string, searchQuery: string): JSX.Element => {
  if (!searchQuery.trim()) return <span>{text}</span>;

  // Escapa caracteres especiais do regex
  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
  
  return (
    <span>
      {parts.map((part, index) =>
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
};

const IntelligentSearch: React.FC<IntelligentSearchProps> = ({ onSelectComponent }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ComponentConfig[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const popularSuggestions = getPopularSuggestions();

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Busca inteligente com debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(() => {
      const searchResults = searchComponents(query);
      setResults(searchResults);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
  };

  const handleSelectComponent = (componentId: string) => {
    onSelectComponent(componentId);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {/* Título da pesquisa */}
          <div className="text-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">
              O que você precisa fazer hoje?
            </h2>
            <p className="text-sm text-gray-600">
              Pesquise por formato, funcionalidade ou ferramenta
            </p>
          </div>

          {/* Campo de pesquisa */}
          <div ref={searchRef} className="relative">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder="Ex: converter png, remover fundo, pdf, redimensionar..."
                className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-700 placeholder-gray-400"
              />
              {query && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Dropdown de resultados */}
            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-[70vh] overflow-y-auto">
                {/* Loading */}
                {isLoading && (
                  <div className="p-4 text-center">
                    <div className="inline-flex items-center gap-2 text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                      Pesquisando...
                    </div>
                  </div>
                )}

                {/* Resultados da pesquisa */}
                {!isLoading && results.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 px-3 py-2 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {results.length} resultado{results.length > 1 ? 's' : ''} encontrado{results.length > 1 ? 's' : ''}
                    </div>
                    {results.map((component) => {
                      const Icon = component.icon;
                      return (
                        <button
                          key={component.id}
                          onClick={() => handleSelectComponent(component.id)}
                          className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-all duration-200 group border border-transparent hover:border-blue-100"
                        >
                          <div className="flex items-start gap-3">
                            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors mb-1">
                                {highlightSearchTerms(component.title, query)}
                              </h3>
                              <p className="text-sm text-gray-600 line-clamp-2 overflow-hidden mb-2">
                                {highlightSearchTerms(component.description, query)}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {component.fileFormats.slice(0, 5).map((format) => (
                                  <span
                                    key={format}
                                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-blue-100 hover:text-blue-700 transition-colors"
                                  >
                                    {format.toUpperCase()}
                                  </span>
                                ))}
                                {component.fileFormats.length > 5 && (
                                  <span className="text-xs text-gray-400 px-1">
                                    +{component.fileFormats.length - 5}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Nenhum resultado encontrado */}
                {!isLoading && query && results.length === 0 && (
                  <div className="p-6 text-center">
                    <div className="text-gray-400 mb-2">
                      <Search className="h-8 w-8 mx-auto" />
                    </div>
                    <p className="text-gray-600 font-medium">Nenhum resultado encontrado</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Tente termos como "png", "pdf", "remover fundo" ou "redimensionar"
                    </p>
                  </div>
                )}

                {/* Sugestões populares (quando não há pesquisa) */}
                {!isLoading && !query && (
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 px-3 py-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Pesquisas populares
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {popularSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => handleSelectSuggestion(suggestion)}
                          className="text-left p-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600 hover:text-blue-600"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dicas rápidas */}
          {!isOpen && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {['PNG', 'PDF', 'Fundo', 'Comprimir', 'OCR', 'GIF'].map((tip) => (
                <button
                  key={tip}
                  onClick={() => handleSelectSuggestion(tip.toLowerCase())}
                  className="text-xs bg-white text-gray-600 px-3 py-1 rounded-full border border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {tip}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntelligentSearch;
