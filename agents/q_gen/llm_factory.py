from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.language_models import BaseLLM
# dotenv
from dotenv import load_dotenv
import os
load_dotenv()
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY")


class LLMFactory:
    """Factory class to create LLM instances based on provider"""
    
    @staticmethod
    def create_llm(provider="openai", model=None, temperature=0.7, **kwargs) -> BaseLLM:
        """Create and return an LLM instance
        
        Args:
            provider: The LLM provider (openai, google)
            model: The specific model to use (defaults to provider's standard model)
            temperature: Creativity setting (0.0-1.0)
            **kwargs: Additional provider-specific parameters
            
        Returns:
            An instance of BaseLLM
        """
        if provider == "openai":
            model = model or "gpt-4o"
            return ChatOpenAI(model=model, temperature=temperature, **kwargs)
        elif provider == "google":
            model = model or "gemini-pro"
            return ChatGoogleGenerativeAI(model=model, temperature=temperature, **kwargs)
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")