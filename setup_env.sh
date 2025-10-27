#!/usr/bin/env bash
set -e

echo "Starting ABUS environment setup..."

# 1. Environment name
ENV_NAME="abus_env"
PY_VERSION="3.10"

# 2. Create conda environment
if conda env list | grep -q "$ENV_NAME"; then
  echo "Conda env '$ENV_NAME' already exists. Skipping creation."
else
  echo "Creating conda env '$ENV_NAME'..."
  conda create -n $ENV_NAME python=$PY_VERSION -y
fi

# 3. Activate it
echo "Activating environment..."
eval "$(conda shell.bash hook)"
conda activate $ENV_NAME

# 4. Install requirements
if [ -f "requirements.txt" ]; then
  echo "Installing from requirements.txt..."
  pip install -r requirements.txt
else
  echo "No requirements.txt found — installing defaults..."
  pip install fastapi uvicorn[standard] sqlmodel sqlalchemy python-dotenv pydantic
fi

# 5. Create project folders if missing
echo "Creating folders..."
mkdir -p api/services api/data web abus/data

# 6. Create .env file if not exists
if [ ! -f ".env" ]; then
  echo "DATABASE_URL=sqlite:///./abus.db" > .env
  echo " .env file created"
else
  echo ".env file already exists"
fi

# 7. Show summary
echo ""
echo "ABUS environment setup complete!"
echo "To start working:"
echo "conda activate $ENV_NAME"
echo "uvicorn api.app:app --reload"

