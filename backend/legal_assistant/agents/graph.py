import os
import time
import logging
import uuid
from typing import Annotated, Literal, TypedDict, List, Dict, Any

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver

from .tools import get_all_tools, get_llm

logger = logging.getLogger(__name__)


class AgentState(TypedDict):
    """State schema for the legal analysis agent workflow."""
    messages: Annotated[list, add_messages]
    case_text: str
    final_analysis: str
    analysis_type: str
    tools_used: list
    iteration_count: int


SYSTEM_PROMPTS = {
    'full_analysis': """You are an expert legal analysis AI agent specializing in comprehensive case analysis.

**Case to Analyze:**
{case_text}

**Your Task:**
Conduct a comprehensive legal analysis by:
1. Searching for similar precedent cases using rag_search_tool
2. Finding recent legal developments using tavily_web_search_tool
3. Analyzing for loopholes using analyze_loopholes_tool
4. Assessing risks using risk_assessment_tool

**Analysis Framework:**
- Force majeure defenses and procedural requirements
- Notice requirements and timelines
- Burden of proof and evidence standards
- Contributory negligence considerations
- Damages calculation and substantiation
- Jurisdictional analysis
- Statute of limitations review

After gathering all information, provide a comprehensive final analysis synthesizing:
- Relevant precedents found
- Identified procedural loopholes
- Evidentiary weaknesses
- Risk assessment with probability estimates
- Strategic recommendations for all parties

Be thorough and use all available tools before concluding.""",

    'loophole_detection': """You are a senior legal analyst specializing in finding case weaknesses.

**Case to Analyze:**
{case_text}

Use analyze_loopholes_tool and rag_search_tool to identify:
1. Procedural loopholes
2. Evidentiary gaps
3. Jurisdictional issues
4. Statute of limitations concerns
5. Constitutional challenges

Provide specific, actionable findings.""",

    'precedent_search': """You are a legal research specialist.

**Research Query:**
{case_text}

Use rag_search_tool and tavily_web_search_tool to find:
1. Directly relevant precedent cases
2. Recent legal developments
3. Applicable statutes and regulations
4. Legal commentary and analysis

Provide comprehensive research results with citations.""",

    'risk_assessment': """You are a legal risk assessment specialist.

**Case to Assess:**
{case_text}

Use risk_assessment_tool and analyze_loopholes_tool to provide:
1. Overall risk rating
2. Outcome probability estimates
3. Key risk factors
4. Mitigation strategies
5. Financial exposure analysis""",

    'contract_review': """You are a contract review specialist.

**Contract to Review:**
{case_text}

Use contract_review_tool and compliance_check_tool to identify:
1. Missing clauses
2. Ambiguous language
3. Compliance issues
4. Risk areas
5. Recommendations""",

    'compliance_check': """You are a regulatory compliance specialist.

**Matter to Check:**
{case_text}

Use compliance_check_tool and tavily_web_search_tool to verify:
1. Regulatory compliance status
2. Required filings
3. Deadlines
4. Potential violations
5. Remediation steps"""
}

MAX_ITERATIONS = 10


def agent_node(state: AgentState) -> AgentState:
    """Main agent node that processes messages and decides on tool usage."""
    messages = state["messages"]
    case_text = state.get("case_text", "")
    analysis_type = state.get("analysis_type", "full_analysis")
    iteration_count = state.get("iteration_count", 0)

    prompt_template = SYSTEM_PROMPTS.get(analysis_type, SYSTEM_PROMPTS['full_analysis'])
    system_prompt = SystemMessage(content=prompt_template.format(case_text=case_text))

    tools = get_all_tools()
    llm = get_llm()
    llm_with_tools = llm.bind_tools(tools)

    response = llm_with_tools.invoke([system_prompt] + messages)

    return {
        "messages": [response],
        "iteration_count": iteration_count + 1
    }


def should_continue(state: AgentState) -> Literal["tools", "end"]:
    """Determine whether to continue with tool calls or end the workflow."""
    last_message = state["messages"][-1]
    iteration_count = state.get("iteration_count", 0)

    if iteration_count >= MAX_ITERATIONS:
        return "end"

    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"

    return "end"


def build_graph():
    """Build and compile the LangGraph agent workflow."""
    tools = get_all_tools()

    workflow = StateGraph(AgentState)
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", ToolNode(tools))
    workflow.set_entry_point("agent")
    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {"tools": "tools", "end": END}
    )
    workflow.add_edge("tools", "agent")

    memory = MemorySaver()
    graph = workflow.compile(checkpointer=memory)
    return graph


def run_analysis(
    case_text: str,
    analysis_type: str = 'full_analysis',
    thread_id: str = None
) -> Dict[str, Any]:
    """
    Run a complete legal analysis workflow.

    Args:
        case_text: The legal case text or query to analyze.
        analysis_type: Type of analysis to perform.
        thread_id: Optional thread ID for conversation continuity.

    Returns:
        Dictionary with analysis results, tools used, and metadata.
    """
    start_time = time.time()

    if not thread_id:
        thread_id = str(uuid.uuid4())

    graph = build_graph()

    initial_state = {
        "messages": [
            HumanMessage(
                content=f"Analyze this legal case for {analysis_type.replace('_', ' ')}."
            )
        ],
        "case_text": case_text,
        "final_analysis": "",
        "analysis_type": analysis_type,
        "tools_used": [],
        "iteration_count": 0,
    }

    config = {"configurable": {"thread_id": thread_id}}

    tool_calls_made = []
    final_content = ""

    try:
        for step_output in graph.stream(initial_state, config, stream_mode="values"):
            last_message = step_output["messages"][-1]

            if isinstance(last_message, AIMessage):
                if hasattr(last_message, "tool_calls") and last_message.tool_calls:
                    for tc in last_message.tool_calls:
                        tool_calls_made.append({
                            "name": tc["name"],
                            "arguments": tc["args"]
                        })
                elif last_message.content:
                    final_content = last_message.content
            elif isinstance(last_message, ToolMessage):
                if tool_calls_made:
                    tool_calls_made[-1]["output"] = last_message.content[:1000]
    except Exception as e:
        logger.error(f"Agent workflow error: {e}")
        final_content = f"Analysis encountered an error: {str(e)}"

    processing_time = time.time() - start_time

    return {
        "analysis": final_content,
        "tools_used": tool_calls_made,
        "processing_time": processing_time,
        "thread_id": thread_id,
        "analysis_type": analysis_type,
    }
