import React, { useState } from 'react';
import { FiActivity, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';
import { useFetch } from '../../hooks/useApi';
import analysisService from '../../services/analysis';
import { AnalysisResult, PaginatedResponse } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import AnalysisPanel from './AnalysisPanel';
import EvaluationPanel from '../evaluation/EvaluationPanel';

const AnalysisHistory: React.FC = () => {
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisResult | null>(null);
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading } = useFetch<PaginatedResponse<AnalysisResult>>(
    ['analyses', typeFilter],
    () => analysisService.list({ analysis_type: typeFilter || undefined })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analysis History</h1>
          <p className="text-gray-500 mt-1">{data?.count ?? 0} analyses</p>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input-field max-w-[200px] text-sm"
        >
          <option value="">All Types</option>
          <option value="comprehensive">Comprehensive</option>
          <option value="precedent_search">Precedent Search</option>
          <option value="loophole_detection">Loophole Detection</option>
          <option value="risk_assessment">Risk Assessment</option>
          <option value="contract_review">Contract Review</option>
          <option value="legal_research">Legal Research</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner size="lg" text="Loading analyses..." className="py-16" />
      ) : !data?.results?.length ? (
        <div className="card">
          <EmptyState
            icon={<FiActivity size={48} />}
            title="No analyses found"
            description="Run an analysis from a case to see results here."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Analysis List */}
          <div className="space-y-3">
            {data.results.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAnalysis(a)}
                className={`w-full text-left card transition-colors ${
                  selectedAnalysis?.id === a.id
                    ? 'ring-2 ring-primary-500 border-primary-500'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold capitalize">
                    {a.analysis_type.replace(/_/g, ' ')}
                  </span>
                  {a.evaluation_scores?.grade && (
                    <span className="badge badge-info text-xs">{a.evaluation_scores.grade}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-2">{a.summary}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <FiClock size={12} />
                  {format(new Date(a.created_at), 'MMM d, yyyy HH:mm')}
                </div>
              </button>
            ))}
          </div>

          {/* Selected Analysis */}
          <div className="lg:col-span-2">
            {selectedAnalysis ? (
              <div className="space-y-6">
                <AnalysisPanel analysis={selectedAnalysis} />
                {selectedAnalysis.evaluation_scores && (
                  <EvaluationPanel scores={selectedAnalysis.evaluation_scores} />
                )}
              </div>
            ) : (
              <div className="card">
                <EmptyState
                  title="Select an analysis"
                  description="Click on an analysis from the list to view its details."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisHistory;
