import os
import uuid
import logging
from typing import List, Dict, Any

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
import chromadb

logger = logging.getLogger(__name__)


def get_chroma_client():
    """Get the configured ChromaDB HTTP client."""
    return chromadb.HttpClient(
        host=os.environ.get('CHROMA_HOST', 'chromadb'),
        port=int(os.environ.get('CHROMA_PORT', '8000'))
    )


def get_embedding_model():
    """Get the configured OpenAI embedding model."""
    return OpenAIEmbeddings(
        model=os.environ.get('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small')
    )


def initialize_rag_with_documents(
    documents: List[Dict[str, Any]],
    collection_name: str = "legal_cases"
) -> List[str]:
    """
    Initialize RAG system with documents.

    Args:
        documents: List of dicts with 'content' and 'metadata' keys.
        collection_name: ChromaDB collection name.

    Returns:
        List of vector IDs for all created chunks.
    """
    client = get_chroma_client()
    embedding_model = get_embedding_model()

    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""]
    )

    all_ids = []
    for doc in documents:
        content = doc.get('content', '')
        metadata = doc.get('metadata', {})

        chunks = text_splitter.split_text(content)

        for i, chunk in enumerate(chunks):
            doc_id = str(uuid.uuid4())
            embedding = embedding_model.embed_query(chunk)

            chunk_metadata = {
                **metadata,
                "chunk_index": i,
                "total_chunks": len(chunks),
            }

            collection.add(
                ids=[doc_id],
                embeddings=[embedding],
                documents=[chunk],
                metadatas=[chunk_metadata]
            )
            all_ids.append(doc_id)

    logger.info(
        f"RAG initialized with {len(all_ids)} chunks in collection '{collection_name}'"
    )
    return all_ids


def search_similar(
    query: str,
    n_results: int = 5,
    collection_name: str = "legal_cases"
) -> List[Dict[str, Any]]:
    """
    Search for similar documents in the vector store.

    Args:
        query: Search query string.
        n_results: Maximum number of results to return.
        collection_name: ChromaDB collection name.

    Returns:
        List of matching documents with content, metadata, and distance.
    """
    client = get_chroma_client()
    embedding_model = get_embedding_model()

    collection = client.get_or_create_collection(name=collection_name)

    if collection.count() == 0:
        return []

    query_embedding = embedding_model.embed_query(query)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(n_results, collection.count())
    )

    formatted = []
    for i in range(len(results['documents'][0])):
        formatted.append({
            "content": results['documents'][0][i],
            "metadata": results['metadatas'][0][i] if results['metadatas'][0] else {},
            "distance": results['distances'][0][i] if results.get('distances') else None,
        })

    return formatted


def delete_document_vectors(
    vector_ids: List[str],
    collection_name: str = "legal_cases"
):
    """Delete specific vectors from the collection by their IDs."""
    client = get_chroma_client()
    collection = client.get_or_create_collection(name=collection_name)
    if vector_ids:
        collection.delete(ids=vector_ids)
        logger.info(f"Deleted {len(vector_ids)} vectors from '{collection_name}'")


def get_collection_stats(collection_name: str = "legal_cases") -> Dict[str, Any]:
    """Get statistics about the ChromaDB collection."""
    client = get_chroma_client()
    collection = client.get_or_create_collection(name=collection_name)
    return {
        "count": collection.count(),
        "name": collection_name,
    }
