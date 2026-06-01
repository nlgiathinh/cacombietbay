import subprocess
import sys
import os
from database import init_db

def main():
    # Initialize database if it doesn't exist
    if not os.path.exists('database.db'):
        print("Initializing database...")
        init_db()
    
    print("Starting Flask server...")
    try:
        # Run app.py
        subprocess.run([sys.executable, 'app.py'])
    except KeyboardInterrupt:
        print("\nServer stopped.")

if __name__ == '__main__':
    main()