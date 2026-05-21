#!/usr/bin/env bash
# build.sh — used by Render to install dependencies and prepare the app
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate
python manage.py seed_subjects  # safe to run repeatedly - only adds missing
