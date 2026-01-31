import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FiEdit2,
  FiTrash2,
  FiFileText,
  FiClock,
  FiActivity,
  FiDollarSign,
  FiMessageSquare,
  FiInfo,
  FiCalendar,
  FiMapPin,
  FiUser,
} from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useFetch, useDelete, useCreate } from '../../hooks/useApi';
import casesService from '../../services/cases';
import { Case, CaseTimeline, BillingEntry, AnalysisResult, Document as LegalDoc, PaginatedResponse } from '../../types';
import analysisService from '../../services/analysis';
import documentsService from '../../services/documents';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';
import EmptyState from '../common/EmptyState';
import AnalysisPanel from '../analysis/AnalysisPanel';
import EvaluationPanel from '../evaluation/EvaluationPanel';

type TabType = 'overview' | 'documents' | 'timeline' | 'analysis' | 'billing' | 'chat';

const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [analysisType, setAnalysisType] = useState('comprehensive');
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisResult | null>(null);

  const { data: caseData, isLoading } = useFetch<Case>(
    ['case', id!],
    () => casesService.get(id!),
    { enabled: !!id }
  );

  const { data: documents } = useFetch<PaginatedResponse<LegalDoc>>(
    ['case-documents', id!],
    () => documentsService.list({ case_id: id }),
    { enabled: !!id && activeTab === 'documents' }
  );

  const { data: timeline } = useFetch<CaseTimeline[]>(
    ['case-timeline', id!],
    () => casesService.getTimeline(id!),
    { enabled: !!id && activeTab === 'timeline' }
  );

  const { data: analyses } = useFetch<PaginatedResponse<AnalysisResult>>(
    ['case-analyses', id!],
    () => analysisService.list({ case_id: id }),
    { enabled: !!id && activeTab === 'analysis' }
  );

  const { data: billing } = useFetch<BillingEntry[]>(
    ['case-billing', id!],
    () => casesService.getBilling(id!),
    { enabled: !!id && activeTab === 'billing' }
  );

  const deleteMutation = useDelete(
    (caseId: string) => casesService.delete(caseId),
    {
      successMessage: 'Case deleted',
      onSuccess: () => navigate('/cases'),
    }
  );

  const runAnalysis = useCreate(
    (data: { case_id: string; analysis_type: string }) =>
      analysisService.create(data),
    {
      invalidateKeys: ['case-analyses'],
      successMessage: 'Analysis started',
      onSuccess: (result) => setSelectedAnalysis(result),
    }
  );

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading case..." className="py-16" />;
  }

  if (!caseData) {
    return (
      <EmptyState
        title="Case not found"
        description="The case you are looking for does not exist."
        action={<Link to="/cases" className="btn-primary">Back to Cases</Link>}
      />
    );
  }

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <FiInfo size={16} /> },
    { key: 'documents', label: 'Documents', icon: <FiFileText size={16} /> },
    { key: 'timeline', label: 'Timeline', icon: <FiClock size={16} /> },
    { key: 'analysis', label: 'Analysis', icon: <FiActivity size={16} /> },
    { key: 'billing', label: 'Billing', icon: <FiDollarSign size={16} /> },
    { key: 'chat', label: 'Chat', icon: <FiMessageSquare size={16} /> },
  ];

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this case?')) {
      deleteMutation.mutate(id!);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{caseData.title}</h1>
            <StatusBadge status={caseData.status} />
            <StatusBadge status={caseData.priority} variant="priority" />
          </div>
          <p className="text-gray-500">{caseData.case_number} - {caseData.case_type}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/cases/${id}/edit`} className="btn-secondary flex items-center gap-2">
            <FiEdit2 size={16} />
            Edit
          </Link>
          <button onClick={handleDelete} className="btn-danger flex items-center gap-2">
            <FiTrash2 size={16} />
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
              <p className="text-gray-600 whitespace-pre-wrap">
                {caseData.description || 'No description provided.'}
              </p>
            </div>
            {caseData.case_text && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Case Text</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {caseData.case_text}
                  </pre>
                </div>
              </div>
            )}
            {caseData.tags?.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {caseData.tags.map((tag) => (
                    <span key={tag} className="badge badge-info">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-6">
            <div className="card space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Details</h3>
              <div className="space-y-3 text-sm">
                {caseData.court && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiMapPin size={14} className="text-gray-400" />
                    <span>Court: {caseData.court}</span>
                  </div>
                )}
                {caseData.judge && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiUser size={14} className="text-gray-400" />
                    <span>Judge: {caseData.judge}</span>
                  </div>
                )}
                {caseData.filing_date && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiCalendar size={14} className="text-gray-400" />
                    <span>Filed: {format(new Date(caseData.filing_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {caseData.next_hearing_date && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiCalendar size={14} className="text-gray-400" />
                    <span>Next Hearing: {format(new Date(caseData.next_hearing_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {caseData.client && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiUser size={14} className="text-gray-400" />
                    <span>Client: {caseData.client.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <FiClock size={14} className="text-gray-400" />
                  <span>Created: {format(new Date(caseData.created_at), 'MMM d, yyyy')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Documents</h3>
            <Link to="/documents" className="btn-primary text-sm">Upload Document</Link>
          </div>
          {documents?.results?.length ? (
            <div className="space-y-2">
              {documents.results.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <FiFileText className="text-gray-400" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                      <p className="text-xs text-gray-500">{doc.document_type} - {(doc.file_size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <span className={`badge ${doc.is_vectorized ? 'badge-success' : 'badge-warning'}`}>
                    {doc.is_vectorized ? 'Vectorized' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No documents" description="Upload documents for this case." />
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Timeline</h3>
          {timeline?.length ? (
            <div className="relative pl-6 space-y-6">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />
              {timeline.map((event) => (
                <div key={event.id} className="relative">
                  <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-primary-500 border-2 border-white" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{event.title}</p>
                    <p className="text-xs text-gray-500">{event.event_type} - {format(new Date(event.event_date), 'MMM d, yyyy')}</p>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No timeline events" description="Timeline events will appear here." />
          )}
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="space-y-6">
          {/* Run Analysis */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Run AI Analysis</h3>
            <div className="flex items-center gap-4">
              <select
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value)}
                className="input-field max-w-xs"
              >
                <option value="comprehensive">Comprehensive Analysis</option>
                <option value="precedent_search">Precedent Search</option>
                <option value="loophole_detection">Loophole Detection</option>
                <option value="risk_assessment">Risk Assessment</option>
                <option value="contract_review">Contract Review</option>
                <option value="legal_research">Legal Research</option>
              </select>
              <button
                onClick={() => runAnalysis.mutate({ case_id: id!, analysis_type: analysisType })}
                disabled={runAnalysis.isLoading}
                className="btn-primary disabled:opacity-50"
              >
                {runAnalysis.isLoading ? 'Running...' : 'Run AI Analysis'}
              </button>
            </div>
          </div>

          {/* Selected Analysis Result */}
          {selectedAnalysis && (
            <div className="space-y-6">
              <AnalysisPanel analysis={selectedAnalysis} />
              {selectedAnalysis.evaluation_scores && (
                <EvaluationPanel scores={selectedAnalysis.evaluation_scores} />
              )}
            </div>
          )}

          {/* Analysis History */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Analysis History</h3>
            {analyses?.results?.length ? (
              <div className="space-y-3">
                {analyses.results.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAnalysis(a)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedAnalysis?.id === a.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {a.analysis_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{a.summary}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.evaluation_scores?.grade && (
                          <span className="badge badge-info">{a.evaluation_scores.grade}</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {format(new Date(a.created_at), 'MMM d, HH:mm')}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState title="No analyses yet" description="Run an AI analysis above to get started." />
            )}
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Billing</h3>
          {billing?.length ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header px-4 py-2">Date</th>
                  <th className="table-header px-4 py-2">Description</th>
                  <th className="table-header px-4 py-2">Hours</th>
                  <th className="table-header px-4 py-2">Rate</th>
                  <th className="table-header px-4 py-2">Amount</th>
                  <th className="table-header px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {billing.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-sm">{format(new Date(entry.date), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-sm">{entry.description}</td>
                    <td className="px-4 py-3 text-sm">{entry.hours}</td>
                    <td className="px-4 py-3 text-sm">${entry.rate}</td>
                    <td className="px-4 py-3 text-sm font-medium">${entry.amount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${entry.is_billed ? 'badge-success' : 'badge-warning'}`}>
                        {entry.is_billed ? 'Billed' : 'Unbilled'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="No billing entries" description="Billing entries will appear here." />
          )}
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Case Chat</h3>
          <p className="text-gray-500 mb-4">Start a conversation about this case with the AI assistant.</p>
          <Link
            to={`/chat?case_id=${id}`}
            className="btn-primary inline-flex items-center gap-2"
          >
            <FiMessageSquare size={16} />
            Open Chat
          </Link>
        </div>
      )}
    </div>
  );
};

export default CaseDetail;
