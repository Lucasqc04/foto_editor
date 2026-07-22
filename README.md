<div align="center">

# Conversor de Imagens Pro

**Suíte gratuita de ferramentas para imagens, PDFs, vídeos e documentos, executada diretamente no navegador.**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Production](https://img.shields.io/badge/status-production-success)](https://foto-editor-ten.vercel.app)

[**Acessar a aplicação**](https://foto-editor-ten.vercel.app)

</div>

## Sobre o projeto

O **Conversor de Imagens Pro** reúne diversas ferramentas de edição e conversão em uma única aplicação web. A maior parte do processamento de arquivos ocorre localmente no navegador, reduzindo uploads desnecessários e oferecendo mais privacidade para o usuário.

O projeto foi desenvolvido com arquitetura baseada em módulos independentes, permitindo adicionar novos recursos sem concentrar toda a lógica em um único editor.

## Funcionalidades

### Imagens

- conversão entre formatos;
- redimensionamento e compressão;
- editor avançado;
- remoção de fundo com TensorFlow BodyPix;
- melhoria de qualidade;
- extração de paleta de cores;
- remoção de objetos;
- medição por pixels;
- filtros e estilos artísticos;
- criação de colagens;
- captura pela webcam;
- detecção de imagens duplicadas;
- busca de imagens no Unsplash.

### PDF e documentos

- conversão de imagens para PDF;
- ferramentas para manipulação de PDFs;
- scanner de documentos;
- assinatura digital;
- OCR e extração de texto;
- detecção de dados sensíveis;
- geração de calendários;
- criação de etiquetas para marketplaces.

### Vídeo e processamento em lote

- conversão de vídeo e GIF com FFmpeg;
- processamento de múltiplos arquivos;
- geração de pacotes ZIP;
- download dos resultados diretamente pelo navegador.

## Arquitetura

```text
src/
├── components/
│   ├── ImageConverter.tsx
│   ├── AdvancedImageEditor.tsx
│   ├── BackgroundRemover.tsx
│   ├── PdfTools.tsx
│   ├── VideoConverter.tsx
│   ├── DocumentScanner.tsx
│   └── ...
├── App.tsx
└── main.tsx
```

Cada ferramenta é implementada como um componente independente e carregada pela navegação principal. Essa abordagem reduz acoplamento e facilita manutenção, testes manuais e expansão do catálogo.

## Tecnologias

- **Frontend:** React 18, TypeScript e Tailwind CSS;
- **Build:** Vite;
- **Edição:** Fabric.js, Canvas e React Easy Crop;
- **Imagens e IA:** TensorFlow.js, BodyPix, SmartCrop e ColorThief;
- **PDF:** PDF-Lib, PDF.js, jsPDF e html2canvas;
- **Vídeo:** FFmpeg WebAssembly;
- **OCR:** Tesseract.js;
- **Arquivos:** JSZip;
- **Integrações:** Unsplash API.

## Privacidade

As operações principais de conversão e edição são executadas no dispositivo do usuário sempre que possível. Isso oferece:

- menor necessidade de enviar arquivos para servidores;
- processamento imediato;
- mais privacidade para imagens e documentos;
- funcionamento independente de armazenamento externo.

Recursos que dependem de serviços de terceiros, como busca de imagens, podem realizar chamadas às respectivas APIs.

## Executando localmente

### Requisitos

- Node.js 18 ou superior;
- npm.

```bash
git clone https://github.com/Lucasqc04/foto_editor.git
cd foto_editor
npm install
npm run dev
```

Acesse a URL exibida pelo Vite, normalmente `http://localhost:5173`.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | inicia o ambiente de desenvolvimento |
| `npm run build` | gera o build de produção |
| `npm run lint` | executa o ESLint |
| `npm run preview` | visualiza o build localmente |

## Autor

Desenvolvido por **[Lucas Quinteiro Campos](https://github.com/Lucasqc04)**.

[LinkedIn](https://www.linkedin.com/in/lucas-quinteiro-2071022a4/) · [Aplicação](https://foto-editor-ten.vercel.app)
