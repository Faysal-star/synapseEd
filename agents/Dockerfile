FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Gunicorn and eventlet
RUN pip install --no-cache-dir gunicorn eventlet

# Copy the Flask application
COPY . .

# Create necessary directories
RUN mkdir -p logs storage/uploads storage/vector_stores storage/generated_pdfs storage/audio_files

# Set permissions
RUN chmod -R 755 .

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["gunicorn", "--config", "gunicorn.conf.py", "wsgi:app"]