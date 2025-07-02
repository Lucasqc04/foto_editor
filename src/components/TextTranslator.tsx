import React, { useState } from 'react';
import { Download, Loader2, CheckCircle, Languages, Copy, AlertCircle } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';
import { extractTextFromImage } from '../utils/ocrUtils';

interface TextTranslatorProps {
  onConversionComplete: () => void;
}

const TextTranslator: React.FC<TextTranslatorProps> = ({ onConversionComplete }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('pt');
  const [progress, setProgress] = useState(0);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [translationError, setTranslationError] = useState<string>('');

  const languages = [
    { code: 'auto', name: 'Detectar automaticamente' },
    { code: 'en', name: 'Inglês' },
    { code: 'pt', name: 'Português' },
    { code: 'es', name: 'Espanhol' },
    { code: 'fr', name: 'Francês' },
    { code: 'de', name: 'Alemão' },
    { code: 'it', name: 'Italiano' },
    { code: 'ja', name: 'Japonês' },
    { code: 'ko', name: 'Coreano' },
    { code: 'zh', name: 'Chinês' },
    { code: 'ar', name: 'Árabe' },
    { code: 'ru', name: 'Russo' },
    { code: 'hi', name: 'Hindi' },
    { code: 'nl', name: 'Holandês' },
    { code: 'sv', name: 'Sueco' },
    { code: 'da', name: 'Dinamarquês' },
    { code: 'no', name: 'Norueguês' },
    { code: 'fi', name: 'Finlandês' },
  ];

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setUploadedFile(files[0]);
      setExtractedText('');
      setTranslatedText('');
      setProgress(0);
    }
  };

  const extractAndTranslate = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    setProgress(0);
    setTranslationError('');

    try {
      // Step 1: Extract text using OCR
      setProgress(10);
      const text = await extractTextFromImage(uploadedFile, (ocrProgress) => {
        setProgress(10 + (ocrProgress * 0.4)); // OCR takes 40% of progress
      });
      
      setExtractedText(text);
      setProgress(50);

      if (!text.trim()) {
        alert('Nenhum texto foi encontrado na imagem.');
        setIsProcessing(false);
        return;
      }

      // Step 2: Translate text
      setProgress(60);
      const translationResult = await translateText(text, sourceLanguage, targetLanguage);
      setTranslatedText(translationResult.translatedText);
      setDetectedLanguage(translationResult.detectedLang || '');
      setProgress(100);

      onConversionComplete();
    } catch (error) {
      console.error('Erro no processo:', error);
      setTranslationError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const translateText = async (text: string, from: string, to: string): Promise<{translatedText: string, detectedLang?: string}> => {
    if (text.trim().length === 0) {
      throw new Error('Texto vazio para tradução');
    }

    // Normalizar códigos de idioma para compatibilidade
    const normalizeLanguageCode = (code: string): string => {
      const langMap: { [key: string]: string } = {
        'zh': 'zh-CN',
        'auto': 'auto'
      };
      return langMap[code] || code;
    };

    const normalizedFrom = normalizeLanguageCode(from);
    const normalizedTo = normalizeLanguageCode(to);

    // Dividir texto em chunks menores se for muito longo
    const maxChunkSize = 400;
    const chunks: string[] = [];
    
    if (text.length > maxChunkSize) {
      const sentences = text.split(/[.!?;]+/);
      let currentChunk = '';
      
      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;
        
        if (currentChunk.length + trimmedSentence.length > maxChunkSize && currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = trimmedSentence;
        } else {
          currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
        }
      }
      
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
    } else {
      chunks.push(text.trim());
    }

    // Tentar diferentes APIs em sequência
    const translationMethods = [
      () => translateWithMyMemory(chunks, normalizedFrom, normalizedTo),
      () => translateWithGoogleTranslateAPI(chunks, normalizedFrom, normalizedTo),
      () => translateWithMicrosoftTranslator(chunks, normalizedFrom, normalizedTo)
    ];

    for (const translateMethod of translationMethods) {
      try {
        return await translateMethod();
      } catch (error) {
        console.warn('Tentativa de tradução falhou:', error);
        continue;
      }
    }

    throw new Error('Todos os serviços de tradução falharam. Tente novamente mais tarde.');
  };

  const translateWithMyMemory = async (chunks: string[], from: string, to: string): Promise<{translatedText: string, detectedLang?: string}> => {
    const translatedChunks = [];
    let detectedLang = '';

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Corrigir formato do langpair
      let langPair: string;
      if (from === 'auto') {
        langPair = to; // Para detecção automática, usar apenas o idioma de destino
      } else {
        langPair = `${from}|${to}`; // Formato correto: origem|destino
      }
      
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${langPair}&mt=1`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro na API MyMemory: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.responseStatus !== 200 && data.responseStatus !== '200') {
        throw new Error(data.responseDetails || 'Erro na tradução MyMemory');
      }

      translatedChunks.push(data.responseData.translatedText);
      
      // Capturar idioma detectado
      if (i === 0 && from === 'auto') {
        if (data.responseData.match && data.responseData.match.includes('|')) {
          detectedLang = data.responseData.match.split('|')[0];
        } else {
          // Tentar detectar através de outras propriedades
          detectedLang = data.detectedLanguage || '';
        }
      }

      // Delay entre requests
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return {
      translatedText: translatedChunks.join('. '),
      detectedLang
    };
  };

  const translateWithGoogleTranslateAPI = async (chunks: string[], from: string, to: string): Promise<{translatedText: string, detectedLang?: string}> => {
    const translatedChunks: string[] = [];
    let detectedLang = '';

    for (const chunk of chunks) {
      // Usar API pública do Google Translate (sem CORS)
      const sourceLang = from === 'auto' ? 'auto' : from;
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${to}&dt=t&dt=bd&dj=1&q=${encodeURIComponent(chunk)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro na API Google Translate: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.sentences || !Array.isArray(data.sentences)) {
        throw new Error('Resposta inválida do Google Translate');
      }

      const translatedText = data.sentences.map((s: { trans: string }) => s.trans).join('');
      translatedChunks.push(translatedText);
      
      // Capturar idioma detectado
      if (from === 'auto' && data.src) {
        detectedLang = data.src;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      translatedText: translatedChunks.join(' '),
      detectedLang
    };
  };

  const translateWithMicrosoftTranslator = async (chunks: string[], from: string, to: string): Promise<{translatedText: string, detectedLang?: string}> => {
    // Usar API pública do Microsoft Translator (Bing)
    const translatedChunks: string[] = [];
    let detectedLang = '';

    for (const chunk of chunks) {
      // API alternativa sem necessidade de chave
      const sourceLang = from === 'auto' ? '' : from;
      const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${to}${sourceLang ? `&from=${sourceLang}` : ''}`;
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([{ text: chunk }])
        });

        if (!response.ok) {
          throw new Error(`Erro na API Microsoft: ${response.status}`);
        }

        const data = await response.json();
        
        if (!Array.isArray(data) || !data[0]?.translations) {
          throw new Error('Resposta inválida do Microsoft Translator');
        }

        translatedChunks.push(data[0].translations[0].text);
        
        if (from === 'auto' && data[0].detectedLanguage) {
          detectedLang = data[0].detectedLanguage.language;
        }

      } catch {
        throw new Error('Microsoft Translator não disponível');
      }

      await new Promise(resolve => setTimeout(resolve, 150));
    }

    return {
      translatedText: translatedChunks.join(' '),
      detectedLang
    };
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Texto copiado para a área de transferência!');
  };

  const downloadTranslation = (filename: string) => {
    const content = `TEXTO ORIGINAL:\n${extractedText}\n\nTRADUÇÃO:\n${translatedText}`;
    const blob = new Blob([content], { type: 'text/plain' });
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
    setTranslatedText('');
    setProgress(0);
    setDetectedLanguage('');
    setTranslationError('');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Extrair Texto & Traduzir (OCR + Tradução)</h2>
        <p className="text-gray-600">
          Extraia texto de imagens usando OCR e traduza automaticamente para qualquer idioma
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
          {/* Language Selection */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <h3 className="font-medium text-gray-700">Configurações de tradução:</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Idioma de origem:
                </label>
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
                {detectedLanguage && (
                  <p className="text-sm text-blue-600 mt-1">
                    Idioma detectado: {languages.find(l => l.code === detectedLanguage)?.name || detectedLanguage}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Traduzir para:
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {languages.filter(lang => lang.code !== 'auto').map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-medium text-gray-700 mb-2">Imagem para processar:</h4>
            <img
              src={URL.createObjectURL(uploadedFile)}
              alt="Imagem para OCR"
              className="max-w-full max-h-64 rounded-lg shadow-md mx-auto"
            />
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {progress < 50 ? 'Extraindo texto...' : 'Traduzindo...'}
                </span>
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

          {/* Error Message */}
          {translationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Erro na tradução:</p>
                <p className="text-red-700 text-sm">{translationError}</p>
              </div>
            </div>
          )}

          <button
            onClick={extractAndTranslate}
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
                <Languages className="h-5 w-5" />
                Extrair e Traduzir
              </>
            )}
          </button>
        </div>
      )}

      {extractedText && translatedText && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">Tradução concluída com sucesso!</h3>
          </div>
          
          <div className="space-y-6">
            {/* Original Text */}
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-700">Texto original extraído:</h4>
                <button
                  onClick={() => copyText(extractedText)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="Copiar texto original"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={extractedText}
                readOnly
                className="w-full h-32 p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-800 resize-none"
              />
            </div>

            {/* Translated Text */}
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-700">Texto traduzido:</h4>
                <button
                  onClick={() => copyText(translatedText)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="Copiar tradução"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={translatedText}
                readOnly
                className="w-full h-32 p-3 border border-gray-300 rounded-lg bg-green-50 text-gray-800 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => copyText(`${extractedText}\n\n---\n\n${translatedText}`)}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiar Tudo
              </button>
              <button
                onClick={() => setShowDownloadModal(true)}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Baixar Tradução
              </button>
            </div>
          </div>
        </div>
      )}

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={downloadTranslation}
        defaultFilename="traducao-automatica"
        fileExtension="txt"
      />
    </div>
  );
};

export default TextTranslator;