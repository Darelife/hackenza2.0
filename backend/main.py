from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from matplotlib import pyplot as plt
import pyshark
import os
import json
from datetime import datetime
# from send_to_llm import GeminiClient
from test import PacketAnalyzer

# api_key = os.getenv("GEMMA_API_KEY")
# gemini = GeminiClient(api_key)
# prompt = "Explain how AI works in detail"
# response = gemini.generate_content(prompt)
# print(response)

app = Flask(__name__)
CORS(app)



@app.route("/")
def index():
    return jsonify({"message": "Welcome to the API"})

@app.route("/api/getOverview", methods=["GET"])
def get_overview():
    return jsonify({"message": "Overview"})    


@app.route("/api/data", methods=["GET"])
def get_data():
    return jsonify({"data": "Sample data"})


@app.route("/api/submit", methods=["POST"])
def submit_data():
    data = request.json
    return jsonify({"status": "success", "received": data})


if __name__ == "__main__":
    app.run(debug=True)
