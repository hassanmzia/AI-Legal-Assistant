import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useFetch } from '../../hooks/useApi';
import casesService from '../../services/cases';
import { Case } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';

interface CaseFormData {
  title: string;
  description: string;
  case_type: string;
  status: string;
  priority: string;
  court: string;
  judge: string;
  filing_date: string;
  next_hearing_date: string;
  case_text: string;
  tags: string;
}

const CaseForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: existingCase, isLoading: loadingCase } = useFetch<Case>(
    ['case', id!],
    () => casesService.get(id!),
    { enabled: isEditing }
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CaseFormData>({
    values: existingCase
      ? {
          title: existingCase.title,
          description: existingCase.description,
          case_type: existingCase.case_type,
          status: existingCase.status,
          priority: existingCase.priority,
          court: existingCase.court,
          judge: existingCase.judge,
          filing_date: existingCase.filing_date || '',
          next_hearing_date: existingCase.next_hearing_date || '',
          case_text: existingCase.case_text,
          tags: existingCase.tags?.join(', ') || '',
        }
      : undefined,
  });

  const onSubmit = async (data: CaseFormData) => {
    try {
      const payload: any = {
        ...data,
        tags: data.tags
          ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        filing_date: data.filing_date || null,
        next_hearing_date: data.next_hearing_date || null,
      };

      if (isEditing) {
        await casesService.update(id!, payload);
        toast.success('Case updated successfully');
      } else {
        const newCase = await casesService.create(payload);
        toast.success('Case created successfully');
        navigate(`/cases/${newCase.id}`);
        return;
      }
      navigate(`/cases/${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save case');
    }
  };

  if (isEditing && loadingCase) {
    return <LoadingSpinner size="lg" text="Loading case..." className="py-16" />;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Case' : 'New Case'}
        </h1>
        <p className="text-gray-500 mt-1">
          {isEditing ? 'Update case details' : 'Create a new legal case for analysis'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            {...register('title', { required: 'Title is required' })}
            className="input-field"
            placeholder="Enter case title"
          />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            {...register('description')}
            className="input-field"
            rows={3}
            placeholder="Brief case description"
          />
        </div>

        {/* Type, Status, Priority */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Case Type *</label>
            <select {...register('case_type', { required: 'Required' })} className="input-field">
              <option value="">Select type</option>
              <option value="civil">Civil</option>
              <option value="criminal">Criminal</option>
              <option value="corporate">Corporate</option>
              <option value="family">Family</option>
              <option value="immigration">Immigration</option>
              <option value="ip">Intellectual Property</option>
              <option value="tax">Tax</option>
              <option value="employment">Employment</option>
              <option value="other">Other</option>
            </select>
            {errors.case_type && <p className="text-red-500 text-xs mt-1">{errors.case_type.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select {...register('status')} className="input-field">
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="under_review">Under Review</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select {...register('priority')} className="input-field">
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Court & Judge */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Court</label>
            <input {...register('court')} className="input-field" placeholder="Court name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judge</label>
            <input {...register('judge')} className="input-field" placeholder="Presiding judge" />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filing Date</label>
            <input {...register('filing_date')} type="date" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Hearing</label>
            <input {...register('next_hearing_date')} type="date" className="input-field" />
          </div>
        </div>

        {/* Case Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Case Text / Details</label>
          <textarea
            {...register('case_text')}
            className="input-field font-mono text-sm"
            rows={8}
            placeholder="Enter full case text for AI analysis..."
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
          <input
            {...register('tags')}
            className="input-field"
            placeholder="Comma-separated tags (e.g., contract, dispute, urgent)"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Case' : 'Create Case'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CaseForm;
