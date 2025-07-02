import { LucideIcon, ImageIcon, FileText, Compass as Compress, Palette, Scissors, Video, Layers, Package, Camera, Grid, Eraser, Sparkles, Brush, Ruler, PenTool, Zap, ScanLine, Languages, Copy, Calendar, Shield } from 'lucide-react';

export interface ComponentConfig {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: string;
  keywords: string[];
  fileFormats: string[];
  mainFeatures: string[];
  useCases: string[];
  searchTerms: string[];
}

export const componentsConfig: ComponentConfig[] = [
  {
    id: 'convert',
    title: 'Converter Formato',
    description: 'Converta suas imagens entre mais de 20 formatos diferentes',
    icon: ImageIcon,
    category: 'Conversão',
    keywords: ['converter', 'formato', 'transformar', 'mudar', 'extensão'],
    fileFormats: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'bmp', 'tiff', 'ico', 'gif', 'svg', 'heic', 'heif', 'tga', 'dds', 'hdr', 'exr', 'psd', 'raw', 'cr2', 'nef', 'arw'],
    mainFeatures: ['Conversão de formato', 'Controle de qualidade', 'Suporte a 20+ formatos', 'Formatos web e profissionais'],
    useCases: ['Converter PNG para JPG', 'Transformar em WebP', 'Preparar para web', 'Converter RAW'],
    searchTerms: ['png', 'jpg', 'jpeg', 'webp', 'formato', 'converter', 'transformar', 'mudança', 'extensão', 'raw', 'heic']
  },
  {
    id: 'pdf',
    title: 'Imagem para PDF',
    description: 'Converta múltiplas imagens em um único arquivo PDF',
    icon: FileText,
    category: 'PDF',
    keywords: ['pdf', 'documento', 'múltiplas', 'várias', 'combinar'],
    fileFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'],
    mainFeatures: ['Múltiplas imagens em PDF', 'Controle de ordem', 'Configuração de página', 'Qualidade ajustável'],
    useCases: ['Criar documento PDF', 'Combinar fotos', 'Digitalizar documentos', 'Portfolio em PDF'],
    searchTerms: ['pdf', 'documento', 'combinar', 'múltiplas', 'várias', 'juntar', 'unir', 'arquivo']
  },
  {
    id: 'resize',
    title: 'Redimensionar & Comprimir',
    description: 'Redimensione imagens e comprima para reduzir tamanho de arquivo',
    icon: Compress,
    category: 'Otimização',
    keywords: ['redimensionar', 'comprimir', 'tamanho', 'reduzir', 'otimizar'],
    fileFormats: ['jpg', 'jpeg', 'png', 'webp', 'bmp'],
    mainFeatures: ['Redimensionamento preciso', 'Compressão inteligente', 'Manter proporção', 'Tamanho em MB'],
    useCases: ['Reduzir tamanho de arquivo', 'Otimizar para web', 'Redimensionar para redes sociais', 'Comprimir fotos'],
    searchTerms: ['redimensionar', 'comprimir', 'tamanho', 'peso', 'mb', 'kb', 'otimizar', 'reduzir', 'diminuir']
  },
  {
    id: 'translate',
    title: 'Extrair Texto & Traduzir',
    description: 'Extraia texto de imagens e traduza para diferentes idiomas',
    icon: Languages,
    category: 'Texto',
    keywords: ['ocr', 'texto', 'extrair', 'traduzir', 'idioma'],
    fileFormats: ['jpg', 'jpeg', 'png', 'bmp', 'tiff'],
    mainFeatures: ['OCR avançado', 'Tradução automática', 'Múltiplos idiomas', 'Texto editável'],
    useCases: ['Digitalizar documentos', 'Traduzir placas', 'Extrair texto de fotos', 'OCR de recibos'],
    searchTerms: ['ocr', 'texto', 'extrair', 'traduzir', 'idioma', 'língua', 'digitalizar', 'ler']
  },
  {
    id: 'edit',
    title: 'Editor Avançado',
    description: 'Editor completo com ferramentas profissionais de edição',
    icon: Scissors,
    category: 'Edição',
    keywords: ['editar', 'cortar', 'desenhar', 'texto', 'filtros'],
    fileFormats: ['jpg', 'jpeg', 'png', 'bmp'],
    mainFeatures: ['Ferramentas de desenho', 'Adicionar texto', 'Corte preciso', 'Filtros e efeitos'],
    useCases: ['Editar fotos', 'Adicionar anotações', 'Cortar imagens', 'Aplicar filtros'],
    searchTerms: ['editar', 'editor', 'cortar', 'desenhar', 'pincel', 'texto', 'filtro', 'efeito']
  },
  {
    id: 'remove-bg',
    title: 'Remover Fundo',
    description: 'Remova o fundo das suas imagens usando IA especializada',
    icon: Eraser,
    category: 'IA',
    keywords: ['fundo', 'remover', 'transparente', 'ia', 'automático'],
    fileFormats: ['jpg', 'jpeg', 'png', 'bmp'],
    mainFeatures: ['IA para detecção', 'Fundo transparente', 'Múltiplos métodos', 'Alta precisão'],
    useCases: ['Foto com fundo transparente', 'Remover pessoas do fundo', 'Produto para e-commerce', 'Selfie sem fundo'],
    searchTerms: ['fundo', 'background', 'remover', 'transparente', 'png', 'ia', 'automático', 'cortar']
  },
  {
    id: 'enhance',
    title: 'Melhorar Qualidade',
    description: 'Remova ruído, aumente a nitidez e melhore a qualidade das suas imagens',
    icon: Sparkles,
    category: 'IA',
    keywords: ['melhorar', 'qualidade', 'nitidez', 'ruído', 'ia'],
    fileFormats: ['jpg', 'jpeg', 'png', 'bmp'],
    mainFeatures: ['Melhoria automática', 'Remoção de ruído', 'Aumento de nitidez', 'Upscale com IA'],
    useCases: ['Melhorar fotos antigas', 'Remover granulação', 'Aumentar nitidez', 'Restaurar imagens'],
    searchTerms: ['melhorar', 'qualidade', 'nitidez', 'ruído', 'granulação', 'ia', 'restaurar', 'limpar']
  },
  {
    id: 'colors',
    title: 'Paleta de Cores',
    description: 'Extraia paletas de cores dominantes das suas imagens',
    icon: Palette,
    category: 'Design',
    keywords: ['cores', 'paleta', 'extrair', 'design', 'dominantes'],
    fileFormats: ['jpg', 'jpeg', 'png', 'bmp', 'gif'],
    mainFeatures: ['Extração automática', 'Cores dominantes', 'Códigos HEX', 'Paletas personalizadas'],
    useCases: ['Design gráfico', 'Escolher cores', 'Branding', 'Inspiração de cores'],
    searchTerms: ['cores', 'cor', 'paleta', 'hex', 'design', 'extrair', 'dominante', 'esquema']
  },
  {
    id: 'signature',
    title: 'Assinatura Digital',
    description: 'Crie e adicione assinaturas digitais às suas imagens',
    icon: PenTool,
    category: 'Documento',
    keywords: ['assinatura', 'digital', 'assinar', 'documento', 'marca'],
    fileFormats: ['jpg', 'jpeg', 'png', 'pdf'],
    mainFeatures: ['Criação de assinatura', 'Posicionamento livre', 'Transparência', 'Múltiplos estilos'],
    useCases: ['Assinar documentos', 'Marca d\'água', 'Autenticação', 'Certificados'],
    searchTerms: ['assinatura', 'assinar', 'digital', 'documento', 'marca', 'água', 'carimbo']
  },
  {
    id: 'object-remove',
    title: 'Remover Objetos',
    description: 'Remova objetos indesejados das suas imagens',
    icon: Brush,
    category: 'IA',
    keywords: ['remover', 'objetos', 'indesejados', 'ia', 'limpar'],
    fileFormats: ['jpg', 'jpeg', 'png', 'bmp'],
    mainFeatures: ['Seleção inteligente', 'Preenchimento automático', 'IA avançada', 'Resultado natural'],
    useCases: ['Remover pessoas', 'Limpar fotos', 'Tirar objetos', 'Correção de imagens'],
    searchTerms: ['remover', 'objeto', 'pessoa', 'limpar', 'tirar', 'apagar', 'ia', 'indesejado']
  },
  {
    id: 'measure',
    title: 'Medidas por Pixel',
    description: 'Meça distâncias e áreas em imagens usando pixels como referência',
    icon: Ruler,
    category: 'Análise',
    keywords: ['medir', 'medidas', 'pixel', 'distância', 'área'],
    fileFormats: ['jpg', 'jpeg', 'png', 'bmp'],
    mainFeatures: ['Medição precisa', 'Múltiplas unidades', 'Calibração', 'Área e perímetro'],
    useCases: ['Medição técnica', 'Análise de imagens', 'Projetos de engenharia', 'Medidas reais'],
    searchTerms: ['medir', 'medida', 'pixel', 'distância', 'área', 'régua', 'calibrar', 'análise']
  },
  {
    id: 'artistic',
    title: 'Estilo Artístico',
    description: 'Transforme suas fotos em obras de arte com diferentes estilos artísticos',
    icon: Zap,
    category: 'IA',
    keywords: ['artístico', 'estilo', 'arte', 'filtro', 'ia'],
    fileFormats: ['jpg', 'jpeg', 'png', 'bmp'],
    mainFeatures: ['Estilos variados', 'IA artística', 'Lápis e vintage', 'Pop art e vidro'],
    useCases: ['Efeito artístico', 'Transformar fotos', 'Arte digital', 'Filtros criativos'],
    searchTerms: ['artístico', 'arte', 'estilo', 'filtro', 'efeito', 'lápis', 'vintage', 'pop', 'ia']
  },
  {
    id: 'scanner',
    title: 'Scanner de Documentos',
    description: 'Escaneie documentos e corrija perspectiva automaticamente',
    icon: ScanLine,
    category: 'Documento',
    keywords: ['scanner', 'documento', 'escanear', 'perspectiva', 'digitalizar'],
    fileFormats: ['jpg', 'jpeg', 'png', 'bmp'],
    mainFeatures: ['Detecção automática', 'Correção de perspectiva', 'Melhoria de contraste', 'Scanner móvel'],
    useCases: ['Digitalizar documentos', 'Scanner móvel', 'Correção de fotos', 'PDF limpo'],
    searchTerms: ['scanner', 'escanear', 'documento', 'digitalizar', 'perspectiva', 'correção', 'móvel']
  },
  {
    id: 'video',
    title: 'Vídeo & GIF',
    description: 'Converta vídeos para GIF e vice-versa',
    icon: Video,
    category: 'Vídeo',
    keywords: ['vídeo', 'gif', 'converter', 'animação', 'mp4'],
    fileFormats: ['mp4', 'avi', 'mov', 'gif', 'webm'],
    mainFeatures: ['Vídeo para GIF', 'GIF para vídeo', 'Controle de qualidade', 'Compressão inteligente'],
    useCases: ['Criar GIF animado', 'Converter vídeo', 'Meme animado', 'Otimizar vídeos'],
    searchTerms: ['vídeo', 'video', 'gif', 'animação', 'mp4', 'converter', 'animado', 'meme']
  },
  {
    id: 'pdf-tools',
    title: 'Ferramentas PDF',
    description: 'Extraia imagens de PDFs e manipule documentos',
    icon: Layers,
    category: 'PDF',
    keywords: ['pdf', 'extrair', 'imagens', 'documento', 'páginas'],
    fileFormats: ['pdf'],
    mainFeatures: ['Extrair imagens', 'Dividir páginas', 'Combinar PDFs', 'Conversão de páginas'],
    useCases: ['Extrair fotos do PDF', 'Dividir documento', 'Combinar arquivos', 'PDF para imagem'],
    searchTerms: ['pdf', 'extrair', 'imagem', 'página', 'dividir', 'combinar', 'documento']
  },
  {
    id: 'batch',
    title: 'Processamento em Lote',
    description: 'Processe múltiplas imagens simultaneamente',
    icon: Package,
    category: 'Produtividade',
    keywords: ['lote', 'múltiplas', 'batch', 'várias', 'simultâneo'],
    fileFormats: ['jpg', 'jpeg', 'png', 'bmp', 'gif'],
    mainFeatures: ['Processamento simultâneo', 'Múltiplas operações', 'Economia de tempo', 'Automação'],
    useCases: ['Processar muitas fotos', 'Conversão em massa', 'Otimização automática', 'Trabalho profissional'],
    searchTerms: ['lote', 'batch', 'múltiplas', 'várias', 'massa', 'simultâneo', 'automático', 'produtividade']
  },
  {
    id: 'webcam',
    title: 'Captura Webcam',
    description: 'Capture fotos diretamente da sua webcam',
    icon: Camera,
    category: 'Captura',
    keywords: ['webcam', 'capturar', 'foto', 'câmera', 'selfie'],
    fileFormats: ['jpg', 'png'],
    mainFeatures: ['Captura direta', 'Múltiplos formatos', 'Webcam e celular', 'Filtros em tempo real'],
    useCases: ['Tirar selfie', 'Foto de perfil', 'Captura rápida', 'Webcam do navegador'],
    searchTerms: ['webcam', 'câmera', 'camera', 'capturar', 'foto', 'selfie', 'tirar', 'perfil']
  },
  {
    id: 'collage',
    title: 'Colagem de Imagens',
    description: 'Crie colagens personalizadas com suas imagens',
    icon: Grid,
    category: 'Design',
    keywords: ['colagem', 'múltiplas', 'combinar', 'layout', 'mosaico'],
    fileFormats: ['jpg', 'jpeg', 'png', 'bmp'],
    mainFeatures: ['Layouts variados', 'Personalização completa', 'Múltiplas imagens', 'Design automático'],
    useCases: ['Colagem de fotos', 'Mosaico de imagens', 'Layout personalizado', 'Memórias familiares'],
    searchTerms: ['colagem', 'mosaico', 'múltiplas', 'layout', 'combinar', 'grid', 'fotos', 'juntar']
  },
  {
    id: 'translator',
    title: 'Tradutor de Texto',
    description: 'Extraia texto de imagens e traduza para outros idiomas',
    icon: Languages,
    category: 'OCR',
    keywords: ['tradutor', 'traduzir', 'idioma', 'língua', 'texto', 'internacional'],
    fileFormats: ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'],
    mainFeatures: ['OCR multilíngue', 'Tradução automática', '100+ idiomas', 'Preservar formatação'],
    useCases: ['Traduzir documentos', 'Textos estrangeiros', 'Placas e sinais', 'Material educativo'],
    searchTerms: ['traduzir', 'idioma', 'língua', 'internacional', 'estrangeiro', 'texto']
  },
  {
    id: 'duplicate-detector',
    title: 'Detector de Imagens Repetidas',
    description: 'Encontre e remova imagens duplicadas ou similares usando análise visual avançada',
    icon: Copy,
    category: 'Organização',
    keywords: ['duplicatas', 'repetidas', 'similares', 'hash', 'organizar', 'limpar'],
    fileFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'],
    mainFeatures: ['Hash perceptual', 'Detecção inteligente', 'Análise em lote', 'Limpeza automática'],
    useCases: ['Organizar galeria', 'Limpar duplicatas', 'Economizar espaço', 'Detectar similaridade'],
    searchTerms: ['duplicadas', 'repetidas', 'similares', 'iguais', 'hash', 'visual', 'organizar', 'limpar', 'google imagens']
  },
  {
    id: 'calendar-creator',
    title: 'Criador de Calendários Personalizados',
    description: 'Crie calendários mensais elegantes usando suas imagens como fundo',
    icon: Calendar,
    category: 'Design',
    keywords: ['calendário', 'mensal', 'personalizado', 'datas', 'agenda', 'fundo'],
    fileFormats: ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'],
    mainFeatures: ['Calendário mensal', 'Imagem de fundo', 'Estilos customizáveis', 'Export em alta qualidade'],
    useCases: ['Calendário pessoal', 'Presente personalizado', 'Decoração', 'Planejamento visual'],
    searchTerms: ['calendário', 'mensal', 'agenda', 'datas', 'personalizado', 'presente', 'decoração']
  },
  {
    id: 'sensitive-text-detector',
    title: 'Detector de Texto Sensível',
    description: 'Detecte e oculte informações sensíveis como CPF, RG, e-mail e telefone automaticamente',
    icon: Shield,
    category: 'Segurança',
    keywords: ['privacidade', 'censura', 'cpf', 'rg', 'email', 'telefone', 'sensível', 'ocultar'],
    fileFormats: ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'],
    mainFeatures: ['Detecção automática', 'Múltiplos padrões', 'OCR inteligente', 'Censura configurável'],
    useCases: ['Proteger documentos', 'Censurar dados', 'Privacidade', 'Conformidade LGPD'],
    searchTerms: ['cpf', 'rg', 'email', 'telefone', 'privacidade', 'censura', 'dados', 'sensível', 'ocultar', 'lgpd', 'documento']
  }
];

// Função para busca inteligente
export function searchComponents(query: string): ComponentConfig[] {
  if (!query.trim()) return [];
  
  const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);
  const results: Array<{ component: ComponentConfig; score: number }> = [];
  
  for (const component of componentsConfig) {
    let score = 0;
    const queryLower = query.toLowerCase();
    
    // Busca exata no título (peso muito alto)
    if (component.title.toLowerCase() === queryLower) {
      score += 20;
    } else if (component.title.toLowerCase().includes(queryLower)) {
      score += 10;
    }
    
    // Busca na descrição (peso médio)
    if (component.description.toLowerCase().includes(queryLower)) {
      score += 5;
    }
    
    // Busca em palavras-chave (peso alto)
    for (const keyword of component.keywords) {
      if (keyword.toLowerCase() === queryLower) {
        score += 15;
      } else if (keyword.toLowerCase().includes(queryLower)) {
        score += 8;
      }
    }
    
    // Busca em formatos de arquivo (peso muito alto)
    for (const format of component.fileFormats) {
      if (format.toLowerCase() === queryLower) {
        score += 18;
      } else if (format.toLowerCase().includes(queryLower)) {
        score += 12;
      }
    }
    
    // Busca em recursos principais (peso médio)
    for (const feature of component.mainFeatures) {
      if (feature.toLowerCase().includes(queryLower)) {
        score += 6;
      }
    }
    
    // Busca em casos de uso (peso médio)
    for (const useCase of component.useCases) {
      if (useCase.toLowerCase().includes(queryLower)) {
        score += 6;
      }
    }
    
    // Busca em termos de pesquisa (peso alto)
    for (const searchTerm of component.searchTerms) {
      if (searchTerm.toLowerCase() === queryLower) {
        score += 16;
      } else if (searchTerm.toLowerCase().includes(queryLower)) {
        score += 9;
      }
    }
    
    // Busca por termos múltiplos (busca inteligente)
    for (const term of searchTerms) {
      // Verifica em todos os campos
      if (component.title.toLowerCase().includes(term)) score += 3;
      if (component.description.toLowerCase().includes(term)) score += 2;
      
      for (const keyword of component.keywords) {
        if (keyword.toLowerCase().includes(term)) score += 4;
      }
      
      for (const searchTerm of component.searchTerms) {
        if (searchTerm.toLowerCase().includes(term)) score += 4;
      }
      
      for (const format of component.fileFormats) {
        if (format.toLowerCase().includes(term)) score += 5;
      }
    }
    
    // Boost para categorias populares baseado na query
    if (queryLower.includes('converter') || queryLower.includes('formato')) {
      if (component.category === 'Conversão') score += 3;
    }
    if (queryLower.includes('pdf')) {
      if (component.category === 'PDF') score += 5;
    }
    if (queryLower.includes('ia') || queryLower.includes('inteligente') || queryLower.includes('automático')) {
      if (component.category === 'IA') score += 4;
    }
    
    if (score > 0) {
      results.push({ component, score });
    }
  }
  
  // Ordena por pontuação e retorna os melhores resultados
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 8) // Aumenta para 8 resultados
    .map(result => result.component);
}

// Função para obter sugestões populares
export function getPopularSuggestions(): string[] {
  return [
    'converter png',
    'remover fundo',
    'comprimir imagem',
    'pdf',
    'redimensionar',
    'ocr texto',
    'duplicatas',
    'calendário',
    'cpf rg',
    'gif',
    'colagem',
    'melhorar qualidade',
    'estilo artístico',
    'hash visual',
    'texto sensível',
    'privacidade'
  ];
}
