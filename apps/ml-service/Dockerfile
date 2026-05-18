FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure model artifacts exist for cold-start deploys
RUN python bootstrap_model.py

RUN addgroup --system ml && adduser --system --group ml
USER ml

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
