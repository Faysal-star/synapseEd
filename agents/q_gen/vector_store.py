from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VectorStoreManager:
    def __init__(self, embedding_provider="openai"):
        """Initialize vector store with configurable embedding model"""
        self.embedding_provider = embedding_provider
        self.embeddings = self._get_embeddings()
        self.vector_store = None
        
    def _get_embeddings(self):
        """Get the appropriate embedding model based on provider"""
        if self.embedding_provider == "openai":
            return OpenAIEmbeddings()
        elif self.embedding_provider == "google":
            return GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        else:
            raise ValueError(f"Unsupported embedding provider: {self.embedding_provider}")
            
    def create_vector_store(self, chunks):
        """Create and return a FAISS vector store from document chunks"""
        self.vector_store = FAISS.from_documents(chunks, self.embeddings)
        return self.vector_store
        
    def save_vector_store(self, directory):
        """Save the vector store to disk"""
        if self.vector_store:
            self.vector_store.save_local(directory)
            
    def load_vector_store(self, directory):
        """Load vector store from disk"""
        self.vector_store = FAISS.load_local(directory, self.embeddings)
        return self.vector_store