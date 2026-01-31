import React from 'react';
import { Link } from 'react-router-dom';
import {
  FiBriefcase,
  FiUsers,
  FiFileText,
  FiActivity,
  FiPlus,
  FiUpload,
  FiMessageSquare,
  FiTrendingUp,
  FiArrowRight,
} from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useFetch } from '../../hooks/useApi';
import { DashboardStats } from '../../types';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';
import { format } from 'date-fns';

const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#6b7280', '#10b981'];

const DashboardPage: React.FC = () => {
  const { data: stats, isLoading } = useFetch<DashboardStats>(
    'dashboard-stats',
    async () => {
      const response = await api.get('/dashboard/stats/');
      return response.data;
    },
    { retry: false }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  const statusData = stats?.case_by_status
    ? Object.entries(stats.case_by_status).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
      }))
    : [];

  const statCards = [
    { label: 'Total Cases', value: stats?.total_cases ?? 0, icon: FiBriefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Cases', value: stats?.active_cases ?? 0, icon: FiTrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Clients', value: stats?.total_clients ?? 0, icon: FiUsers, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Documents', value: stats?.total_documents ?? 0, icon: FiFileText, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Analyses', value: stats?.total_analyses ?? 0, icon: FiActivity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back. Here is an overview of your legal practice.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={stat.color} size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Case Distribution */}
        <div className="card lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Case Distribution</h2>
          {statusData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {statusData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-gray-600">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-12">No case data yet</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/cases/new"
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-all group"
            >
              <div className="p-2 rounded-lg bg-primary-100 text-primary-600 group-hover:bg-primary-200 transition-colors">
                <FiPlus size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-900">New Case</p>
                <p className="text-xs text-gray-500">Create a new legal case</p>
              </div>
            </Link>
            <Link
              to="/documents"
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all group"
            >
              <div className="p-2 rounded-lg bg-green-100 text-green-600 group-hover:bg-green-200 transition-colors">
                <FiUpload size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-900">Upload Document</p>
                <p className="text-xs text-gray-500">Add documents to cases</p>
              </div>
            </Link>
            <Link
              to="/chat"
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all group"
            >
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-200 transition-colors">
                <FiMessageSquare size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-900">Start Chat</p>
                <p className="text-xs text-gray-500">Talk to the AI assistant</p>
              </div>
            </Link>
            <Link
              to="/analysis"
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all group"
            >
              <div className="p-2 rounded-lg bg-orange-100 text-orange-600 group-hover:bg-orange-200 transition-colors">
                <FiActivity size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-900">Run Analysis</p>
                <p className="text-xs text-gray-500">AI-powered case analysis</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Cases & Analyses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Cases</h2>
            <Link to="/cases" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <FiArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {stats?.recent_cases?.length ? (
              stats.recent_cases.slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  to={`/cases/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                    <p className="text-xs text-gray-500">{c.case_number} - {c.case_type}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <StatusBadge status={c.status} />
                    <StatusBadge status={c.priority} variant="priority" />
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No cases yet</p>
            )}
          </div>
        </div>

        {/* Recent Analyses */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Analyses</h2>
            <Link to="/analysis" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <FiArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {stats?.recent_analyses?.length ? (
              stats.recent_analyses.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {a.analysis_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{a.summary || 'Processing...'}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {a.evaluation_scores?.grade && (
                      <span className="badge badge-info">{a.evaluation_scores.grade}</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {format(new Date(a.created_at), 'MMM d')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No analyses yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
