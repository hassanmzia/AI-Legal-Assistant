"""
MCP (Model Context Protocol) server integration for exposing legal assistant
tools and resources to external AI agents.
"""
import json
import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ..agents.tools import get_all_tools
from ..agents.rag import search_similar, get_collection_stats

logger = logging.getLogger(__name__)

MCP_TOOLS = {
    "rag_search": {
        "name": "rag_search",
        "description": "Search legal case documents using RAG for similar precedents",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query for legal information",
                }
            },
            "required": ["query"],
        },
    },
    "web_search": {
        "name": "web_search",
        "description": "Search web for recent legal cases and precedents via Tavily",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Web search query",
                }
            },
            "required": ["query"],
        },
    },
    "analyze_loopholes": {
        "name": "analyze_loopholes",
        "description": "Analyze legal case for loopholes and weaknesses",
        "inputSchema": {
            "type": "object",
            "properties": {
                "case_summary": {
                    "type": "string",
                    "description": "Case summary to analyze",
                }
            },
            "required": ["case_summary"],
        },
    },
    "risk_assessment": {
        "name": "risk_assessment",
        "description": "Assess legal risks and outcome probabilities",
        "inputSchema": {
            "type": "object",
            "properties": {
                "case_summary": {
                    "type": "string",
                    "description": "Case to assess",
                }
            },
            "required": ["case_summary"],
        },
    },
    "contract_review": {
        "name": "contract_review",
        "description": "Review contract for issues and missing clauses",
        "inputSchema": {
            "type": "object",
            "properties": {
                "contract_text": {
                    "type": "string",
                    "description": "Contract text to review",
                }
            },
            "required": ["contract_text"],
        },
    },
    "compliance_check": {
        "name": "compliance_check",
        "description": "Check regulatory compliance for legal matters",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Compliance query",
                }
            },
            "required": ["query"],
        },
    },
}


@csrf_exempt
@require_http_methods(["GET"])
def mcp_list_tools(request):
    """MCP endpoint: List available tools."""
    return JsonResponse({"tools": list(MCP_TOOLS.values())})


@csrf_exempt
@require_http_methods(["POST"])
def mcp_call_tool(request):
    """MCP endpoint: Execute a tool."""
    try:
        body = json.loads(request.body)
        tool_name = body.get("name")
        arguments = body.get("arguments", {})

        tools = {t.name: t for t in get_all_tools()}

        tool_mapping = {
            "rag_search": "rag_search_tool",
            "web_search": "tavily_web_search_tool",
            "analyze_loopholes": "analyze_loopholes_tool",
            "risk_assessment": "risk_assessment_tool",
            "contract_review": "contract_review_tool",
            "compliance_check": "compliance_check_tool",
        }

        actual_tool_name = tool_mapping.get(tool_name)
        if not actual_tool_name or actual_tool_name not in tools:
            return JsonResponse(
                {"error": f"Unknown tool: {tool_name}"}, status=400
            )

        tool = tools[actual_tool_name]
        result = tool.invoke(arguments)

        return JsonResponse({
            "content": [{"type": "text", "text": result}],
            "isError": False,
        })
    except Exception as e:
        logger.error(f"MCP tool call error: {e}")
        return JsonResponse({
            "content": [{"type": "text", "text": str(e)}],
            "isError": True,
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def mcp_list_resources(request):
    """MCP endpoint: List available resources."""
    try:
        stats = get_collection_stats()
    except Exception:
        stats = {"count": 0}

    return JsonResponse({
        "resources": [
            {
                "uri": "legal://knowledge-base",
                "name": "Legal Knowledge Base",
                "description": f"Vector store with {stats['count']} document chunks",
                "mimeType": "application/json",
            }
        ]
    })


@csrf_exempt
@require_http_methods(["POST"])
def mcp_read_resource(request):
    """MCP endpoint: Read a resource."""
    try:
        body = json.loads(request.body)
        uri = body.get("uri", "")

        if uri == "legal://knowledge-base":
            stats = get_collection_stats()
            return JsonResponse({
                "contents": [{"uri": uri, "text": json.dumps(stats)}]
            })

        return JsonResponse({"error": "Unknown resource"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
