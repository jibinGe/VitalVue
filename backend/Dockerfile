# Use a slim Python image for a smaller footprint and better security
FROM python:3.12-slim

# Set environment variables
# Prevent Python from writing .pyc files to disk
ENV PYTHONDONTWRITEBYTECODE=1
# Ensure Python output is sent directly to the terminal (no buffering)
ENV PYTHONUNBUFFERED=1

# Set the working directory
WORKDIR /app

# Install system dependencies (needed for PostgreSQL & building packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security (Defense-in-Depth)
RUN groupadd -r vitalvue && useradd -r -g vitalvue vitalvue

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Change ownership of the app directory to our non-root user
RUN chown -R vitalvue:vitalvue /app

# Switch to the non-root user
USER vitalvue

# Expose the port FastAPI runs on (matched to your docker-compose)
EXPOSE 8000

# Start the application using Uvicorn
# We use '--proxy-headers' so FastAPI knows it's behind Nginx
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
