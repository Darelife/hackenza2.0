from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from matplotlib import pyplot as plt
import pyshark
import os
import json
import tempfile
from datetime import datetime
from test import PacketAnalyzer

app = Flask(__name__)
CORS(app)


@app.route("/")
def index():
    return jsonify({"message": "Welcome to the API"})


@app.route("/api/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    # Check if the file is a pcapng
    if not file.filename.lower().endswith(".pcapng"):
        return jsonify({"error": "Only PCAPNG files are allowed"}), 400

    try:
        # Create a temporary file
        with tempfile.NamedTemporaryFile(suffix=".pcapng", delete=False) as temp:
            # Save the uploaded file to the temporary location
            file.save(temp.name)
            temp_path = temp.name

        # Process the file to generate overview
        pa = PacketAnalyzer(temp_path)
        stats = pa.basic_statistics()
        total_packets = stats["total_packets"]

        # Get overview data
        overview = pa.get_capture_overview()
        data = {"Protocol": [], "Packet": []}

        for proto, count in sorted(
            overview["protocols"].items(), key=lambda x: x[1], reverse=True
        ):
            percentage = (count / total_packets) * 100
            data["Protocol"].append(
                {"name": proto, "packets": count, "percentage": percentage}
            )

        for pkt_type, count in sorted(
            overview["packet_counts"].items(), key=lambda x: x[1], reverse=True
        ):
            percentage = (count / total_packets) * 100
            data["Packet"].append(
                {"name": pkt_type, "packets": count, "percentage": percentage}
            )

        data["total_packets"] = total_packets
        data["filename"] = file.filename  # Return original filename

        # Delete the temporary file after processing
        os.unlink(temp_path)

        return jsonify(data)

    except Exception as e:
        print(f"Error processing file: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/getOverview", methods=["GET"])
def get_overview():
    # Use default file for the sample data
    pcap_file = "./pcapngFiles/28-1-25-bro-laptp-20ms.pcapng"

    try:
        pa = PacketAnalyzer(pcap_file)
        stats = pa.basic_statistics()
        total_packets = stats["total_packets"]

        overview = pa.get_capture_overview()
        data = {"Protocol": [], "Packet": []}

        for proto, count in sorted(
            overview["protocols"].items(), key=lambda x: x[1], reverse=True
        ):
            percentage = (count / total_packets) * 100
            data["Protocol"].append(
                {"name": proto, "packets": count, "percentage": percentage}
            )

        for pkt_type, count in sorted(
            overview["packet_counts"].items(), key=lambda x: x[1], reverse=True
        ):
            percentage = (count / total_packets) * 100
            data["Packet"].append(
                {"name": pkt_type, "packets": count, "percentage": percentage}
            )

        data["total_packets"] = total_packets
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/data", methods=["GET"])
def get_data():
    return jsonify({"data": "Sample data"})


@app.route("/api/submit", methods=["POST"])
def submit_data():
    data = request.json
    return jsonify({"status": "success", "received": data})


if __name__ == "__main__":
    app.run(debug=True)
