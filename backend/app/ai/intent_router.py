import re
from typing import Dict, Any, List, Optional, Tuple

class IntentType:
    GENERAL_CHAT = "GENERAL_CHAT"
    GENERAL_EXPLANATION = "GENERAL_EXPLANATION"
    DATASET_OVERVIEW = "DATASET_OVERVIEW"
    DATA_QUALITY = "DATA_QUALITY"
    MISSING_VALUES = "MISSING_VALUES"
    DUPLICATES = "DUPLICATES"
    STATISTICS = "STATISTICS"
    CORRELATION = "CORRELATION"
    DISTRIBUTION = "DISTRIBUTION"
    OUTLIERS = "OUTLIERS"
    ANOMALY_ANALYSIS = "ANOMALY_ANALYSIS"
    COMPARISON = "COMPARISON"
    TREND = "TREND"
    VISUALIZATION = "VISUALIZATION"
    CHART_EXPLANATION = "CHART_EXPLANATION"
    PATTERN_ANALYSIS = "PATTERN_ANALYSIS"
    REPORT = "REPORT"
    CLEANING = "CLEANING"
    EXPORT = "EXPORT"


class IntentRouter:
    """
    Context-aware Intent Router for Aether AI Copilot.
    Dispatches user messages to precise analytical tools, visualization pipelines,
    report generators, or natural conversational intelligence.
    """

    def classify_intent(
        self,
        message: str,
        has_active_dataset: bool = False,
        conversation_history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        msg = message.strip()
        msg_lower = msg.lower()
        history = conversation_history or []

        # 1. Check conversational follow-ups first (pronouns, "show me", "add to report", "why?", etc.)
        followup = self._detect_conversational_followup(msg_lower, history, has_active_dataset)
        if followup:
            return followup

        # 2. Greetings and general pleasantries
        if self._is_greeting(msg_lower) and not self._contains_data_keywords(msg_lower):
            return {
                "primary_intent": IntentType.GENERAL_CHAT,
                "is_general": True,
                "requires_data": False,
                "action": "greeting"
            }

        # 3. Report & PDF actions
        report_intent = self._detect_report_actions(msg_lower, has_active_dataset)
        if report_intent:
            return report_intent

        # 4. Chart & Visualization creation / refinement
        viz_intent = self._detect_visualization_actions(msg_lower, has_active_dataset)
        if viz_intent:
            return viz_intent

        # 5. Missing values & null checks
        if any(w in msg_lower for w in ["missing value", "missing values", "null value", "null values", "null count", "missing count", "most missing", "empty cells", "nan"]):
            if has_active_dataset:
                return {
                    "primary_intent": IntentType.MISSING_VALUES,
                    "is_general": False,
                    "requires_data": True,
                    "action": "missing_values"
                }

        # 6. Duplicates
        if any(w in msg_lower for w in ["duplicate", "duplicates", "duplicated rows", "duplicate records"]):
            if has_active_dataset:
                return {
                    "primary_intent": IntentType.DUPLICATES,
                    "is_general": False,
                    "requires_data": True,
                    "action": "duplicates"
                }

        # 7. Data Quality & Cleaning
        if any(w in msg_lower for w in ["what should i clean", "what to clean", "how to clean", "clean first", "cleaning"]):
            return {
                "primary_intent": IntentType.CLEANING,
                "is_general": not has_active_dataset,
                "requires_data": has_active_dataset,
                "action": "clean_first"
            }

        if any(w in msg_lower for w in ["data-quality", "data quality", "quality problem", "quality issue", "wrong with my data", "problematic", "hygiene score", "quality score"]):
            return {
                "primary_intent": IntentType.DATA_QUALITY,
                "is_general": not has_active_dataset,
                "requires_data": has_active_dataset,
                "action": "data_quality"
            }

        # 8. Correlations & Relationships
        if any(w in msg_lower for w in ["correlation", "correlations", "relationship", "relationships", "strongest correlation", "correlated", "pearson"]):
            if has_active_dataset and not (msg_lower.startswith("what is correlation") and len(msg_lower.split()) <= 4):
                return {
                    "primary_intent": IntentType.CORRELATION,
                    "is_general": False,
                    "requires_data": True,
                    "action": "correlation"
                }
            elif not has_active_dataset or msg_lower.startswith("what is correlation") or "explain correlation" in msg_lower:
                return {
                    "primary_intent": IntentType.GENERAL_EXPLANATION,
                    "is_general": True,
                    "requires_data": False,
                    "action": "explain_concept"
                }

        # 9. Outliers & Anomalies
        if any(w in msg_lower for w in ["outlier", "outliers", "anomaly", "anomalies", "extreme value", "extreme values"]):
            return {
                "primary_intent": IntentType.OUTLIERS,
                "is_general": not has_active_dataset,
                "requires_data": has_active_dataset,
                "action": "outliers"
            }

        # 10. Patterns & Key findings
        if any(w in msg_lower for w in ["pattern", "patterns", "finding", "findings", "important findings", "key drivers", "discoveries"]):
            return {
                "primary_intent": IntentType.PATTERN_ANALYSIS,
                "is_general": not has_active_dataset,
                "requires_data": has_active_dataset,
                "action": "patterns"
            }

        # 11. Distributions
        if any(w in msg_lower for w in ["distribution", "distributions", "skew", "skewness", "spread"]):
            return {
                "primary_intent": IntentType.DISTRIBUTION,
                "is_general": not has_active_dataset,
                "requires_data": has_active_dataset,
                "action": "distribution"
            }

        # 12. Statistics (Average, Mean, Variance, Min, Max, Count, etc.)
        stat_keywords = ["average", "mean", "median", "variance", "highest variance", "standard deviation", "std", "maximum", "minimum", "summary statistics", "stats"]
        if any(k in msg_lower for k in stat_keywords):
            if has_active_dataset:
                return {
                    "primary_intent": IntentType.STATISTICS,
                    "is_general": False,
                    "requires_data": True,
                    "action": "statistics"
                }

        # 13. Trends & Comparisons
        if any(w in msg_lower for w in ["trend", "trends", "over time", "seasonality"]):
            return {
                "primary_intent": IntentType.TREND,
                "is_general": not has_active_dataset,
                "requires_data": has_active_dataset,
                "action": "trend"
            }

        if any(w in msg_lower for w in ["compare", "comparison", "difference between"]):
            return {
                "primary_intent": IntentType.COMPARISON,
                "is_general": not has_active_dataset,
                "requires_data": has_active_dataset,
                "action": "comparison"
            }

        # 14. Dataset Overview ("Explain my dataset", "Analyze my dataset", "How many rows", etc.)
        overview_keywords = ["explain my dataset", "explain this dataset", "analyze my dataset", "analyze the dataset", "how many rows", "how many columns", "overview of my data", "profile my data", "about my dataset"]
        if any(k in msg_lower for k in overview_keywords) or (has_active_dataset and "dataset" in msg_lower and any(w in msg_lower for w in ["explain", "analyze", "overview", "summary", "rows", "features"])):
            return {
                "primary_intent": IntentType.DATASET_OVERVIEW,
                "is_general": False,
                "requires_data": has_active_dataset,
                "action": "analyze_dataset"
            }

        # 15. General technical / coding / conceptual questions without dataset binding
        general_concepts = [
            "what is", "how does", "explain", "python", "sql", "api", "rest", "recursion",
            "machine learning", "neural network", "regression", "classification", "clustering",
            "docker", "fastapi", "react", "javascript", "typescript", "git", "database"
        ]
        if any(k in msg_lower for k in general_concepts) and not any(w in msg_lower for w in ["my dataset", "this dataset", "our data", "active dataset"]):
            return {
                "primary_intent": IntentType.GENERAL_EXPLANATION,
                "is_general": True,
                "requires_data": False,
                "action": "general_explanation"
            }

        # 16. Fallback based on dataset presence
        if has_active_dataset:
            return {
                "primary_intent": IntentType.DATASET_OVERVIEW,
                "is_general": False,
                "requires_data": True,
                "action": "query_dataset"
            }

        return {
            "primary_intent": IntentType.GENERAL_CHAT,
            "is_general": True,
            "requires_data": False,
            "action": "general_answer"
        }

    def _is_greeting(self, msg: str) -> bool:
        greetings = {"hello", "hi", "hey", "good morning", "good afternoon", "good evening", "greetings", "sup", "what's up", "what can you do", "who are you"}
        cleaned = re.sub(r"[^\w\s]", "", msg).strip()
        return cleaned in greetings or cleaned.startswith("hello ") or cleaned.startswith("hi ") or cleaned.startswith("hey ")

    def _contains_data_keywords(self, msg: str) -> bool:
        return any(w in msg for w in ["dataset", "data", "report", "chart", "plot", "row", "column", "metric", "table"])

    def _detect_conversational_followup(
        self,
        msg: str,
        history: List[Dict[str, Any]],
        has_active_dataset: bool
    ) -> Optional[Dict[str, Any]]:
        # "show me" / "show it" / "can you show it?"
        if msg in ["show me", "show me.", "show it", "show it.", "can you show it", "can you show it?", "show this", "plot it", "visualize it"]:
            return {
                "primary_intent": IntentType.VISUALIZATION,
                "is_general": False,
                "requires_data": has_active_dataset,
                "action": "show_last_context_chart"
            }

        # "why?" / "explain that" / "explain why" / "why is that?"
        if msg in ["why", "why?", "why.", "explain that", "explain that.", "explain why", "why is that", "why is that?"]:
            return {
                "primary_intent": IntentType.GENERAL_EXPLANATION,
                "is_general": not has_active_dataset,
                "requires_data": has_active_dataset,
                "action": "explain_previous_context"
            }

        # "explain that finding in simple language" / "now explain it technically"
        if "simple language" in msg or "like i'm a beginner" in msg or "in layman's terms" in msg:
            return {
                "primary_intent": IntentType.GENERAL_EXPLANATION,
                "is_general": False,
                "requires_data": has_active_dataset,
                "action": "explain_simple"
            }
        if "technically" in msg or "technical language" in msg or "mathematical" in msg:
            return {
                "primary_intent": IntentType.GENERAL_EXPLANATION,
                "is_general": False,
                "requires_data": has_active_dataset,
                "action": "explain_technical"
            }

        # "explain the current chart" / "explain that chart" / "what does this chart mean"
        if any(w in msg for w in ["explain that chart", "explain the chart", "explain this chart", "explain the current chart", "what does this graph mean", "what does this chart mean"]):
            return {
                "primary_intent": IntentType.CHART_EXPLANATION,
                "is_general": False,
                "requires_data": has_active_dataset,
                "action": "explain_chart"
            }

        # "add this to my report" / "add that to my report"
        if any(w in msg for w in ["add this to my report", "add that to my report", "include this in report", "save to report"]):
            return {
                "primary_intent": IntentType.REPORT,
                "is_general": False,
                "requires_data": has_active_dataset,
                "action": "add_to_report"
            }

        return None

    def _detect_report_actions(self, msg: str, has_active_dataset: bool) -> Optional[Dict[str, Any]]:
        if any(w in msg for w in ["download it", "download pdf", "download report", "give me download link", "get pdf"]):
            return {
                "primary_intent": IntentType.EXPORT,
                "is_general": False,
                "requires_data": has_active_dataset,
                "action": "download_pdf"
            }
        if any(w in msg for w in ["generate pdf", "create pdf", "export pdf", "make pdf", "build pdf"]):
            return {
                "primary_intent": IntentType.EXPORT,
                "is_general": False,
                "requires_data": has_active_dataset,
                "action": "generate_pdf"
            }
        if any(w in msg for w in ["create a report", "create report", "generate report", "generate a report", "make a report", "make a detailed report", "create a detailed report", "detailed report", "compile report", "produce a report"]):
            return {
                "primary_intent": IntentType.REPORT,
                "is_general": False,
                "requires_data": has_active_dataset,
                "action": "create_report"
            }
        if any(w in msg for w in ["more professional", "executive level", "refine report", "enhance report", "executive tone"]):
            return {
                "primary_intent": IntentType.REPORT,
                "is_general": False,
                "requires_data": has_active_dataset,
                "action": "enhance_report"
            }
        return None

    def _detect_visualization_actions(self, msg: str, has_active_dataset: bool) -> Optional[Dict[str, Any]]:
        # Refinements
        if "make it a bar" in msg or "change to bar" in msg or ("bar chart" in msg and any(w in msg for w in ["make", "change", "convert", "switch", "show as"])):
            return {"primary_intent": IntentType.VISUALIZATION, "is_general": False, "requires_data": has_active_dataset, "action": "refine_chart", "new_type": "bar_vertical"}
        if "make it horizontal" in msg or "horizontal bar" in msg:
            return {"primary_intent": IntentType.VISUALIZATION, "is_general": False, "requires_data": has_active_dataset, "action": "refine_chart", "new_type": "bar_horizontal"}
        if "make it a line" in msg or ("line chart" in msg and any(w in msg for w in ["make", "change", "convert", "switch"])):
            return {"primary_intent": IntentType.VISUALIZATION, "is_general": False, "requires_data": has_active_dataset, "action": "refine_chart", "new_type": "line"}

        viz_triggers = [
            "create a histogram", "make a histogram", "plot a histogram", "histogram for", "histogram of",
            "show a histogram", "make a bar chart", "create a bar chart", "bar chart of", "plot a bar chart",
            "scatter plot", "plot scatter", "create a scatter", "heatmap", "box plot", "donut chart", "pie chart",
            "visualize", "show the correlation", "plot the correlation", "show chart", "draw a chart", "generate a chart"
        ]
        if any(t in msg for t in viz_triggers):
            return {
                "primary_intent": IntentType.VISUALIZATION,
                "is_general": False,
                "requires_data": has_active_dataset,
                "action": "create_chart",
                "chart_type": self._extract_chart_type(msg)
            }
        return None

    def _extract_chart_type(self, msg: str) -> str:
        if "scatter" in msg:
            return "scatter"
        if "histogram" in msg or "distribution" in msg:
            return "histogram"
        if "heatmap" in msg or "correlation" in msg:
            return "heatmap"
        if "box" in msg or "outlier" in msg:
            return "box"
        if "pie" in msg:
            return "pie"
        if "donut" in msg:
            return "donut"
        if "line" in msg or "trend" in msg:
            return "line"
        if "horizontal" in msg:
            return "bar_horizontal"
        return "bar_vertical"


intent_router = IntentRouter()
