from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import tempfile
import os
from PdfToText import extract_text_from_pdf
from TextPreprocess import preprocess_text
from check_similarity import check_similarity

app = Flask(__name__)
CORS(app)

@app.route('/check-similarity', methods=['POST'])
def check_submissions_similarity():
    try:
        data = request.json
        submissions = data.get('submissions', [])
        
        if len(submissions) < 2:
            return jsonify({
                'error': 'Need at least 2 submissions to check similarity'
            }), 400

        # Download PDFs and extract text
        submission_texts = []
        for submission in submissions:
            try:
                # Download PDF from URL
                response = requests.get(submission['fileUrl'])
                if response.status_code != 200:
                    continue

                # Save to temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
                    temp_file.write(response.content)
                    temp_path = temp_file.name

                # Extract text from PDF
                text = extract_text_from_pdf(temp_path)
                if text:
                    # Preprocess text
                    processed_text = preprocess_text(text)
                    submission_texts.append({
                        'submission': submission,
                        'text': processed_text
                    })

                # Clean up temporary file
                os.unlink(temp_path)

            except Exception as e:
                print(f"Error processing submission {submission['id']}: {str(e)}")
                continue

        # Check similarity between all pairs
        similarity_results = []
        for i in range(len(submission_texts)):
            for j in range(i + 1, len(submission_texts)):
                sub1 = submission_texts[i]
                sub2 = submission_texts[j]
                
                similarity = check_similarity(sub1['text'], sub2['text'])
                
                if similarity >= 0.6:  # 60% similarity threshold
                    similarity_results.append({
                        'submission1': {
                            'id': sub1['submission']['id'],
                            'userId': sub1['submission']['userId'],
                            'userName': sub1['submission']['userName'],
                            'userEmail': sub1['submission']['userEmail'],
                            'submittedAt': sub1['submission']['submittedAt']
                        },
                        'submission2': {
                            'id': sub2['submission']['id'],
                            'userId': sub2['submission']['userId'],
                            'userName': sub2['submission']['userName'],
                            'userEmail': sub2['submission']['userEmail'],
                            'submittedAt': sub2['submission']['submittedAt']
                        },
                        'similarity': similarity
                    })

        return jsonify({
            'results': similarity_results
        })

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(port=5002)
