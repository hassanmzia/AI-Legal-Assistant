import React, { useState } from 'react';
import { FiFileText, FiTrash2, FiSearch, FiDatabase } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useFetch, useDelete } from '../../hooks/useApi';
import documentsService from '../../services/documents';
import { Document as LegalDoc, PaginatedResponse } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';
import SearchBar from '../common/SearchBar';
import EmptyState from '../common/EmptyState';
import Modal from '../common/Modal';
import DocumentUpload from './DocumentUpload';

const typeOptions = ['', 'pdf', 'word', 'text', 'spreadsheet', 'other'];

const DocumentList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const { data, isLoading, refetch } = useFetch<PaginatedResponse<LegalDoc>>(
    ['documents', search, typeFilter],
    () => documentsService.list({ search, document_type: typeFilter || undefined })
  );

  const deleteMutation = useDelete(
    (id: string) => documentsService.delete(id),
    { invalidateKeys: ['documents'], successMessage: 'Document deleted' }
  );

  const handleVectorize = async (id: string) => {
    try {
      await documentsService.vectorize(id);
      toast.success('Vectorization started');
      refetch();
    } catch {
      toast.error('Failed to start vectorization');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-500 mt-1">{data?.count ?? 0} documents</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary">
          Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search documents..."
            className="flex-1"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-field max-w-[160px] text-sm"
          >
            <option value="">All Types</option>
            {typeOptions.filter(Boolean).map((t) => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Document List */}
      {isLoading ? (
        <LoadingSpinner size="lg" text="Loading documents..." className="py-16" />
      ) : !data?.results?.length ? (
        <div className="card">
          <EmptyState
            title="No documents found"
            description="Upload your first document to get started."
            action={
              <button onClick={() => setShowUpload(true)} className="btn-primary">
                Upload Document
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {data.results.map((doc) => (
            <div key={doc.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-gray-100">
                  <FiFileText className="text-gray-500" size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500 uppercase">{doc.document_type}</span>
                    <span className="text-xs text-gray-400">{(doc.file_size / 1024).toFixed(1)} KB</span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(doc.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${doc.is_vectorized ? 'badge-success' : 'badge-warning'}`}>
                  {doc.is_vectorized ? 'Vectorized' : 'Not vectorized'}
                </span>
                {!doc.is_vectorized && (
                  <button
                    onClick={() => handleVectorize(doc.id)}
                    className="btn-secondary text-sm flex items-center gap-1"
                    title="Vectorize for AI search"
                  >
                    <FiDatabase size={14} />
                    Vectorize
                  </button>
                )}
                <button
                  onClick={() => {
                    if (window.confirm('Delete this document?')) deleteMutation.mutate(doc.id);
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        title="Upload Documents"
        size="lg"
      >
        <DocumentUpload onUploadComplete={() => { setShowUpload(false); refetch(); }} />
      </Modal>
    </div>
  );
};

export default DocumentList;
