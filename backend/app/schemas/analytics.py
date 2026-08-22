from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime

class PatternResponse(BaseModel):
    id: str
    dataset_version_id: str
    pattern_type: str
    variables: Dict[str, Any]
    statistical_metrics: Dict[str, Any]
    evidence: Dict[str, Any]
    explanation: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class InsightResponse(BaseModel):
    id: str
    dataset_version_id: str
    title: str
    insight_type: str
    description: str
    computed_evidence: Dict[str, Any]
    ai_interpretation: str
    confidence_score: float
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class VisualizationRequest(BaseModel):
    chart_type: str # bar | line | scatter | histogram | heatmap | pie | box
    x_column: str
    y_column: Optional[str] = None
    group_by: Optional[str] = None
    aggregation: Optional[str] = "sum" # sum | mean | count | min | max
