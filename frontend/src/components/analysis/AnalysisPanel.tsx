import React from 'react';
import {
  FiClock,
  FiTool,
  FiAlertTriangle,
  FiBookOpen,
  FiTarget,
  FiShield,
  FiCheckCircle,
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { AnalysisResult } from '../../types';

interface AnalysisPanelProps {
  analysis: AnalysisResult;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis }) => {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 capitalize">
            {analysis.analysis_type.replace(/_/g, ' ')} Results
          </h3>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <FiClock size={12} />
              {analysis.processing_time?.toFixed(1)}s
            </span>
            {analysis.tokens_consumed > 0 && (
              <span>{analysis.tokens_consumed.toLocaleString()} tokens</span>
            )}
          </div>
        </div>
        {analysis.summary && (
          <div className="bg-primary-50 border border-primary-100 rounded-lg p-4">
            <div className="prose prose-sm max-w-none text-primary-900">
              <ReactMarkdown>{analysis.summary}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* Risk Score */}
      {analysis.risk_score !== null && analysis.risk_score !== undefined && (
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <FiShield size={18} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-full score-bar h-3">
              <div
                className="score-bar-fill"
                style={{
                  width: `${analysis.risk_score * 100}%`,
                  backgroundColor:
                    analysis.risk_score < 0.3
                      ? '#10b981'
                      : analysis.risk_score < 0.6
                      ? '#f59e0b'
                      : '#ef4444',
                }}
              />
            </div>
            <span className="text-lg font-bold text-gray-900 w-16 text-right">
              {(analysis.risk_score * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {analysis.risk_score < 0.3
              ? 'Low risk - the case appears favorable.'
              : analysis.risk_score < 0.6
              ? 'Moderate risk - some concerns identified.'
              : 'High risk - significant legal challenges detected.'}
          </p>
        </div>
      )}

      {/* Precedents */}
      {analysis.precedents_found?.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <FiBookOpen size={18} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Precedents Found ({analysis.precedents_found.length})
            </h3>
          </div>
          <div className="space-y-3">
            {analysis.precedents_found.map((p: any, i: number) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">
                  {typeof p === 'string' ? p : p.case_name || p.title || JSON.stringify(p)}
                </p>
                {p.relevance && (
                  <p className="text-xs text-gray-500 mt-1">Relevance: {p.relevance}</p>
                )}
                {p.summary && (
                  <p className="text-sm text-gray-600 mt-1">{p.summary}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loopholes */}
      {analysis.loopholes_identified?.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <FiAlertTriangle size={18} className="text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Loopholes Identified ({analysis.loopholes_identified.length})
            </h3>
          </div>
          <div className="space-y-3">
            {analysis.loopholes_identified.map((l: any, i: number) => (
              <div key={i} className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
                <p className="text-sm text-gray-900">
                  {typeof l === 'string' ? l : l.description || l.title || JSON.stringify(l)}
                </p>
                {l.severity && (
                  <span className="inline-block mt-1 badge badge-warning">{l.severity}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations?.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <FiTarget size={18} className="text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Recommendations ({analysis.recommendations.length})
            </h3>
          </div>
          <div className="space-y-2">
            {analysis.recommendations.map((r: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <FiCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" size={16} />
                <p className="text-sm text-gray-900">
                  {typeof r === 'string' ? r : r.text || r.recommendation || JSON.stringify(r)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tools Used */}
      {analysis.tools_used?.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <FiTool size={18} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Tools Used</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.tools_used.map((tool: any, i: number) => (
              <span key={i} className="badge badge-info font-mono text-xs">
                {typeof tool === 'string' ? tool : tool.name || JSON.stringify(tool)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel;
