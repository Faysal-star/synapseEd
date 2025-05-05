# Lecture Planner API

A Flask-based RESTful API with Swagger UI for generating and refining lecture plans using LangChain and OpenAI.

## Setup

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

2. Set up your environment variables:
Create a `.env` file with your OpenAI API key:
```
OPENAI_API_KEY=your_api_key_here
```

3. Run the application:
```bash
python app.py
```

4. Access the Swagger UI:
Open your browser and navigate to:
```
http://localhost:5005/swagger/
```
or simply:
```
http://localhost:5005/
```

## Swagger UI Features

The API includes a comprehensive Swagger UI that allows you to:

- Explore all available endpoints
- View request/response models with examples
- Test API endpoints directly from the browser
- Understand error responses and expected HTTP status codes
- View detailed parameter descriptions and requirements

## API Endpoints

### Status Check
- **GET** `/status/`
- Returns the operational status of the API and available tools

### Generate a Lecture Plan
- **POST** `/lectures/`
- Request body:
```json
{
  "query": "Introduction to Quantum Computing",
  "level": "beginner"
}
```

### Update Topics
- **PUT** `/lectures/{id}/topics`
- Request body:
```json
{
  "topics": [
    {"Quantum Bits": ["Superposition", "Entanglement"]},
    {"Quantum Gates": ["Hadamard Gate", "CNOT Gate", "Pauli Gates"]}
  ]
}
```

### Update Teaching Methods
- **PUT** `/lectures/{id}/teaching-methods`
- Request body:
```json
{
  "teaching_methods": ["Interactive Lectures", "Problem-Based Learning", "Visual Demonstrations"]
}
```

### Update Resources
- **PUT** `/lectures/{id}/resources`
- Request body:
```json
{
  "resources": ["Quantum Computing Textbook", "Online Quantum Simulators", "Scientific Articles"]
}
```

### Update Learning Objectives
- **PUT** `/lectures/{id}/learning-objectives`
- Request body:
```json
{
  "learning_objectives": [
    "Understand quantum superposition",
    "Apply quantum principles to simple algorithms",
    "Explain quantum entanglement"
  ]
}
```

## Using the API with Swagger UI

1. Navigate to http://localhost:5005/swagger/
2. Click on an endpoint to expand it
3. Click the "Try it out" button
4. Fill in the required parameters
5. Click "Execute" to send the request
6. View the response below

## Troubleshooting

### Missing Dependencies
If you encounter the error "ModuleNotFoundError: No module named 'duckduckgo_search'", ensure you have installed all required dependencies:

```bash
pip install -U duckduckgo-search wikipedia
```

### API Key Issues
If the API returns a 500 error mentioning OpenAI API key, make sure:
1. You have a valid OpenAI API key
2. The key is correctly set in your `.env` file
3. The file is in the same directory as app.py

### Checking API Status
You can check the status of the API and available tools using the `/status/` endpoint in the Swagger UI.

## Note

This implementation currently doesn't include persistent storage. The ID parameter in the update endpoints is a placeholder for future implementation with a database. 