# Lecture Planner Integration

This folder contains the frontend components for the Lecture Planner feature that integrates with the Flask API backend.

## Structure

- `page.tsx`: Main container component that renders the Lecture Planner UI
- `lecture_planner_api.tsx`: Component that handles API interactions with the Flask backend
- `README.md`: This documentation file

## Backend API Integration

The Lecture Planner integrates with a Flask API backend located at `http://localhost:5005`. The API endpoints are:

1. **Generate Lecture Plan**
   - `POST /lectures/`
   - Request: `{ "query": string, "level": "beginner" | "intermediate" | "advanced" }`
   - Response: A complete lecture plan object

2. **Update Learning Objectives**
   - `PUT /lectures/{id}/learning-objectives`
   - Request: `{ "learning_objectives": string[] }`
   - Response: Updated lecture plan object

3. **Update Topics**
   - `PUT /lectures/{id}/topics`
   - Request: `{ "topics": { [key: string]: string[] }[] }`
   - Response: Updated lecture plan object

4. **Update Teaching Methods**
   - `PUT /lectures/{id}/teaching-methods`
   - Request: `{ "teaching_methods": string[] }`
   - Response: Updated lecture plan object

5. **Update Resources**
   - `PUT /lectures/{id}/resources`
   - Request: `{ "resources": string[] }`
   - Response: Updated lecture plan object

## Frontend Implementation

The frontend provides a user-friendly interface for:

1. Generating new lecture plans by specifying a topic and education level
2. Editing learning objectives, topics, teaching methods, and resources
3. Viewing the generated lecture plans in a structured format

The UI includes various features:
- Tabs for different sections of the lecture plan
- Editable fields for all plan components
- Real-time updates that reflect changes made via the API

## Usage

To use the Lecture Planner:

1. Navigate to the AI Agents section of the dashboard
2. Select "Lecture Planner" from the available agents
3. Click "Launch Lecture Planner" to access the full interface
4. Enter a topic and select an education level
5. Click "Generate Lecture Plan" to create a new plan
6. Use the edit buttons to modify different sections of the plan

## Future Improvements

Planned enhancements for the Lecture Planner:
- PDF export functionality
- Saving lecture plans to a database
- Sharing options for collaboration
- Template management
- Integration with curriculum standards 