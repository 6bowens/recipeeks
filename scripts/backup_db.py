#!/usr/bin/env python3
import os
import sys
import shutil
import sqlite3
from datetime import datetime

def find_db_path():
    candidate_paths = [
        "/app/data/recipeeks.db",
        "/home/brett/docker/recipeeks/data/recipeeks.db",
        os.path.expanduser("~/docker/recipeeks/data/recipeeks.db"),
        "./data/recipeeks.db",
        "../data/recipeeks.db",
        "./prisma/dev.db",
        os.path.join(os.path.dirname(__file__), "..", "backups", "recipeeks_backup_2026-08-31.db"),
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            return p
    return None

def run_backup():
    db_path = find_db_path()
    if not db_path:
        print("Error: Source database not found in candidate paths.")
        sys.exit(1)

    backup_dir = os.path.join(os.path.dirname(db_path), "backups")
    os.makedirs(backup_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    backup_filename = f"recipeeks_backup_{timestamp}.db"
    backup_path = os.path.join(backup_dir, backup_filename)

    # Use SQLite's official online backup API to ensure 100% ACID consistency without locking
    src_conn = sqlite3.connect(db_path)
    dst_conn = sqlite3.connect(backup_path)
    with dst_conn:
        src_conn.backup(dst_conn)
    dst_conn.close()
    src_conn.close()

    print(f"✅ Successfully created backup: {backup_path} ({os.path.getsize(backup_path)} bytes)")

    # Rotate old backups - keep last 30
    backups = sorted([
        os.path.join(backup_dir, f)
        for f in os.listdir(backup_dir)
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
