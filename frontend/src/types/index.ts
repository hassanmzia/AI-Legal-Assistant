export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'attorney' | 'paralegal' | 'client';
  organization: string;
  bar_number: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  organization: string;
  notes: string;
  created_at: string;
}

export interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string;
  case_type: string;
  status: 'open' | 'in_progress' | 'under_review' | 'closed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  client: Client | null;
  client_id: string | null;
  assigned_to: User | null;
  court: string;
  judge: string;
  filing_date: string | null;
  next_hearing_date: string | null;
  case_text: string;
  ai_analysis: Record<string, any>;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  case: string | null;
  title: string;
  document_type: string;
  file: string;
  file_size: number;
  content_text: string;
  is_vectorized: boolean;
  created_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  case: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  session: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls: any[];
  metadata: Record<string, any>;
  created_at: string;
}

export interface AnalysisResult {
  id: string;
  case: string;
  analysis_type: string;
  input_text: string;
  result: Record<string, any>;
  summary: string;
  precedents_found: any[];
  loopholes_identified: any[];
  risk_score: number | null;
  recommendations: any[];
  tools_used: any[];
  evaluation_scores: EvaluationScores;
  processing_time: number;
  tokens_consumed: number;
  created_at: string;
}

export interface EvaluationScores {
  tool_correctness: { score: number; passed: boolean; correct_tools: string[]; missing_tools: string[] };
  task_completion: { score: number; passed: boolean; found_aspects: string[]; missing_aspects: string[] };
  answer_relevancy: { score: number; passed: boolean; relevant_aspects: string[] };
  content_coverage: { category_scores: Record<string, { score: number }>; average_coverage: number; overall_grade: string };
  overall_score: number;
  overall_passed: boolean;
  grade: string;
}

export interface CaseTimeline {
  id: string;
  case: string;
  event_type: string;
  title: string;
  description: string;
  event_date: string;
}

export interface BillingEntry {
  id: string;
  case: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
  date: string;
  is_billed: boolean;
}

export interface DashboardStats {
  total_cases: number;
  active_cases: number;
  total_clients: number;
  total_documents: number;
  total_analyses: number;
  recent_cases: Case[];
  case_by_status: Record<string, number>;
  case_by_type: Record<string, number>;
  recent_analyses: AnalysisResult[];
}

export interface A2AAgent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  status: 'online' | 'offline' | 'busy';
  tools: string[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
}
