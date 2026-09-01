#!/usr/bin/env python3
import os
import sys
import shutil
import sqlite3
from datetime import datetime

DATA_DIR = os.environ.get("DATA_DIR", "/app/data" if os.path.exists("/app/data") else "./data")
DB_PATH = os.path.join(DATA_DIR, "recipeeks.db")
BACKUP_DIR = os.environ.get("BACKUP_DIR", os.path.join(DATA_DIR, "backups"))

def run_backup():
    if not os.path.exists(DB_PATH):
        print(f"Error: Source database not found at {DB_PATH}")
        sys.exit(1)

    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    backup_filename = f"recipeeks_backup_{timestamp}.db"
    backup_path = os.path.join(BACKUP_DIR, backup_filename)

    # Use SQLite's official online backup API to ensure 100% ACID consistency without locking
    src_conn = sqlite3.connect(DB_PATH)
    dst_conn = sqlite3.connect(backup_path)
    with dst_conn:
        src_conn.backup(dst_conn)
    dst_conn.close()
    src_conn.close()

    print(f"✅ Successfully created backup: {backup_path} ({os.path.getsize(backup_path)} bytes)")

    # Rotate old backups - keep last 30
    backups = sorted([
        os.path.join(BACKUP_DIR, f)
        for f in os.listdir(BACKUP_DIR)
        if f.startswith("recipeeks_backup_") and f.endswith(".db")
    ])

    if len(backups) > 30:
        for old in backups[:-30]:
            try:
                os.remove(old)
                print(f"🗑️ Removed old backup: {old}")
            except Exception as e:
                print(f"Warning: Failed to remove {old}: {e}")

if __name__ == "__main__":
    run_backup()
