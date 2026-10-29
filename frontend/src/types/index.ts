export type ThemeMode = 'light';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  fullName?: string;
  role: string;
  is_active?: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_archived: boolean;
  dataset_count?: number;
  created_at: string;
  updated_at: string;
}

export interface DatasetColumnMeta {
  name: string;
  inferred_type: 'numeric' | 'categorical' | 'datetime' | 'boolean' | 'identifier';
  null_count: number;
  unique_count: number;
  sample_values: any[];
}

export interface DatasetVersion {
  id: string;
  dataset_id: string;
  version_number: number;
  storage_path: string;
  row_count: number;
  column_count: number;
  columns_meta: Record<string, any> | DatasetColumnMeta[];
  created_at: string;
}

export interface Dataset {
  id: string;
  project_id: string;
  user_id: string;
  original_filename: string;
  storage_path: string;
  file_type: string;
  file_size_bytes: number;
  current_version_num: number;
  latest_version?: DatasetVersion;
  created_at: string;
  updated_at: string;
}

export interface DataQualityScore {
  id?: string;
  dataset_version_id?: string;
  overall_score: number;
  completeness_score: number;
  uniqueness_score: number;
  validity_score: number;
  consistency_score: number;
  detected_issues: {
    issues_summary?: string[];
    null_cells_count?: number;
    duplicate_rows_count?: number;
    outlier_cells_count?: number;
    [key: string]: any;
  };
}

export interface DataProfile {
  id?: string;
  dataset_version_id?: string;
  numeric_summary?: Record<string, {
    count: number;
    mean: number;
    std: number;
    min: number;
    q25: number;
    median: number;
    q75: number;
    max: number;
    variance?: number;
    skewness?: number;
  }>;
  categorical_summary?: Record<string, any>;
  datetime_summary?: Record<string, any>;
  data_types: Record<string, string>;
}

export interface PatternResult {
  id: string;
  dataset_version_id: string;
  pattern_type: 'correlation' | 'anomaly' | 'cluster' | 'segmentation_cluster' | 'trend' | string;
  variables: Record<string, any>;
  statistical_metrics: Record<string, any>;
  evidence: Record<string, any>;
  explanation: string;
  created_at?: string;
}

export interface InsightItem {
  id: string;
  dataset_version_id: string;
  title: string;
  insight_type: string;
  description: string;
  computed_evidence: Record<string, any>;
  ai_interpretation: string;
  confidence_score: number;
  created_at?: string;
}

export type SupportedChartType =
  | 'bar_vertical'
  | 'bar_horizontal'
  | 'line'
  | 'area'
  | 'scatter'
  | 'histogram'
  | 'box'
  | 'heatmap'
  | 'pie'
  | 'donut';

export interface ChartConfig {
  chartType: SupportedChartType;
  xColumn: string;
  yColumn?: string;
  groupColumn?: string;
  aggregation?: 'sum' | 'mean' | 'count' | 'min' | 'max';
  bins?: number;
  selectedColumns?: string[];
}

export interface ChartRecommendation {
  title: string;
  chart_type: string;
  x_column: string;
  y_column?: string;
  group_by?: string;
  aggregation?: string;
  reason: string;
}

export interface ChartPayload {
  chart_type: string;
  x_axis_title?: string;
  y_axis_title?: string;
  column?: string;
  group_column?: string;
  categories?: string[];
  series?: { name: string; data: (number | null)[] }[];
  points?: { x: number; y: number; category: string }[];
  bins?: { range: string; count: number; start?: number; end?: number }[];
  bin_count?: number;
  total_observations?: number;
  x_labels?: string[];
  y_labels?: string[];
  z_matrix?: number[][];
  min?: number;
  q1?: number;
  median?: number;
  q3?: number;
  max?: number;
  outliers?: number[];
  labels?: string[];
  values?: number[];
  title?: string;
  is_donut?: boolean;
  raw_data?: { category?: string; value: number }[];
  raw_values?: number[];
}

export interface SummaryStatistics {
  dataset_id: string;
  version_number: number;
  total_rows: number;
  total_columns: number;
  summary_statistics: Record<string, {
    count: number;
    mean: number;
    std: number;
    min: number;
    q25: number;
    median: number;
    q75: number;
    max: number;
    variance: number;
    skewness: number;
  }>;
}

export interface CorrelationMatrixData {
  method: string;
  columns: string[];
  matrix: number[][];
}

export interface ColumnDistributionData {
  column: string;
  type: 'numeric_binned' | 'categorical';
  total_count: number;
  bins?: { bin: string; count: number; percentage: number }[];
  distribution?: { value: string; count: number; percentage: number }[];
}

export interface CleaningOperation {
  id: string;
  dataset_id: string;
  source_version_id: string;
  target_version_id: string;
  operation_type: string;
  parameters: Record<string, any>;
  affected_rows_count?: number;
  new_version_number?: number;
  details?: string;
  status?: string;
  created_at: string;
}

export type CleaningOperationItem = CleaningOperation;

export interface UserSettings {
  theme: 'light';
  date_format: string;
  number_format: string;
  copilot_enabled: boolean;
  copilot_style: 'concise' | 'balanced' | 'detailed';
  copilot_level: 'beginner' | 'intermediate' | 'advanced';
  ai_processing_enabled: boolean;
  outlier_method: 'iqr' | 'zscore' | 'isolation_forest';
  correlation_method: 'pearson' | 'spearman';
  missing_value_strategy: 'mean' | 'median' | 'mode' | 'drop';
  max_chart_count: number;
  report_title_template: string;
  report_include_summary: boolean;
  report_include_quality: boolean;
  report_include_stats: boolean;
  report_include_charts: boolean;
  report_include_correlations: boolean;
  report_include_patterns: boolean;
  report_include_insights: boolean;
  report_include_recommendations: boolean;
  report_include_cleaning: boolean;
  notify_analysis_complete: boolean;
  notify_cleaning_complete: boolean;
  notify_report_ready: boolean;
  notify_errors: boolean;
}

export interface Report {
  id: string;
  user_id: string;
  dataset_version_id: string;
  title: string;
  file_format: string;
  storage_path: string;
  summary_data: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  } | null;
}

