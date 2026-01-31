import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiPlus, FiFilter, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useFetch } from '../../hooks/useApi';
import casesService, { CaseFilters } from '../../services/cases';
import { Case, PaginatedResponse } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';
import SearchBar from '../common/SearchBar';
import EmptyState from '../common/EmptyState';
import { format } from 'date-fns';

const statusOptions = ['', 'open', 'in_progress', 'under_review', 'closed', 'archived'];
const typeOptions = ['', 'civil', 'criminal', 'corporate', 'family', 'immigration', 'ip', 'tax', 'employment', 'other'];
const priorityOptions = ['', 'low', 'medium', 'high', 'critical'];
const sortOptions = [
  { value: '-created_at', label: 'Newest' },
  { value: 'created_at', label: 'Oldest' },
  { value: 'title', label: 'Title A-Z' },
  { value: '-priority', label: 'Priority' },
];

const CaseList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sort, setSort] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const filters: CaseFilters = {
    search: search || undefined,
    status: statusFilter || undefined,
    case_type: typeFilter || undefined,
    priority: priorityFilter || undefined,
    ordering: sort,
    page,
    page_size: 10,
  };

  const { data, isLoading } = useFetch<PaginatedResponse<Case>>(
    ['cases', JSON.stringify(filters)],
    () => casesService.list(filters),
    { keepPreviousData: true }
  );

  const totalPages = data ? Math.ceil(data.count / 10) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cases</h1>
          <p className="text-gray-500 mt-1">
            {data?.count ?? 0} total cases
          </p>
        </div>
        <Link to="/cases/new" className="btn-primary flex items-center gap-2">
          <FiPlus size={18} />
          New Case
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search cases..."
            className="flex-1"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-primary-100 text-primary-700' : ''}`}
          >
            <FiFilter size={16} />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="input-field text-sm"
              >
                <option value="">All Statuses</option>
                {statusOptions.filter(Boolean).map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="input-field text-sm"
              >
                <option value="">All Types</option>
                {typeOptions.filter(Boolean).map((t) => (
                  <option key={t} value={t}>{t.replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                className="input-field text-sm"
              >
                <option value="">All Priorities</option>
                {priorityOptions.filter(Boolean).map((p) => (
                  <option key={p} value={p}>{p.replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Sort</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="input-field text-sm"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Case Table */}
      {isLoading ? (
        <LoadingSpinner size="lg" text="Loading cases..." className="py-16" />
      ) : !data?.results?.length ? (
        <div className="card">
          <EmptyState
            title="No cases found"
            description="Create your first case to get started with AI-powered legal analysis."
            action={
              <Link to="/cases/new" className="btn-primary">
                Create Case
              </Link>
            }
          />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header px-6 py-3">Case</th>
                <th className="table-header px-6 py-3">Type</th>
                <th className="table-header px-6 py-3">Status</th>
                <th className="table-header px-6 py-3">Priority</th>
                <th className="table-header px-6 py-3">Client</th>
                <th className="table-header px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.results.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link to={`/cases/${c.id}`} className="block">
                      <p className="text-sm font-medium text-primary-600 hover:text-primary-700">{c.title}</p>
                      <p className="text-xs text-gray-500">{c.case_number}</p>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 capitalize">{c.case_type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={c.priority} variant="priority" />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{c.client?.name || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {format(new Date(c.created_at), 'MMM d, yyyy')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, data.count)} of {data.count}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft size={18} />
                </button>
                <span className="text-sm font-medium px-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!data.next}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CaseList;
