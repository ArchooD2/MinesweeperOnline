from flask import Flask, render_template, request, redirect, url_for, session, abort, jsonify
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import os
from functools import wraps
from dotenv import load_dotenv
import subprocess, logging
# Secure secret key for session cookies; in production, use an environment variable
load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "wringing-out-the-sponge-of-doom")  # Default for development; change in production

DATABASE = 'database.db'

def get_db():
    # Connect to SQLite database, returns connection
    conn = sqlite3.connect(DATABASE)
    # Enable foreign keys (for referential integrity if needed)
    conn.execute('PRAGMA foreign_keys = ON')
    return conn

# Initialize database schema if not exists
conn = get_db()
conn.execute('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    largest_board INTEGER NOT NULL DEFAULT 0
)''')
conn.close()

# Login required decorator to protect certain routes
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            # Not logged in, redirect to login page
            return redirect(url_for('login', next=request.path))
        return f(*args, **kwargs)
    return decorated_function

# Context processor to make current user available in templates
@app.context_processor
def inject_user():
    username = session.get('username')
    return dict(current_user=username)

@app.route('/')
def index():
    # Home page: if logged in, redirect to game; if not, show login page
    if 'user_id' in session:
        return redirect(url_for('game'))
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        # Get form data
        username = request.form.get('username')
        password = request.form.get('password')
        # Simple validation for non-empty fields
        if not username or not password:
            return render_template('register.html', error="Username and password are required.")
        # Check if username already exists
        con = get_db()
        cur = con.cursor()
        cur.execute('SELECT id FROM users WHERE username = ?', (username,))
        if cur.fetchone():
            con.close()
            return render_template('register.html', error="Username already taken.")
        # Insert new user with hashed password
        hash_pw = generate_password_hash(password)
        cur.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, hash_pw))
        con.commit()
        con.close()
        # Redirect to login page with success message
        return render_template('login.html', success="Account created successfully. Please log in.")
    else:
        # GET request: show registration form
        return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # Get form data
        username = request.form.get('username')
        password = request.form.get('password')
        if not username or not password:
            return render_template('login.html', error="Please enter username and password.")
        con = get_db()
        cur = con.cursor()
        cur.execute('SELECT id, password, largest_board FROM users WHERE username = ?', (username,))
        user = cur.fetchone()
        con.close()
        if user is None:
            # User not found
            return render_template('login.html', error="Invalid username or password.")
        user_id, stored_pw, largest_board = user
        # Verify password
        if not check_password_hash(stored_pw, password):
            return render_template('login.html', error="Invalid username or password.")
        # Login successful: set session
        session['user_id'] = user_id
        session['username'] = username
        # Redirect to game page
        return redirect(url_for('game'))
    else:
        # GET request: show login form
        return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()  # Clear session data
    return redirect(url_for('login'))

@app.route('/game')
@login_required
def game():
    # Calculate next board dimensions and send to template (board is generated client-side)
    # Determine board size for current user
    # If user has not beaten any board yet, largest_board will be 0 (default)
    largest = None
    # Query the user's current largest_board from DB to ensure it's up-to-date
    con = get_db()
    cur = con.cursor()
    cur.execute('SELECT largest_board FROM users WHERE id = ?', (session['user_id'],))
    row = cur.fetchone()
    con.close()
    if row:
        largest = row[0]
    if not largest:
        largest = 0
    # Next board size: at least 9x9, or current largest_beaten + 1
    next_size = largest + 1
    if next_size < 9:
        next_size = 9
    # Calculate number of mines as 20% of board cells (rounded down)
    total_cells = next_size * next_size
    num_mines = total_cells * 20 // 100
    if num_mines <= 0:
        num_mines = 1  # ensure at least one mine (practically not needed for size >= 9)
    # Render game page with board dimensions and mine count
    return render_template('game.html', board_size=next_size, mines=num_mines)

@app.route('/leaderboard')
def leaderboard():
    # Public leaderboard of users and their largest board beaten
    con = get_db()
    cur = con.cursor()
    cur.execute('SELECT username, largest_board FROM users ORDER BY largest_board DESC, username ASC')
    results = cur.fetchall()
    con.close()
    return render_template('leaderboard.html', users=results)

@app.route('/win', methods=['POST'])
@login_required
def win():
    # Endpoint for client to report a win (board cleared)
    data = request.get_json()
    if not data or 'size' not in data:
        abort(400)
    size = data['size']
    # Validate that this board size is the next expected win for the user
    con = get_db()
    cur = con.cursor()
    cur.execute('SELECT largest_board FROM users WHERE id = ?', (session['user_id'],))
    row = cur.fetchone()
    if not row:
        con.close()
        abort(400)
    current_best = row[0]
    # The expected winning size is either 9 (if none beaten yet) or current_best + 1
    expected = current_best + 1
    if expected < 9:
        expected = 9
    if size == expected and size > current_best:
        # Update user record with new largest_board
        cur.execute('UPDATE users SET largest_board = ? WHERE id = ?', (size, session['user_id']))
        con.commit()
    con.close()
    return jsonify(success=True)

@app.route('/changelogs')
def changelogs():
    try:
        # get changelogs from git
        result = subprocess.run(['git','log','--pretty=format:%h|%ad|%s','--date=short'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,check=True)
        commits = []
        for line in result.stdout.split('\n'):
            if not line.strip() or line.count('|') < 2:  # Skip empty or malformed lines
                continue
            hash_, date, message = line.split('|', 2)
            commits.append({
                'hash': hash_,
                'date': date,
                'message': message
            })
    except subprocess.CalledProcessError as e:
        commits = []
        logging.error(f"Error getting changelogs: {e.stderr}")
    return render_template('changelogs.html', commits=commits)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
