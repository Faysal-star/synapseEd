import os
from .pdf_generator import PDFGenerator

def generate_pdf_background(job_id, topic, data, active_jobs, output_folder, socketio):
    """Generate PDF in background thread"""
    try:
        # Update job status
        active_jobs[job_id] = {
            'status': 'processing',
            'message': 'Starting PDF generation',
            'progress': 10,
            'topic': topic
        }
        
        # Emit status update via Socket.IO
        socketio.emit('status_update', {
            'job_id': job_id,
            'status': 'processing',
            'message': 'Starting PDF generation',
            'progress': 10
        }, room=job_id)
        
        # Create PDF generator
        llm_provider = data.get('llm_provider', 'openai')
        model = data.get('model')
        generator = PDFGenerator(llm_provider=llm_provider, model=model)
        
        # Update status
        active_jobs[job_id]['progress'] = 30
        active_jobs[job_id]['message'] = 'Generating content'
        socketio.emit('status_update', {
            'job_id': job_id,
            'status': 'processing',
            'message': 'Generating content',
            'progress': 30
        }, room=job_id)
        
        # Generate content
        content_data = generator.generate_content(
            topic=topic,
            additional_context=data.get('additional_context', ''),
            sections=data.get('sections')
        )
        
        # Update status
        active_jobs[job_id]['progress'] = 70
        active_jobs[job_id]['message'] = 'Creating PDF document'
        socketio.emit('status_update', {
            'job_id': job_id,
            'status': 'processing',
            'message': 'Creating PDF document',
            'progress': 70
        }, room=job_id)
        
        # Create PDF
        filename = f"{topic.replace(' ', '_')[:30]}_{job_id[:8]}.pdf"
        pdf_path = os.path.join(output_folder, filename)
        
        generator.create_pdf(content_data, pdf_path)
        
        # Update status with completion information
        active_jobs[job_id] = {
            'status': 'completed',
            'message': 'PDF generation completed',
            'progress': 100,
            'pdf_path': pdf_path,
            'filename': filename,
            'topic': topic,
            'content_summary': {
                'title': content_data.get('title', ''),
                'sections': [s.get('heading', '') for s in content_data.get('sections', [])]
            }
        }
        
        # Emit final status update
        socketio.emit('status_update', {
            'job_id': job_id,
            'status': 'completed',
            'message': 'PDF generation completed',
            'progress': 100,
            'filename': filename,
            'content_summary': active_jobs[job_id]['content_summary']
        }, room=job_id)
        
    except Exception as e:
        # Update status with error
        active_jobs[job_id] = {
            'status': 'error',
            'message': f'Error: {str(e)}',
            'progress': 0,
            'topic': topic
        }
        
        # Emit error status
        socketio.emit('status_update', {
            'job_id': job_id,
            'status': 'error',
            'message': f'Error: {str(e)}',
            'progress': 0
        }, room=job_id)