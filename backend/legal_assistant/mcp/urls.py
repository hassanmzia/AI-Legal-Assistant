from django.urls import path
from .server import mcp_list_tools, mcp_call_tool, mcp_list_resources, mcp_read_resource

urlpatterns = [
    path('tools/', mcp_list_tools, name='mcp-list-tools'),
    path('tools/call/', mcp_call_tool, name='mcp-call-tool'),
    path('resources/', mcp_list_resources, name='mcp-list-resources'),
    path('resources/read/', mcp_read_resource, name='mcp-read-resource'),
]
