import React from 'react';
import {
  FiCheckCircle,
  FiXCircle,
  FiTool,
  FiTarget,
  FiBookOpen,
  FiLayers,
  FiAward,
} from 'react-icons/fi';
import clsx from 'clsx';
import { EvaluationScores } from '../../types';

interface EvaluationPanelProps {
  scores: EvaluationScores;
}

const gradeColors: Record<string, string> = {
  'A+': 'text-green-700 bg-green-100 border-green-200',
  'A': 'text-green-700 bg-green-100 border-green-200',
  'A-': 'text-green-600 bg-green-50 border-green-200',
  'B+': 'text-blue-700 bg-blue-100 border-blue-200',
  'B': 'text-blue-700 bg-blue-100 border-blue-200',
  'B-': 'text-blue-600 bg-blue-50 border-blue-200',
  'C+': 'text-yellow-700 bg-yellow-100 border-yellow-200',
  'C': 'text-yellow-700 bg-yellow-100 border-yellow-200',
  'C-': 'text-yellow-600 bg-yellow-50 border-yellow-200',
  'D': 'text-orange-700 bg-orange-100 border-orange-200',
  'F': 'text-red-700 bg-red-100 border-red-200',
};

const ScoreBar: React.FC<{ score: number; label: string; passed?: boolean }> = ({
  score,
  label,
  passed,
}) => {
  const percentage = Math.round(score * 100);
  const barColor =
    percentage >= 80
      ? 'bg-green-500'
      : percentage >= 60
      ? 'bg-blue-500'
      : percentage >= 40
      ? 'bg-yellow-500'
      : 'bg-red-500';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{percentage}%</span>
          {passed !== undefined && (
            passed ? (
              <FiCheckCircle className="text-green-500" size={14} />
            ) : (
              <FiXCircle className="text-red-500" size={14} />
            )
          )}
        </div>
      </div>
      <div className="score-bar">
        <div className={clsx('score-bar-fill', barColor)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

const EvaluationPanel: React.FC<EvaluationPanelProps> = ({ scores }) => {
  if (!scores) return null;

  const gradeClass = gradeColors[scores.grade] || 'text-gray-700 bg-gray-100 border-gray-200';

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FiAward size={20} className="text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Evaluation Scores</h3>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'text-2xl font-bold px-4 py-1.5 rounded-lg border',
              gradeClass
            )}
          >
            {scores.grade}
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-900">
              {Math.round(scores.overall_score * 100)}%
            </p>
            <p className="text-xs text-gray-500">
              {scores.overall_passed ? 'PASSED' : 'FAILED'}
            </p>
          </div>
        </div>
      </div>

      {/* Score Bars */}
      <div className="space-y-4 mb-6">
        {scores.tool_correctness && (
          <ScoreBar
            score={scores.tool_correctness.score}
            label="Tool Correctness"
            passed={scores.tool_correctness.passed}
          />
        )}
        {scores.task_completion && (
          <ScoreBar
            score={scores.task_completion.score}
            label="Task Completion"
            passed={scores.task_completion.passed}
          />
        )}
        {scores.answer_relevancy && (
          <ScoreBar
            score={scores.answer_relevancy.score}
            label="Answer Relevancy"
            passed={scores.answer_relevancy.passed}
          />
        )}
        {scores.content_coverage && (
          <ScoreBar
            score={scores.content_coverage.average_coverage}
            label="Content Coverage"
          />
        )}
      </div>

      {/* Detail Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tool Correctness Detail */}
        {scores.tool_correctness && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <FiTool size={14} className="text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-700">Tool Correctness</h4>
            </div>
            {scores.tool_correctness.correct_tools?.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-gray-500 mb-1">Correct Tools:</p>
                <div className="flex flex-wrap gap-1">
                  {scores.tool_correctness.correct_tools.map((t, i) => (
                    <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {scores.tool_correctness.missing_tools?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Missing Tools:</p>
                <div className="flex flex-wrap gap-1">
                  {scores.tool_correctness.missing_tools.map((t, i) => (
                    <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Task Completion Detail */}
        {scores.task_completion && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <FiTarget size={14} className="text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-700">Task Completion</h4>
            </div>
            {scores.task_completion.found_aspects?.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-gray-500 mb-1">Found Aspects:</p>
                <div className="flex flex-wrap gap-1">
                  {scores.task_completion.found_aspects.map((a, i) => (
                    <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {scores.task_completion.missing_aspects?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Missing Aspects:</p>
                <div className="flex flex-wrap gap-1">
                  {scores.task_completion.missing_aspects.map((a, i) => (
                    <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Answer Relevancy Detail */}
        {scores.answer_relevancy && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <FiBookOpen size={14} className="text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-700">Answer Relevancy</h4>
            </div>
            {scores.answer_relevancy.relevant_aspects?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {scores.answer_relevancy.relevant_aspects.map((a, i) => (
                  <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content Coverage Detail */}
        {scores.content_coverage && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <FiLayers size={14} className="text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-700">Content Coverage</h4>
            </div>
            {scores.content_coverage.category_scores && (
              <div className="space-y-2">
                {Object.entries(scores.content_coverage.category_scores).map(([cat, data]) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-gray-600 capitalize">{cat.replace(/_/g, ' ')}</span>
                      <span className="font-medium">{Math.round(data.score * 100)}%</span>
                    </div>
                    <div className="score-bar h-1.5">
                      <div
                        className={clsx(
                          'score-bar-fill',
                          data.score >= 0.7 ? 'bg-green-500' : data.score >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
                        style={{ width: `${data.score * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {scores.content_coverage.overall_grade && (
              <p className="text-xs text-gray-500 mt-2">
                Overall Coverage Grade: <span className="font-semibold">{scores.content_coverage.overall_grade}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationPanel;
