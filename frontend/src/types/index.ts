export type ThemeMode = 'dark' | 'light' | 'system';

export interface User {
  id: string;
  email: string;
  fullName?: string;
  role: string;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isArchived: boolean;
  datasetCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DatasetColumnMeta {
  name: string;
  inferredType: 'numeric' | 'categorical' | 'datetime' | 'boolean' | 'identifier';
  nullCount: number;
  uniqueCount: number;
  sampleValues: any[];
}

export interface DatasetVersion {
  id: string;
  datasetId: string;
  versionNumber: number;
  storagePath: string;
  rowCount: number;
  columnCount: number;
  columnsMeta: DatasetColumnMeta[];
  createdAt: string;
}

export interface Dataset {
  id: string;
  projectId: string;
  userId: string;
  originalFilename: string;
  storagePath: string;
  fileType: string;
  fileSizeBytes: number;
  currentVersionNum: number;
  latestVersion?: DatasetVersion;
  createdAt: string;
  updatedAt: string;
}

export interface DataQualityScore {
  overallScore: number;
  completenessScore: number;
  uniquenessScore: number;
  validityScore: number;
  consistencyScore: number;
  detectedIssues: {
    issueType: string;
    column?: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
  }[];
}

export interface PatternResult {
  id: string;
  patternType: 'correlation' | 'anomaly' | 'cluster' | 'trend';
  variables: string[];
  metrics: Record<string, number>;
  evidence: any;
  explanation: string;
}

export interface InsightItem {
  id: string;
  title: string;
  type: string;
  description: string;
  evidence: any;
  aiInterpretation: string;
  confidenceScore: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: {
    code: string;
    message: string;
  };
}
