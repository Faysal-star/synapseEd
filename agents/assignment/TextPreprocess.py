import re
import nltk 
import ssl
ssl._create_default_https_context = ssl._create_unverified_context

nltk.download('punkt_tab')
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

# Download NLTK data

nltk.download("punkt")
nltk.download("stopwords")

def preprocess_text(text):
    # Lowercase and remove special characters
    text = re.sub(r"[^a-zA-Z0-9\s]", "", text.lower())
    # Tokenize and remove stopwords
    tokens = word_tokenize(text)
    tokens = [word for word in tokens if word not in stopwords.words("english")]
    return " ".join(tokens)
