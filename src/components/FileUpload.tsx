import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, X, Video, FileText } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  uploadedFiles?: File[];
  onRemoveFile?: (index: number) => void;
  fileType?: 'image' | 'video' | 'pdf' | 'all';
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = 'image/*',
  multiple = false,
  maxSize = 100 * 1024 * 1024, // 100MB default
  uploadedFiles = [],
  onRemoveFile,
  fileType = 'all',
}) => {
  const getAcceptTypes = () => {
    switch (fileType) {
      case 'image':
        return { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'] };
      case 'video':
        return { 'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'] };
      case 'pdf':
        return { 'application/pdf': ['.pdf'] };
      default:
        return { [accept]: [] };
    }
  };

  const getFileTypeText = () => {
    switch (fileType) {
      case 'image':
        return 'imagens (PNG, JPG, GIF, WebP, etc.)';
      case 'video':
        return 'vídeos (MP4, AVI, MOV, WebM, etc.)';
      case 'pdf':
        return 'arquivos PDF';
      default:
        return 'arquivos';
    }
  };

  const getMaxSizeText = () => {
    if (maxSize >= 100 * 1024 * 1024) return '100MB';
    if (maxSize >= 50 * 1024 * 1024) return '50MB';
    return `${Math.round(maxSize / 1024 / 1024)}MB`;
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.startsWith('video/')) return Video;
    if (file.type.includes('pdf')) return FileText;
    return FileText;
  };

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    accept: getAcceptTypes(),
    multiple,
    maxSize,
    onDrop: (acceptedFiles) => {
      onFileSelect(acceptedFiles);
    },
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 md:p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 scale-105'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3 md:gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 md:p-4 rounded-full">
            <Upload className="h-6 w-6 md:h-8 md:w-8 text-white" />
          </div>
          <div>
            <p className="text-base md:text-lg font-medium text-gray-700">
              {isDragActive
                ? `Solte os ${getFileTypeText()} aqui...`
                : `Arraste e solte ${getFileTypeText()} aqui`}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              ou toque para selecionar arquivos
            </p>
          </div>
          <div className="text-xs md:text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            {multiple ? 'Múltiplos arquivos' : 'Um arquivo'} • 
            Máximo {getMaxSizeText()}
          </div>
        </div>
      </div>

      {fileRejections.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 font-medium text-sm">Arquivos rejeitados:</p>
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="text-red-700 text-xs mt-1">
              {file.name}: {errors.map(e => e.message).join(', ')}
            </div>
          ))}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-gray-700 text-sm md:text-base">
            Arquivos selecionados ({uploadedFiles.length}):
          </h3>
          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
            {uploadedFiles.map((file, index) => {
              const FileIcon = getFileIcon(file);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileIcon className="h-4 w-4 md:h-5 md:w-5 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-700 text-sm truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  {onRemoveFile && (
                    <button
                      onClick={() => onRemoveFile(index)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 flex-shrink-0 ml-2"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;