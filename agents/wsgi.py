import os
from app import app, socketio

if __name__ == "__main__":
    port = int(os.getenv('PORT', 5000))
    # Use eventlet or gevent worker for Socket.IO in production
    socketio.run(
        app, 
        host='0.0.0.0', 
        port=port,
        debug=False,  # Disable debug mode in production
        allow_unsafe_werkzeug=False,  # Don't use werkzeug server in production
    )