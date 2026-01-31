import os
import logging
from typing import List, Optional
from langchain.tools import tool
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.messages import HumanMessage
from langchain_community.tools.tavily_search import TavilySearchResults
import chromadb

logger = logging.getLogger(__name__)


def get_llm():
    """Get the configured LLM instance."""
    return ChatOpenAI(
        model=os.environ.get('OPENAI_MODEL', 'gpt-4o-mini'),
        temperature=0,
    )


def get_embedding_model():
    """Get the configured embedding model instance."""
    return OpenAIEmbeddings(
        model=os.environ.get('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small')
    )


def get_chroma_client():
    """Get the configured ChromaDB client."""
    return chromadb.HttpClient(
        host=os.environ.get('CHROMA_HOST', 'chromadb'),
        port=int(os.environ.get('CHROMA_PORT', '8000'))
    )


@tool
def rag_search_tool(query: str) -> str:
    """Search legal case documents using RAG for similar precedents and relevant information."""
    try:
        client = get_chroma_client()
        embedding_model = get_embedding_model()

        collection = client.get_or_create_collection(name="legal_cases")

        if collection.count() == 0:
            return "RAG system has no documents. Please upload legal documents first."

        query_embedding = embedding_model.embed_query(query)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=5
        )

        if not results['documents'][0]:
            return "No relevant legal precedents found."

        formatted = []
        for i, doc in enumerate(results['documents'][0], 1):
            metadata = results['metadatas'][0][i - 1] if results['metadatas'][0] else {}
            source = metadata.get('source', 'Knowledge Base')
            formatted.append(f"Precedent {i} (Source: {source}):\n{doc}")

        return "\n\n".join(formatted)
    except Exception as e:
        logger.error(f"RAG search error: {e}")
        return f"RAG search encountered an error: {str(e)}"


@tool
def tavily_web_search_tool(query: str) -> str:
    """Search the web using Tavily for recent legal cases, precedents, and legal developments."""
    try:
        tavily_tool = TavilySearchResults(max_results=5)
        results = tavily_tool.invoke({"query": query})

        if not results:
            return "No web search results found."

        formatted = []
        for i, result in enumerate(results, 1):
            content = result.get("content", "No content available")
            url = result.get("url", "No URL")
            formatted.append(f"Result {i}:\n{content}\nSource: {url}")

        return "\n\n".join(formatted)
    except Exception as e:
        logger.error(f"Tavily search error: {e}")
        return f"Web search encountered an error: {str(e)}"


@tool
def analyze_loopholes_tool(case_summary: str) -> str:
    """Analyze legal case to identify potential loopholes, weaknesses, and strategic opportunities."""
    try:
        llm = get_llm()
        analysis_prompt = f"""You are a senior legal analyst. Analyze the following case and identify potential loopholes:

Case Summary:
{case_summary}

Identify:
1. Procedural loopholes
2. Evidentiary gaps
3. Jurisdictional issues
4. Statute of limitations concerns
5. Constitutional challenges
6. Contractual ambiguities
7. Notice requirement failures
8. Burden of proof weaknesses

Provide a detailed analysis with reasoning for each identified loophole."""

        response = llm.invoke([HumanMessage(content=analysis_prompt)])
        return response.content
    except Exception as e:
        logger.error(f"Loophole analysis error: {e}")
        return f"Loophole analysis encountered an error: {str(e)}"


@tool
def risk_assessment_tool(case_summary: str) -> str:
    """Assess legal risks and provide probability estimates for case outcomes."""
    try:
        llm = get_llm()
        prompt = f"""You are a legal risk assessment specialist. Evaluate the following case:

Case Summary:
{case_summary}

Provide:
1. Overall risk level (Low/Medium/High/Critical) with score 0-100
2. Probability of favorable outcome for plaintiff (0-100%)
3. Probability of favorable outcome for defendant (0-100%)
4. Key risk factors with individual scores
5. Mitigation strategies for each risk
6. Financial exposure assessment
7. Timeline risk factors
8. Reputational risk considerations

Format as structured analysis with clear categories."""

        response = llm.invoke([HumanMessage(content=prompt)])
        return response.content
    except Exception as e:
        logger.error(f"Risk assessment error: {e}")
        return f"Risk assessment encountered an error: {str(e)}"


@tool
def contract_review_tool(contract_text: str) -> str:
    """Review a contract for potential issues, missing clauses, and areas of concern."""
    try:
        llm = get_llm()
        prompt = f"""You are a contract review specialist. Review the following contract:

Contract Text:
{contract_text}

Analyze:
1. Missing standard clauses
2. Ambiguous language
3. Unfavorable terms
4. Compliance issues
5. Liability exposure
6. Termination provisions
7. Dispute resolution mechanisms
8. Force majeure provisions
9. Indemnification adequacy
10. Intellectual property protections

Provide specific recommendations for each identified issue."""

        response = llm.invoke([HumanMessage(content=prompt)])
        return response.content
    except Exception as e:
        logger.error(f"Contract review error: {e}")
        return f"Contract review encountered an error: {str(e)}"


@tool
def compliance_check_tool(query: str) -> str:
    """Check regulatory compliance for legal matters."""
    try:
        llm = get_llm()
        prompt = f"""You are a regulatory compliance specialist. Analyze the following matter:

Query:
{query}

Check compliance with:
1. Relevant federal regulations
2. State/local regulations
3. Industry-specific requirements
4. Filing deadlines and requirements
5. Reporting obligations
6. Data protection requirements
7. Anti-money laundering provisions
8. Consumer protection laws

Provide a compliance status report with action items."""

        response = llm.invoke([HumanMessage(content=prompt)])
        return response.content
    except Exception as e:
        logger.error(f"Compliance check error: {e}")
        return f"Compliance check encountered an error: {str(e)}"


def get_all_tools():
    """Return all available legal analysis tools."""
    return [
        rag_search_tool,
        tavily_web_search_tool,
        analyze_loopholes_tool,
        risk_assessment_tool,
        contract_review_tool,
        compliance_check_tool,
    ]
