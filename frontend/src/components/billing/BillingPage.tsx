import React, { useState, useEffect, useCallback } from 'react';
import {
  FiPlus,
  FiDollarSign,
  FiClock,
  FiCheck,
  FiX,
  FiFilter,
} from 'react-icons/fi';
import api from '../../services/api';
import { BillingEntry, PaginatedResponse } from '../../types';

type FilterStatus = 'all' | 'billed' | 'unbilled';

interface EntryFormData {
  case: string;
  description: string;
  hours: string;
  rate: string;
  date: string;
}

const emptyForm: EntryFormData = {
  case: '',
  description: '',
  hours: '',
  rate: '',
  date: new Date().toISOString().split('T')[0],
};

const BillingPage: React.FC = () => {
  const [entries, setEntries] = useState<BillingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<EntryFormData>(emptyForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<PaginatedResponse<BillingEntry>>('/billing/');
      setEntries(response.data.results || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load billing entries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const filteredEntries = entries.filter((e) => {
    if (filterStatus === 'billed') return e.is_billed;
    if (filterStatus === 'unbilled') return !e.is_billed;
    return true;
  });

  // Summary calculations
  const totalBilled = entries
    .filter((e) => e.is_billed)
    .reduce((sum, e) => sum + e.amount, 0);
  const totalUnbilled = entries
    .filter((e) => !e.is_billed)
    .reduce((sum, e) => sum + e.amount, 0);
  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const averageRate =
    entries.length > 0
      ? entries.reduce((sum, e) => sum + e.rate, 0) / entries.length
      : 0;

  const openModal = () => {
    setFormData(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData(emptyForm);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      setFormError('Description is required');
      return;
    }
    if (!formData.hours || parseFloat(formData.hours) <= 0) {
      setFormError('Hours must be greater than 0');
      return;
    }
    if (!formData.rate || parseFloat(formData.rate) <= 0) {
      setFormError('Rate must be greater than 0');
      return;
    }
    setFormSubmitting(true);
    setFormError(null);
    try {
      const hours = parseFloat(formData.hours);
      const rate = parseFloat(formData.rate);
      await api.post('/billing/', {
        case: formData.case || null,
        description: formData.description,
        hours,
        rate,
        amount: hours * rate,
        date: formData.date,
        is_billed: false,
      });
      closeModal();
      fetchEntries();
    } catch (err: any) {
      setFormError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          'Failed to create entry'
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  const toggleBilled = async (entry: BillingEntry) => {
    try {
      await api.patch(`/billing/${entry.id}/`, {
        is_billed: !entry.is_billed,
      });
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, is_billed: !e.is_billed } : e
        )
      );
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update entry');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const summaryCards = [
    {
      label: 'Total Billed',
      value: formatCurrency(totalBilled),
      icon: FiDollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Total Unbilled',
      value: formatCurrency(totalUnbilled),
      icon: FiDollarSign,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Total Hours',
      value: totalHours.toFixed(1),
      icon: FiClock,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Average Rate',
      value: formatCurrency(averageRate),
      icon: FiDollarSign,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-gray-500 mt-1">Track time entries and manage billing.</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiPlus size={16} />
          Add Entry
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
          >
            <div className={`p-3 rounded-lg ${card.bg}`}>
              <card.icon className={card.color} size={22} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <FiFilter size={16} className="text-gray-400" />
        <span className="text-sm text-gray-500 mr-2">Status:</span>
        {(['all', 'billed', 'unbilled'] as FilterStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filterStatus === status
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FiDollarSign size={40} className="mb-3" />
            <p className="text-sm">No billing entries found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Case</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Hours</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Rate</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-600">{formatDate(entry.date)}</td>
                    <td className="px-6 py-4 text-gray-600">{entry.case || '-'}</td>
                    <td className="px-6 py-4 text-gray-900 max-w-xs truncate">{entry.description}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{entry.hours.toFixed(1)}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(entry.rate)}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(entry.amount)}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleBilled(entry)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                          entry.is_billed
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        }`}
                        title={entry.is_billed ? 'Mark as unbilled' : 'Mark as billed'}
                      >
                        {entry.is_billed ? (
                          <>
                            <FiCheck size={12} /> Billed
                          </>
                        ) : (
                          <>
                            <FiClock size={12} /> Unbilled
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add Billing Entry</h2>
              <button
                onClick={closeModal}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Case ID</label>
                  <input
                    type="text"
                    value={formData.case}
                    onChange={(e) => setFormData({ ...formData, case: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional case ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the work performed..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hours *</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.hours}
                      onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate ($/hr) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.rate}
                      onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {formData.hours && formData.rate && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <span className="text-gray-500">Total Amount: </span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(parseFloat(formData.hours) * parseFloat(formData.rate))}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {formSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiPlus size={16} />
                      Add Entry
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;
