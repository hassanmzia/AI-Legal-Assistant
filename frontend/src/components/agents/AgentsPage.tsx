import React, { useState, useEffect, useCallback } from 'react';
import { FiCpu, FiRefreshCw, FiX, FiSend, FiZap } from 'react-icons/fi';
import { orchestratorApi } from '../../services/api';
import { A2AAgent } from '../../types';

interface TaskResult {
  id: string;
  status: string;
  result?: any;
  error?: string;
}

const AgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<A2AAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedAgent, setSelectedAgent] = useState<A2AAgent | null>(null);
  const [taskInput, setTaskInput] = useState('');
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskResult, setTaskResult] = useState<TaskResult | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await orchestratorApi.get('/a2a/agents');
      setAgents(response.data.agents || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const openTestModal = (agent: A2AAgent) => {
    setSelectedAgent(agent);
    setTaskInput('');
    setTaskResult(null);
    setTaskError(null);
  };

  const closeModal = () => {
    setSelectedAgent(null);
    setTaskInput('');
    setTaskResult(null);
    setTaskError(null);
  };

  const submitTask = async () => {
    if (!selectedAgent || !taskInput.trim()) return;
    setTaskSubmitting(true);
    setTaskError(null);
    setTaskResult(null);
    try {
      const response = await orchestratorApi.post('/a2a/tasks', {
        agentId: selectedAgent.id,
        type: 'test',
        input: taskInput.trim(),
      });
      const taskId = response.data.id || response.data.taskId;
      if (taskId) {
        // Poll for result
        let attempts = 0;
        const poll = async () => {
          attempts++;
          try {
            const statusRes = await orchestratorApi.get(`/a2a/tasks/${taskId}`);
            const task = statusRes.data;
            if (task.status === 'completed' || task.status === 'failed' || attempts >= 20) {
              setTaskResult(task);
              setTaskSubmitting(false);
            } else {
              setTimeout(poll, 1500);
            }
          } catch {
            setTaskResult(response.data);
            setTaskSubmitting(false);
          }
        };
        setTimeout(poll, 1000);
      } else {
        setTaskResult(response.data);
        setTaskSubmitting(false);
      }
    } catch (err: any) {
      setTaskError(err.response?.data?.message || err.message || 'Failed to submit task');
      setTaskSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-gray-400';
      case 'busy':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-500 mt-1">View and manage AI agents in the system.</p>
        </div>
        <button
          onClick={fetchAgents}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <FiRefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Agent Grid */}
      {agents.length === 0 && !error ? (
        <div className="card">
          <p className="text-gray-400 text-center py-12">No agents found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              {/* Agent Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50">
                    <FiCpu className="text-indigo-600" size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-block w-2 h-2 rounded-full ${getStatusDot(agent.status)}`}></span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(agent.status)}`}
                      >
                        {agent.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{agent.description}</p>

              {/* Capabilities */}
              {agent.capabilities.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Capabilities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.capabilities.map((cap, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tools */}
              {agent.tools.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tools</p>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.tools.map((tool, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Test Button */}
              <button
                onClick={() => openTestModal(agent)}
                disabled={agent.status === 'offline'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <FiZap size={16} />
                Test Agent
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Test Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Test Agent: {selectedAgent.name}</h2>
                <p className="text-sm text-gray-500">Send a test task to this agent</p>
              </div>
              <button
                onClick={closeModal}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Input</label>
                <textarea
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your task input..."
                />
              </div>

              {taskError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {taskError}
                </div>
              )}

              {taskSubmitting && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                  Processing task...
                </div>
              )}

              {taskResult && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Result</p>
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                    {JSON.stringify(taskResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={submitTask}
                disabled={taskSubmitting || !taskInput.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <FiSend size={16} />
                Submit Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentsPage;
