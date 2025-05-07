FROM python:3.10-slim

WORKDIR /app

# Install system dependencies and tools for debugging
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    procps \
    net-tools \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies with specific flags for reliability
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn eventlet

# Create necessary directories before copying application code
RUN mkdir -p logs storage/uploads storage/vector_stores storage/generated_pdfs storage/audio_files

# Set permissions
RUN chmod -R 777 /app

# Copy the Flask application
COPY . .

# Make sure wsgi.py exists, if not create a basic one
RUN if [ ! -f wsgi.py ]; then \
    echo 'from app import app, socketio' > wsgi.py && \
    echo 'if __name__ == "__main__":' >> wsgi.py && \
    echo '    socketio.run(app, host="0.0.0.0", port=5000)' >> wsgi.py; \
    fi

# Create a basic gunicorn.conf.py if it doesn't exist
RUN if [ ! -f gunicorn.conf.py ]; then \
    echo 'worker_class = "eventlet"' > gunicorn.conf.py && \
    echo 'workers = 1' >> gunicorn.conf.py && \
    echo 'bind = "0.0.0.0:5000"' >> gunicorn.conf.py && \
    echo 'timeout = 120' >> gunicorn.conf.py && \
    echo 'keepalive = 5' >> gunicorn.conf.py; \
    fi

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["gunicorn", "--config", "gunicorn.conf.py", "wsgi:app"]

# Fallback command if gunicorn fails
# CMD ["python", "wsgi.py"]