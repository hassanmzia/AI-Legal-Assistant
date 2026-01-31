"""
Evaluation system for AI legal analysis quality assessment.
Implements metrics matching the notebook's DeepEval-inspired evaluation:
TaskCompletion, ToolCorrectness, AnswerRelevancy, and content coverage.
"""
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


def evaluate_tool_correctness(
    actual_tools: List[Dict],
    expected_tool_names: List[str]
) -> Dict[str, Any]:
    """
    Evaluate whether the agent used the correct tools.

    Args:
        actual_tools: List of tool call dicts with 'name' key.
        expected_tool_names: List of expected tool names.

    Returns:
        Evaluation result with score and details.
    """
    actual_names = [t.get('name', '') for t in actual_tools]

    expected_set = set(expected_tool_names)
    actual_set = set(actual_names)

    correct = expected_set.intersection(actual_set)
    missing = expected_set - actual_set
    extra = actual_set - expected_set

    score = len(correct) / len(expected_set) if expected_set else 1.0

    return {
        "score": score,
        "correct_tools": list(correct),
        "missing_tools": list(missing),
        "extra_tools": list(extra),
        "total_expected": len(expected_set),
        "total_actual": len(actual_set),
        "passed": score >= 0.7,
    }


def evaluate_task_completion(
    analysis_output: str,
    required_aspects: List[str]
) -> Dict[str, Any]:
    """
    Evaluate whether the analysis covers all required aspects.

    Args:
        analysis_output: The full text output of the analysis.
        required_aspects: List of aspects that should be covered.

    Returns:
        Evaluation result with score and details.
    """
    output_lower = analysis_output.lower()

    found = []
    missing = []

    for aspect in required_aspects:
        if aspect.lower() in output_lower:
            found.append(aspect)
        else:
            missing.append(aspect)

    score = len(found) / len(required_aspects) if required_aspects else 1.0

    return {
        "score": score,
        "found_aspects": found,
        "missing_aspects": missing,
        "passed": score >= 0.6,
    }


def evaluate_answer_relevancy(
    analysis_output: str,
    key_aspects: List[str]
) -> Dict[str, Any]:
    """
    Evaluate relevancy of the analysis to key legal aspects.

    Args:
        analysis_output: The full text output of the analysis.
        key_aspects: List of key aspects to check for relevancy.

    Returns:
        Evaluation result with score and details.
    """
    output_lower = analysis_output.lower()

    found = []
    for aspect in key_aspects:
        if aspect.lower() in output_lower:
            found.append(aspect)

    score = len(found) / len(key_aspects) if key_aspects else 1.0

    return {
        "score": score,
        "relevant_aspects": found,
        "total_checked": len(key_aspects),
        "passed": score >= 0.7,
    }


def evaluate_content_coverage(analysis_output: str) -> Dict[str, Any]:
    """
    Comprehensive content coverage analysis matching the notebook's
    analyze_agent_performance function.

    Args:
        analysis_output: The full text output of the analysis.

    Returns:
        Detailed coverage analysis with category scores and overall grade.
    """
    output_lower = analysis_output.lower()

    coverage_checks = {
        "Precedent Cases": ["precedent", "citation", "court ruled", "case law"],
        "Force Majeure": ["force majeure", "impossibility", "pandemic", "supply chain"],
        "Notice Requirements": ["notice", "written", "procedural", "invoke"],
        "Damages Analysis": ["damages", "documentary evidence", "substantiat", "compensation"],
        "Legal Issues": ["loophole", "weakness", "evidentiary gap", "burden of proof"],
        "Strategic Recommendations": ["recommend", "strategy", "should", "advise"],
        "Jurisdictional": ["jurisdiction", "court", "venue"],
        "Risk Assessment": ["risk", "probability", "likelihood", "exposure"],
    }

    category_scores = {}
    for category, keywords in coverage_checks.items():
        matches = sum(1 for kw in keywords if kw in output_lower)
        category_scores[category] = {
            "score": (matches / len(keywords)) * 100,
            "matches": matches,
            "total": len(keywords),
        }

    avg_coverage = sum(c["score"] for c in category_scores.values()) / len(category_scores)

    words = len(analysis_output.split())
    sentences = (
        analysis_output.count('.')
        + analysis_output.count('!')
        + analysis_output.count('?')
    )

    return {
        "category_scores": category_scores,
        "average_coverage": avg_coverage,
        "word_count": words,
        "sentence_count": sentences,
        "length_adequacy": min(100, (words / 800) * 100),
        "overall_grade": (
            "A" if avg_coverage >= 80
            else "B" if avg_coverage >= 70
            else "C" if avg_coverage >= 60
            else "D" if avg_coverage >= 50
            else "F"
        ),
    }


def run_full_evaluation(
    analysis_output: str,
    tools_used: List[Dict]
) -> Dict[str, Any]:
    """
    Run the complete evaluation suite matching the notebook's
    run_complete_evaluation function.

    Args:
        analysis_output: The full text output from the agent.
        tools_used: List of tool call dicts from the agent run.

    Returns:
        Comprehensive evaluation results with overall score and grade.
    """
    expected_tools = [
        "rag_search_tool",
        "tavily_web_search_tool",
        "analyze_loopholes_tool",
    ]

    tool_eval = evaluate_tool_correctness(tools_used, expected_tools)

    required_aspects = [
        "force majeure", "notice", "damages", "precedent",
        "loophole", "recommendation", "evidence", "breach",
    ]
    task_eval = evaluate_task_completion(analysis_output, required_aspects)

    key_aspects = [
        "force majeure defense", "notice requirements",
        "documentary evidence", "damages calculation",
        "procedural requirements",
    ]
    relevancy_eval = evaluate_answer_relevancy(analysis_output, key_aspects)

    coverage_eval = evaluate_content_coverage(analysis_output)

    overall_score = (
        tool_eval["score"] * 0.2
        + task_eval["score"] * 0.3
        + relevancy_eval["score"] * 0.3
        + (coverage_eval["average_coverage"] / 100) * 0.2
    )

    return {
        "tool_correctness": tool_eval,
        "task_completion": task_eval,
        "answer_relevancy": relevancy_eval,
        "content_coverage": coverage_eval,
        "overall_score": overall_score,
        "overall_passed": overall_score >= 0.6,
        "grade": (
            "A" if overall_score >= 0.8
            else "B" if overall_score >= 0.7
            else "C" if overall_score >= 0.6
            else "D" if overall_score >= 0.5
            else "F"
        ),
    }
