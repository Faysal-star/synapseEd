from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def check_similarity(text1, text2):
    # Validate inputs and provide detailed logging
    if not text1 or not text2:
        print("Warning: Null text provided for similarity check")
        return 0.0
    
    text1, text2 = str(text1).strip(), str(text2).strip()
    if not text1 or not text2:
        print("Warning: Empty text provided for similarity check")
        return 0.0
        
    try:
        # Create TF-IDF vectors
        vectorizer = TfidfVectorizer(min_df=1, stop_words='english')
        vectors = vectorizer.fit_transform([text1, text2])
        
        # Check if vectors are valid for similarity calculation
        if vectors.shape[1] == 0:
            print("Warning: No valid terms found in texts after vectorization")
            print(f"Text1 length: {len(text1)}, Text2 length: {len(text2)}")
            print(f"Sample text1: {text1[:100]}")
            print(f"Sample text2: {text2[:100]}")
            return 0.0
            
        similarity = cosine_similarity(vectors[0], vectors[1])
        similarity_score = float(similarity[0][0])
        
        print(f"{similarity_score}")
        return similarity_score
    except Exception as e:
        print(f"Error calculating similarity: {str(e)}")
        return 0.0
