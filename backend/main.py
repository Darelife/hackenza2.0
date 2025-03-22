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
    pcap_file = "./pcapngFiles/28-1-25-bro-laptp-20ms.pcapng" 
    pa = PacketAnalyzer(pcap_file)
    stats = pa.basic_statistics()
    total_packets = stats['total_packets']

    overview = pa.get_capture_overview()
    data = {
        "Protocol" : [],
        "Packet" : []
    }
    for proto, count in sorted(overview['protocols'].items(), key=lambda x: x[1], reverse=True):
        percentage = (count / total_packets) * 100
        # f.write(f"{proto:<10} : {count:>6} packets ({percentage:>6.2f}%)\n")
        # dict instead
        t = f"{proto:<10}"
        data["Protocol"].append({
            "name" : t,
            "packets": count,
            "percentage": percentage
        })
    
    for pkt_type, count in sorted(overview['packet_counts'].items(), key=lambda x: x[1], reverse=True):
        percentage = (count / total_packets) * 100
        # f.write(f"{pkt_type:<10} : {count:>6} packets ({percentage:>6.2f}%)\n")
        # dict instead
        t = f"{pkt_type:<10}"
        data["Packet"].append({
            "name" : t,
            "packets": count,
            "percentage": percentage
        })
    
    data["total_packets"] = total_packets
    return jsonify(data)


@app.route("/api/data", methods=["GET"])
def get_data():
    return jsonify({"data": "Sample data"})


@app.route("/api/submit", methods=["POST"])
def submit_data():
    data = request.json
    return jsonify({"status": "success", "received": data})


if __name__ == "__main__":
    app.run(debug=True)
