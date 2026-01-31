import React, { useState, useCallback } from 'react';
import { FiUploadCloud, FiFile, FiX, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import documentsService from '../../services/documents';

interface DocumentUploadProps {
  caseId?: string;
  onUploadComplete?: () => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ caseId, onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, 'pending' | 'uploading' | 'done' | 'error'>>({});

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    setUploading(true);
    const progress: Record<string, 'pending' | 'uploading' | 'done' | 'error'> = {};
    files.forEach((f) => { progress[f.name] = 'pending'; });
    setUploadProgress({ ...progress });

    for (const file of files) {
      progress[file.name] = 'uploading';
      setUploadProgress({ ...progress });

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name);
        formData.append('document_type', getDocType(file.name));
        if (caseId) formData.append('case', caseId);

        await documentsService.upload(formData);
        progress[file.name] = 'done';
      } catch {
        progress[file.name] = 'error';
      }
      setUploadProgress({ ...progress });
    }

    setUploading(false);
    const successCount = Object.values(progress).filter((s) => s === 'done').length;
    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded successfully`);
      onUploadComplete?.();
    }
    const errorCount = Object.values(progress).filter((s) => s === 'error').length;
    if (errorCount > 0) {
      toast.error(`${errorCount} file(s) failed to upload`);
    }
    setFiles([]);
    setUploadProgress({});
  };

  const getDocType = (name: string): string => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'pdf';
      case 'doc': case 'docx': return 'word';
      case 'txt': return 'text';
      case 'xls': case 'xlsx': return 'spreadsheet';
      default: return 'other';
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <FiUploadCloud className="mx-auto text-gray-400 mb-3" size={40} />
        <p className="text-sm text-gray-600 mb-2">
          Drag and drop files here, or{' '}
          <label className="text-primary-600 hover:text-primary-700 cursor-pointer font-medium">
            browse
            <input type="file" multiple className="hidden" onChange={handleFileSelect} />
          </label>
        </p>
        <p className="text-xs text-gray-400">PDF, DOCX, TXT, and more</p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FiFile className="text-gray-400" size={18} />
                <div>
                  <p className="text-sm font-medium text-gray-700">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {uploadProgress[file.name] === 'done' && (
                  <FiCheck className="text-green-500" size={18} />
                )}
                {uploadProgress[file.name] === 'uploading' && (
                  <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                )}
                {uploadProgress[file.name] === 'error' && (
                  <span className="text-xs text-red-500">Failed</span>
                )}
                {!uploading && (
                  <button onClick={() => removeFile(index)} className="text-gray-400 hover:text-red-500">
                    <FiX size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={uploadFiles}
            disabled={uploading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} File(s)`}
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
