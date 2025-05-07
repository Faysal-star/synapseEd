from flask import Blueprint, request, jsonify, current_app
from flask_restx import Api, Resource, fields, Namespace
import logging
import json
from . import service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint for lecture planner
lecture_planner_bp = Blueprint('lecture_planner', __name__)

# Create a Namespace for the API
ns = Namespace('lecture-planner', description='Lecture planning operations')

# Define request models for API documentation
lecture_request = ns.model('LectureRequest', {
    'query': fields.String(required=True, description='Lecture topic or description', example='Introduction to Quantum Computing'),
    'level': fields.String(required=False, description='Student level (beginner, intermediate, advanced)', 
                          default='beginner', enum=['beginner', 'intermediate', 'advanced'])
})

topic_model = ns.model('Topic', {
    'main_topic': fields.String(required=True, description='Main topic name', example='Quantum Computing'),
    'subtopics': fields.List(fields.String, required=True, description='List of subtopics', example=['Quantum Bits', 'Quantum Gates'])
})

update_topics_model = ns.model('UpdateTopics', {
    'topics': fields.List(fields.Raw, required=True, description='Updated topics and subtopics', 
                         example=[{'Quantum Bits': ['Superposition', 'Entanglement']}, 
                                 {'Quantum Gates': ['Hadamard Gate', 'CNOT Gate']}])
})

update_methods_model = ns.model('UpdateMethods', {
    'teaching_methods': fields.List(fields.String, required=True, description='Updated teaching methods', 
                                   example=['Interactive Lectures', 'Problem-Based Learning', 'Visual Demonstrations'])
})

update_resources_model = ns.model('UpdateResources', {
    'resources': fields.List(fields.String, required=True, description='Updated resources', 
                            example=['Quantum Computing Textbook', 'Online Quantum Simulators', 'Scientific Articles'])
})

update_objectives_model = ns.model('UpdateObjectives', {
    'learning_objectives': fields.List(fields.String, required=True, description='Updated learning objectives', 
                                      example=['Understand quantum superposition', 'Apply quantum principles to simple algorithms'])
})

# Storage for lecture plans - in a real app, this would be a database
# For this prototype, we'll use a simple dict
lecture_plans = {}

@ns.route('/generate')
class GenerateLectureAPI(Resource):
    @ns.expect(lecture_request)
    def post(self):
        """Generate a new lecture plan"""
        try:
            data = request.json
            query = data.get('query')
            level = data.get('level', 'beginner')
            
            if not query:
                return {'error': 'Query parameter is required'}, 400
                
            # Get OpenAI client
            client = current_app.config.get('OPENAI_CLIENT')
            if not client:
                return {'error': 'OpenAI client not available'}, 500
                
            # Generate lecture plan
            lecture_plan = service.create_lecture_plan(client, query, level)
            
            # Store plan with a unique ID (in a real app, save to a database)
            import uuid
            plan_id = str(uuid.uuid4())
            lecture_plans[plan_id] = lecture_plan
            
            # Return the plan with its ID
            return {
                'id': plan_id,
                'plan': lecture_plan
            }, 201
            
        except Exception as e:
            logger.error(f"Error generating lecture plan: {e}")
            return {'error': str(e)}, 500

@ns.route('/<string:plan_id>')
@ns.param('plan_id', 'The lecture plan identifier')
class LecturePlanAPI(Resource):
    def get(self, plan_id):
        """Get a specific lecture plan"""
        if plan_id not in lecture_plans:
            return {'error': 'Lecture plan not found'}, 404
            
        return {
            'id': plan_id,
            'plan': lecture_plans[plan_id]
        }
        
    def delete(self, plan_id):
        """Delete a lecture plan"""
        if plan_id not in lecture_plans:
            return {'error': 'Lecture plan not found'}, 404
            
        del lecture_plans[plan_id]
        return {'message': 'Lecture plan deleted successfully'}, 200

@ns.route('/<string:plan_id>/topics')
@ns.param('plan_id', 'The lecture plan identifier')
class TopicsAPI(Resource):
    @ns.expect(update_topics_model)
    def put(self, plan_id):
        """Update topics for a lecture plan"""
        if plan_id not in lecture_plans:
            return {'error': 'Lecture plan not found'}, 404
            
        try:
            data = request.json
            topics = data.get('topics')
            
            if not topics:
                return {'error': 'Topics are required'}, 400
                
            # Get the original plan
            original_plan = lecture_plans[plan_id]
            
            # Get OpenAI client
            client = current_app.config.get('OPENAI_CLIENT')
            if not client:
                return {'error': 'OpenAI client not available'}, 500
                
            # Update the plan
            updated_plan = service.update_lecture_plan(client, original_plan, 'topics', topics)
            
            # Save the updated plan
            lecture_plans[plan_id] = updated_plan
            
            return {
                'id': plan_id,
                'plan': updated_plan
            }
            
        except Exception as e:
            logger.error(f"Error updating topics: {e}")
            return {'error': str(e)}, 500

@ns.route('/<string:plan_id>/teaching-methods')
@ns.param('plan_id', 'The lecture plan identifier')
class TeachingMethodsAPI(Resource):
    @ns.expect(update_methods_model)
    def put(self, plan_id):
        """Update teaching methods for a lecture plan"""
        if plan_id not in lecture_plans:
            return {'error': 'Lecture plan not found'}, 404
            
        try:
            data = request.json
            methods = data.get('teaching_methods')
            
            if not methods:
                return {'error': 'Teaching methods are required'}, 400
                
            # Get the original plan
            original_plan = lecture_plans[plan_id]
            
            # Get OpenAI client
            client = current_app.config.get('OPENAI_CLIENT')
            if not client:
                return {'error': 'OpenAI client not available'}, 500
                
            # Update the plan
            updated_plan = service.update_lecture_plan(client, original_plan, 'teaching_methods', methods)
            
            # Save the updated plan
            lecture_plans[plan_id] = updated_plan
            
            return {
                'id': plan_id,
                'plan': updated_plan
            }
            
        except Exception as e:
            logger.error(f"Error updating teaching methods: {e}")
            return {'error': str(e)}, 500

@ns.route('/<string:plan_id>/resources')
@ns.param('plan_id', 'The lecture plan identifier')
class ResourcesAPI(Resource):
    @ns.expect(update_resources_model)
    def put(self, plan_id):
        """Update resources for a lecture plan"""
        if plan_id not in lecture_plans:
            return {'error': 'Lecture plan not found'}, 404
            
        try:
            data = request.json
            resources = data.get('resources')
            
            if not resources:
                return {'error': 'Resources are required'}, 400
                
            # Get the original plan
            original_plan = lecture_plans[plan_id]
            
            # Get OpenAI client
            client = current_app.config.get('OPENAI_CLIENT')
            if not client:
                return {'error': 'OpenAI client not available'}, 500
                
            # Update the plan
            updated_plan = service.update_lecture_plan(client, original_plan, 'resources', resources)
            
            # Save the updated plan
            lecture_plans[plan_id] = updated_plan
            
            return {
                'id': plan_id,
                'plan': updated_plan
            }
            
        except Exception as e:
            logger.error(f"Error updating resources: {e}")
            return {'error': str(e)}, 500

@ns.route('/<string:plan_id>/learning-objectives')
@ns.param('plan_id', 'The lecture plan identifier')
class LearningObjectivesAPI(Resource):
    @ns.expect(update_objectives_model)
    def put(self, plan_id):
        """Update learning objectives for a lecture plan"""
        if plan_id not in lecture_plans:
            return {'error': 'Lecture plan not found'}, 404
            
        try:
            data = request.json
            objectives = data.get('learning_objectives')
            
            if not objectives:
                return {'error': 'Learning objectives are required'}, 400
                
            # Get the original plan
            original_plan = lecture_plans[plan_id]
            
            # Get OpenAI client
            client = current_app.config.get('OPENAI_CLIENT')
            if not client:
                return {'error': 'OpenAI client not available'}, 500
                
            # Update the plan
            updated_plan = service.update_lecture_plan(client, original_plan, 'learning_objectives', objectives)
            
            # Save the updated plan
            lecture_plans[plan_id] = updated_plan
            
            return {
                'id': plan_id,
                'plan': updated_plan
            }
            
        except Exception as e:
            logger.error(f"Error updating learning objectives: {e}")
            return {'error': str(e)}, 500

# Add a simple initialization file
# filepath: /Volumes/Meow 2/AI Hackathon/synapseEd/agents/lecture_planner/__init__.py
# Empty initialization file to make this directory a Python package