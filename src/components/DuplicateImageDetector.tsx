import React, { useState } from 'react';
import { Download, Loader2, CheckCircle, Search, RotateCw, AlertTriangle } from 'lucide-react';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';

interface DuplicateImageDetectorProps {
  onConversionComplete: () => void;
}

interface ImageHash {
  id: string;
  file: File;
  hash: string;
  preview: string;
  similarity?: number;
}

interface DuplicateGroup {
  hash: string;
  images: ImageHash[];
  similarity: number;
}

const DuplicateImageDetector: React.FC<DuplicateImageDetectorProps> = ({ onConversionComplete }) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImages, setProcessedImages] = useState<ImageHash[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageSrc, setViewerImageSrc] = useState('');
  const [viewerImageAlt, setViewerImageAlt] = useState('');
  const [similarityThreshold, setSimilarityThreshold] = useState(90);
  const [selectedForRemoval, setSelectedForRemoval] = useState<Set<string>>(new Set());

  const handleFileSelect = (files: File[]) => {
    setUploadedFiles(files);
    setProcessedImages([]);
    setDuplicateGroups([]);
    setSelectedForRemoval(new Set());
  };

  // Função para calcular hash perceptual simples (baseado em blockhash)
  const calculateImageHash = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      img.onload = () => {
        // Redimensionar para 16x16 para análise
        canvas.width = 16;
        canvas.height = 16;
        ctx.drawImage(img, 0, 0, 16, 16);
        
        const imageData = ctx.getImageData(0, 0, 16, 16);
        const data = imageData.data;
        
        // Converter para escala de cinza e calcular hash
        const grayValues: number[] = [];
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          grayValues.push(gray);
        }
        
        // Calcular média
        const average = grayValues.reduce((sum, val) => sum + val, 0) / grayValues.length;
        
        // Gerar hash binário
        let hash = '';
        for (const value of grayValues) {
          hash += value > average ? '1' : '0';
        }
        
        resolve(hash);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Calcular similaridade entre dois hashes (distância de Hamming)
  const calculateSimilarity = (hash1: string, hash2: string): number => {
    if (hash1.length !== hash2.length) return 0;
    
    let differences = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        differences++;
      }
    }
    
    return ((hash1.length - differences) / hash1.length) * 100;
  };

  const detectDuplicates = async () => {
    if (uploadedFiles.length < 2) {
      alert('Adicione pelo menos 2 imagens para comparar.');
      return;
    }

    setIsProcessing(true);

    try {
      // Processar todas as imagens
      const imageHashes: ImageHash[] = [];
      
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const hash = await calculateImageHash(file);
        const preview = URL.createObjectURL(file);
        
        imageHashes.push({
          id: `img_${i}`,
          file,
          hash,
          preview
        });
      }

      setProcessedImages(imageHashes);

      // Encontrar duplicatas
      const groups: DuplicateGroup[] = [];
      const processed = new Set<string>();

      for (let i = 0; i < imageHashes.length; i++) {
        if (processed.has(imageHashes[i].id)) continue;

        const similar: ImageHash[] = [imageHashes[i]];
        processed.add(imageHashes[i].id);

        for (let j = i + 1; j < imageHashes.length; j++) {
          if (processed.has(imageHashes[j].id)) continue;

          const similarity = calculateSimilarity(imageHashes[i].hash, imageHashes[j].hash);
          
          if (similarity >= similarityThreshold) {
            imageHashes[j].similarity = similarity;
            similar.push(imageHashes[j]);
            processed.add(imageHashes[j].id);
          }
        }

        if (similar.length > 1) {
          groups.push({
            hash: imageHashes[i].hash,
            images: similar,
            similarity: similar.length > 1 ? 
              Math.min(...similar.slice(1).map(img => img.similarity || 100)) : 100
          });
        }
      }

      setDuplicateGroups(groups);
      onConversionComplete();
    } catch (error) {
      console.error('Erro ao detectar duplicatas:', error);
      alert('Erro ao processar imagens. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleImageSelection = (imageId: string) => {
    const newSelection = new Set(selectedForRemoval);
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId);
    } else {
      newSelection.add(imageId);
    }
    setSelectedForRemoval(newSelection);
  };

  const selectAllInGroup = (group: DuplicateGroup, exceptFirst: boolean = true) => {
    const newSelection = new Set(selectedForRemoval);
    const startIndex = exceptFirst ? 1 : 0;
    
    for (let i = startIndex; i < group.images.length; i++) {
      newSelection.add(group.images[i].id);
    }
    
    setSelectedForRemoval(newSelection);
  };

  const exportCleanList = () => {
    const remainingImages = processedImages.filter(img => !selectedForRemoval.has(img.id));
    
    if (remainingImages.length === 0) {
      alert('Nenhuma imagem restante para export.');
      return;
    }

    // Criar zip com imagens limpas (simulado com download individual)
    remainingImages.forEach((img, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = img.preview;
        link.download = `clean_${index + 1}_${img.file.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 500); // Delay entre downloads
    });
  };

  const handleReset = () => {
    setUploadedFiles([]);
    setProcessedImages([]);
    setDuplicateGroups([]);
    setSelectedForRemoval(new Set());
  };

  const openImageViewer = (src: string, alt: string) => {
    setViewerImageSrc(src);
    setViewerImageAlt(alt);
    setShowImageViewer(true);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Detector de Imagens Repetidas</h2>
        <p className="text-gray-600">
          Encontre e remova imagens duplicadas ou similares usando análise visual avançada
        </p>
      </div>

      <FileUpload
        onFileSelect={handleFileSelect}
        fileType="image"
        multiple={true}
        uploadedFiles={uploadedFiles}
        onRemoveFile={handleReset}
      />

      {uploadedFiles.length > 0 && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-700">Configurações de Detecção</h3>
              <button
                onClick={handleReset}
                className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <RotateCw className="h-4 w-4" />
                Resetar
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sensibilidade de Similaridade: {similarityThreshold}%
              </label>
              <input
                type="range"
                min="70"
                max="99"
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Menos restritivo (70%)</span>
                <span>Mais restritivo (99%)</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Como funciona:</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Análise baseada em hash perceptual (como o Google Imagens)</p>
                <p>• Detecta imagens similares mesmo com pequenas diferenças</p>
                <p>• Identifica recortes, redimensionamentos e filtros leves</p>
                <p>• {uploadedFiles.length} imagens carregadas para análise</p>
              </div>
            </div>
          </div>

          <button
            onClick={detectDuplicates}
            disabled={isProcessing || uploadedFiles.length < 2}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analisando similaridade...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                Detectar Duplicatas
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {duplicateGroups.length > 0 && (
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              <h3 className="text-lg font-medium text-yellow-800">
                {duplicateGroups.length} grupos de imagens similares encontrados
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="text-sm text-yellow-700">
                <p><strong>Total de imagens:</strong> {processedImages.length}</p>
                <p><strong>Imagens únicas:</strong> {processedImages.length - duplicateGroups.reduce((sum, group) => sum + group.images.length - 1, 0)}</p>
                <p><strong>Possíveis duplicatas:</strong> {duplicateGroups.reduce((sum, group) => sum + group.images.length - 1, 0)}</p>
              </div>
              <div className="text-sm text-yellow-700">
                <p><strong>Selecionadas para remoção:</strong> {selectedForRemoval.size}</p>
                <p><strong>Espaço potencial economizado:</strong> {Math.round(Array.from(selectedForRemoval).reduce((sum, id) => {
                  const img = processedImages.find(i => i.id === id);
                  return sum + (img ? img.file.size : 0);
                }, 0) / 1024 / 1024 * 100) / 100} MB</p>
              </div>
            </div>
          </div>

          {/* Duplicate Groups */}
          {duplicateGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-700">
                  Grupo {groupIndex + 1} - {group.images.length} imagens similares 
                  ({Math.round(group.similarity)}% de similaridade)
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => selectAllInGroup(group, true)}
                    className="text-sm bg-orange-500 text-white py-1 px-3 rounded hover:bg-orange-600"
                  >
                    Selecionar duplicatas
                  </button>
                  <button
                    onClick={() => selectAllInGroup(group, false)}
                    className="text-sm bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600"
                  >
                    Selecionar todas
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {group.images.map((image, imageIndex) => (
                  <div
                    key={image.id}
                    className={`relative border-2 rounded-lg overflow-hidden ${
                      selectedForRemoval.has(image.id) 
                        ? 'border-red-500 bg-red-50' 
                        : imageIndex === 0 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={image.preview}
                      alt={`Similar ${imageIndex + 1}`}
                      className="w-full h-32 object-cover cursor-pointer"
                      onClick={() => openImageViewer(image.preview, `Imagem ${imageIndex + 1} do grupo ${groupIndex + 1}`)}
                    />
                    
                    <div className="p-2 bg-white">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-600">
                          <p className="truncate">{image.file.name}</p>
                          <p>{Math.round(image.file.size / 1024)} KB</p>
                          {imageIndex > 0 && (
                            <p className="text-blue-600">{Math.round(image.similarity || 0)}% similar</p>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-center gap-1">
                          {imageIndex === 0 && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Original
                            </span>
                          )}
                          
                          <button
                            onClick={() => toggleImageSelection(image.id)}
                            className={`text-xs py-1 px-2 rounded ${
                              selectedForRemoval.has(image.id)
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {selectedForRemoval.has(image.id) ? 'Remover' : 'Manter'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Export Actions */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-medium text-green-800">Ações de Limpeza</h3>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <button
                onClick={exportCleanList}
                disabled={selectedForRemoval.size === 0}
                className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Download className="h-5 w-5" />
                Baixar Imagens Limpas ({processedImages.length - selectedForRemoval.size})
              </button>
              
              <button
                onClick={() => setSelectedForRemoval(new Set())}
                className="bg-gray-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                Limpar Seleção
              </button>
            </div>
          </div>
        </div>
      )}

      {processedImages.length > 0 && duplicateGroups.length === 0 && !isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <CheckCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-blue-800 mb-2">
            Nenhuma duplicata encontrada!
          </h3>
          <p className="text-blue-700">
            Todas as {processedImages.length} imagens parecem ser únicas com o nível de similaridade atual ({similarityThreshold}%).
          </p>
        </div>
      )}

      <ImageViewer
        src={viewerImageSrc}
        alt={viewerImageAlt}
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
      />
    </div>
  );
};

export default DuplicateImageDetector;
