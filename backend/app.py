import os
import sqlite3

from flask import Flask, jsonify, request

app = Flask(__name__)

DB_PATH = os.getenv("DB_PATH", "tasks.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)

    conn = get_db()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0
            )
        """)
        conn.commit()
    finally:
        conn.close()


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/tasks")
def get_tasks():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM tasks ORDER BY id DESC"
        ).fetchall()

        tasks = [
            {
                "id": row["id"],
                "title": row["title"],
                "completed": bool(row["completed"])
            }
            for row in rows
        ]

        return jsonify(tasks)
    finally:
        conn.close()


@app.post("/api/tasks")
def create_task():
    data = request.get_json(silent=True) or {}
    title = data.get("title", "")

    if not isinstance(title, str) or not title.strip():
        return jsonify({"error": "Title is required"}), 400

    title = title.strip()

    conn = get_db()
    try:
        cursor = conn.execute(
            "INSERT INTO tasks (title) VALUES (?)",
            (title,)
        )
        conn.commit()

        return jsonify({
            "id": cursor.lastrowid,
            "title": title,
            "completed": False
        }), 201
    finally:
        conn.close()


@app.patch("/api/tasks/<int:task_id>")
def update_task(task_id):
    data = request.get_json(silent=True) or {}
    completed = data.get("completed")

    if not isinstance(completed, bool):
        return jsonify({"error": "Invalid completed value"}), 400

    conn = get_db()
    try:
        cursor = conn.execute(
            "UPDATE tasks SET completed = ? WHERE id = ?",
            (int(completed), task_id)
        )
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Task not found"}), 404

        return jsonify({
            "id": task_id,
            "completed": completed
        })
    finally:
        conn.close()


@app.delete("/api/tasks/<int:task_id>")
def delete_task(task_id):
    conn = get_db()
    try:
        cursor = conn.execute(
            "DELETE FROM tasks WHERE id = ?",
            (task_id,)
        )
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Task not found"}), 404

        return "", 204
    finally:
        conn.close()


init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
