import type { 
  User, 
  Project, 
  Dataset, 
  DatasetVersion, 
  DataProfile, 
  DataQualityScore, 
  PatternResult, 
  InsightItem, 
  ChartRecommendation, 
  ChartPayload, 
  SummaryStatistics, 
  CorrelationMatrixData, 
  ColumnDistributionData, 
  CleaningOperation,
  UserSettings,
  Report,
  ApiResponse 
} from '../types';

const API_BASE = '/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('aether_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('aether_token', token);
    } else {
      localStorage.removeItem('aether_token');
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('aether_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const currentToken = this.getToken();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (currentToken && currentToken !== 'null' && currentToken !== 'undefined' && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkErr: any) {
      throw new Error(`Network error connecting to Aether backend: ${networkErr.message}`);
    }

    if (response.status === 401) {
      this.setToken(null);
    }

    if (!response.ok) {
      let errorMsg = `API Request failed with status ${response.status}`;
      if (response.status === 502) {
        errorMsg = 'Unable to reach the Aether backend service (502 Bad Gateway). Please verify that the backend is running on port 8000.';
      } else {
        try {
          const errorJson = await response.json();
          if (errorJson.detail) {
            errorMsg = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
          } else if (errorJson.error?.message) {
            errorMsg = errorJson.error.message;
          }
        } catch {
          // use fallback errorMsg
        }
      }
      throw new Error(errorMsg);
    }

    // Handle binary responses or direct downloads
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('application/pdf') || contentType.includes('application/octet-stream') || contentType.includes('text/csv'))) {
      return (await response.blob()) as unknown as T;
    }

    const json: ApiResponse<T> = await response.json();
    if (json.success === false) {
      throw new Error(json.error?.message || 'Operation failed on server');
    }
    return json.data !== undefined ? json.data : (json as unknown as T);
  }

  logout() {
    this.setToken(null);
  }

  // --- Auth Endpoints ---
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const cleanEmail = email.trim().toLowerCase();
    const res = await this.request<{ access_token: string; refresh_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, password }),
    });
    this.setToken(res.access_token);
    return { access_token: res.access_token, user: res.user };
  }

  async register(email: string, password: string, fullName?: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, password, full_name: fullName?.trim(), role: 'analyst' }),
    });
    await this.login(cleanEmail, password);
    return user;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async getUserSettings(): Promise<UserSettings> {
    return this.request<UserSettings>('/auth/settings');
  }

  async updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return this.request<UserSettings>('/auth/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  // --- Projects Endpoints ---
  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>('/projects/');
  }

  async createProject(name: string, description?: string): Promise<Project> {
    return this.request<Project>('/projects/', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  async deleteProject(id: string): Promise<void> {
    await this.request(`/projects/${id}`, { method: 'DELETE' });
  }

  async getProjectActivity(projectId: string): Promise<any[]> {
    return this.request<any[]>(`/projects/${projectId}/activity`);
  }

  // --- Datasets Endpoints ---
  async getDatasets(projectId: string): Promise<Dataset[]> {
    return this.request<Dataset[]>(`/datasets/?project_id=${projectId}`);
  }

  async uploadDataset(projectId: string, file: File): Promise<Dataset> {
    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('file', file);

    return this.request<Dataset>('/datasets/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async getDataset(id: string): Promise<{
    dataset: Dataset;
    versions: DatasetVersion[];
    latest_version: DatasetVersion;
  }> {
    return this.request<{
      dataset: Dataset;
      versions: DatasetVersion[];
      latest_version: DatasetVersion;
    }>(`/datasets/${id}`);
  }

  async deleteDataset(id: string): Promise<void> {
    await this.request(`/datasets/${id}`, { method: 'DELETE' });
  }

  async getDatasetPreview(id: string, versionNum?: number, page = 1, limit = 50): Promise<{
    dataset_id: string;
    version_number: number;
    total_rows: number;
    page: number;
    limit: number;
    columns: string[];
    rows: Record<string, any>[];
  }> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (versionNum) params.append('version_num', versionNum.toString());
    return this.request(`/datasets/${id}/preview?${params.toString()}`);
  }

  async getDatasetProfile(id: string): Promise<DataProfile> {
    return this.request<DataProfile>(`/datasets/${id}/profile`);
  }

  async getDatasetQuality(id: string): Promise<DataQualityScore> {
    return this.request<DataQualityScore>(`/datasets/${id}/quality`);
  }

  // --- Analytics Endpoints ---
  async getAnalyticsSummary(datasetId: string): Promise<SummaryStatistics> {
    return this.request<SummaryStatistics>(`/analytics/${datasetId}/summary`);
  }

  async getCorrelationMatrix(datasetId: string, method = 'pearson'): Promise<CorrelationMatrixData> {
    return this.request<CorrelationMatrixData>(`/analytics/${datasetId}/correlation?method=${method}`);
  }

  async getColumnDistribution(datasetId: string, column: string): Promise<ColumnDistributionData> {
    return this.request<ColumnDistributionData>(`/analytics/${datasetId}/distribution?column=${encodeURIComponent(column)}`);
  }

  async getGroupByAnalytics(datasetId: string, groupByColumn: string, targetColumn: string, aggregationFunc = 'mean'): Promise<any[]> {
    return this.request<any[]>(`/analytics/${datasetId}/group_by`, {
      method: 'POST',
      body: JSON.stringify({
        group_by_column: groupByColumn,
        target_column: targetColumn,
        aggregation_func: aggregationFunc
      }),
    });
  }

  // --- Visualizations Endpoints ---
  async getChartRecommendations(datasetId: string): Promise<ChartRecommendation[]> {
    return this.request<ChartRecommendation[]>(`/visualizations/${datasetId}/recommendations`);
  }

  async generateChartPayload(datasetId: string, params: {
    chart_type: string;
    x_column?: string;
    y_column?: string;
    group_by?: string;
    aggregation?: string;
    bins?: number;
    selected_columns?: string[];
  }): Promise<ChartPayload> {
    return this.request<ChartPayload>(`/visualizations/${datasetId}/chart`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // --- Patterns & Insights Endpoints ---
  async getPatterns(datasetId: string): Promise<PatternResult[]> {
    return this.request<PatternResult[]>(`/patterns/${datasetId}`);
  }

  async getInsights(datasetId: string): Promise<InsightItem[]> {
    return this.request<InsightItem[]>(`/insights/${datasetId}`);
  }

  // --- Copilot Endpoints ---
  async sendCopilotMessage(datasetId: string, message: string): Promise<{
    id: string;
    conversation_id: string;
    sender: 'user' | 'bot';
    content: string;
    evidence?: Record<string, any>;
    created_at: string;
  }> {
    return this.sendCopilotChat({ dataset_id: datasetId, message });
  }

  async sendCopilotChat(payload: {
    message: string;
    dataset_id?: string | null;
    conversation_id?: string | null;
    project_id?: string | null;
  }): Promise<{
    id: string;
    conversation_id: string;
    sender: 'user' | 'bot';
    content: string;
    evidence?: Record<string, any>;
    created_at: string;
  }> {
    return this.request('/copilot/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getCopilotConversations(): Promise<{
    id: string;
    user_id: string;
    dataset_id?: string;
    project_id?: string;
    dataset_name?: string;
    title?: string;
    last_message?: string;
    message_count: number;
    created_at: string;
    updated_at: string;
  }[]> {
    return this.request('/copilot/conversations');
  }

  async createCopilotConversation(payload?: {
    title?: string;
    dataset_id?: string;
    project_id?: string;
  }): Promise<{
    id: string;
    dataset_id?: string;
    project_id?: string;
    title?: string;
    messages: any[];
    created_at: string;
    updated_at: string;
  }> {
    return this.request('/copilot/conversations', {
      method: 'POST',
      body: payload ? JSON.stringify(payload) : undefined,
    });
  }

  async getCopilotConversation(conversationId: string): Promise<{
    id: string;
    dataset_id?: string;
    project_id?: string;
    title?: string;
    messages: {
      id: string;
      conversation_id: string;
      sender: 'user' | 'bot';
      content: string;
      evidence?: Record<string, any>;
      created_at: string;
    }[];
    created_at: string;
    updated_at: string;
  }> {
    return this.request(`/copilot/conversations/${conversationId}`);
  }

  async renameCopilotConversation(conversationId: string, title: string): Promise<any> {
    return this.request(`/copilot/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  }

  async deleteCopilotConversation(conversationId: string): Promise<any> {
    return this.request(`/copilot/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  async getCopilotHistory(datasetId: string): Promise<{
    id: string;
    dataset_id: string;
    messages: {
      id: string;
      sender: 'user' | 'bot';
      content: string;
      evidence?: Record<string, any>;
      created_at: string;
    }[];
  }> {
    return this.request(`/copilot/${datasetId}/history`);
  }

  async clearCopilotHistory(datasetId: string): Promise<void> {
    await this.request(`/copilot/${datasetId}/clear`, { method: 'DELETE' });
  }


  // --- Cleaning Endpoints ---
  async applyCleaningOperation(datasetId: string, operationType: string, parameters: Record<string, any>): Promise<CleaningOperation> {
    return this.request<CleaningOperation>(`/cleaning/${datasetId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ operation_type: operationType, parameters }),
    });
  }

  async getCleaningHistory(datasetId: string): Promise<CleaningOperation[]> {
    return this.request<CleaningOperation[]>(`/cleaning/${datasetId}/history`);
  }

  async rollbackCleaningVersion(datasetId: string, targetVersionNum: number): Promise<any> {
    return this.request(`/cleaning/${datasetId}/rollback?target_version_num=${targetVersionNum}`, {
      method: 'POST',
    });
  }

  // --- Reports & Export Endpoints ---
  async generatePdfReport(datasetId: string, payload?: any): Promise<Report> {
    return this.request<Report>(`/reports/${datasetId}/generate_pdf`, {
      method: 'POST',
      body: payload ? JSON.stringify(payload) : undefined
    });
  }

  async getReportHistory(datasetId: string): Promise<Report[]> {
    return this.request<Report[]>(`/reports/${datasetId}/history`);
  }

  async downloadPdfReportBlob(datasetId: string, suggestedFilename?: string, reportId?: string): Promise<void> {
    const currentToken = this.getToken();
    const headers: Record<string, string> = {};
    if (currentToken && currentToken !== 'null' && currentToken !== 'undefined') {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const queryParam = reportId ? `?report_id=${encodeURIComponent(reportId)}` : '';
    const url = `${API_BASE}/reports/${datasetId}/download_pdf${queryParam}`;
    let response: Response;
    try {
      response = await fetch(url, { headers });
    } catch {
      throw new Error('Unable to download the report. Please try again.');
    }

    if (response.status === 401) {
      this.setToken(null);
    }

    if (!response.ok) {
      let errorMsg = 'Unable to download the report. Please try again.';
      try {
        const errorJson = await response.json();
        if (errorJson.error?.message) {
          errorMsg = errorJson.error.message;
        } else if (errorJson.detail && typeof errorJson.detail === 'string') {
          errorMsg = errorJson.detail;
        }
      } catch {
        // use fallback errorMsg
      }
      throw new Error(errorMsg);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const errorJson = await response.json();
        throw new Error(errorJson.error?.message || errorJson.detail || 'Unable to download the report. Please try again.');
      } catch (e: any) {
        throw new Error(e.message || 'Unable to download the report. Please try again.');
      }
    }

    const contentDisposition = response.headers.get('content-disposition');
    let headerFilename = '';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        headerFilename = match[1];
      }
    }

    const blob = await response.blob();
    const filename = suggestedFilename || headerFilename || `Aether_Data_Analysis_Report_${datasetId.slice(0, 8)}.pdf`;
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  }

  async downloadExportBlob(datasetId: string, format = 'csv', suggestedFilename?: string): Promise<void> {
    const currentToken = this.getToken();
    const headers: Record<string, string> = {};
    if (currentToken && currentToken !== 'null' && currentToken !== 'undefined') {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const url = `${API_BASE}/reports/${datasetId}/export?format=${format}`;
    let response: Response;
    try {
      response = await fetch(url, { headers });
    } catch (netErr: any) {
      throw new Error(`Network error exporting dataset: ${netErr.message}`);
    }

    if (response.status === 401) {
      this.setToken(null);
    }

    if (!response.ok) {
      let errorMsg = `Failed to export dataset (HTTP ${response.status})`;
      try {
        const errorJson = await response.json();
        if (errorJson.error?.message) {
          errorMsg = errorJson.error.message;
        } else if (errorJson.detail) {
          errorMsg = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        // use fallback errorMsg
      }
      throw new Error(errorMsg);
    }

    const blob = await response.blob();
    const ext = format === 'excel' ? 'xlsx' : format;
    const filename = suggestedFilename || `aether-export-${datasetId.slice(0, 8)}.${ext}`;
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  }
}

export const api = new ApiClient();

