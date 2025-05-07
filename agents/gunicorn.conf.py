import multiprocessing
import os

# Gunicorn configuration file for SynapseED API server

# Socket.IO requires Eventlet worker
worker_class = "eventlet"

# Number of worker processes
# For CPU-bound applications, use: multiprocessing.cpu_count() * 2 + 1
# For I/O-bound applications like this one with LLM API calls, use more workers
workers = multiprocessing.cpu_count() * 2 + 1

# Bind to this socket
bind = "0.0.0.0:" + os.getenv("PORT", "5000")

# Timeout settings
timeout = 120  # Seconds, increased for LLM API requests that may take longer
keepalive = 5

# Log settings
loglevel = "info"
accesslog = "logs/gunicorn-access.log"
errorlog = "logs/gunicorn-error.log"
capture_output = True

# Process naming
proc_name = "synapseEd_api"

# Security settings
limit_request_line = 4096
limit_request_fields = 100

# SSL settings (if not using a reverse proxy)
# keyfile = "/path/to/keyfile"
# certfile = "/path/to/certfile"

# Set preferred maximum client body size (adjust based on your needs)
# For file uploads via API
max_requests = 1000
max_requests_jitter = 50

# Pre and post fork hooks (optional)
def post_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def pre_exec(server):
    server.log.info("Forked child, re-executing.")

def when_ready(server):
    server.log.info("Server is ready. Spawning workers")