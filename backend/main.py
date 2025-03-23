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
    data = request.get_json() 
    # For GET requests, use a default file or get from query params
    if request.method == "GET":
        pcap_file = request.args.get('pcap_file', "./pcapngFiles/28-1-25-bro-laptp-20ms.pcapng")
    # For POST requests with JSON payload
    else:
        pcap_file = data.get('pcap_file', "./pcapngFiles/28-1-25-bro-laptp-20ms.pcapng")
    if not os.path.exists(pcap_file):
        return jsonify({"error": "PCAP file not found"}), 404
    
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
        t = f"{proto}"
        data["Protocol"].append({
            "name" : t,
            "packets": count,
            "percentage": percentage
        })
    
    for pkt_type, count in sorted(overview['packet_counts'].items(), key=lambda x: x[1], reverse=True):
        percentage = (count / total_packets) * 100
        # f.write(f"{pkt_type:<10} : {count:>6} packets ({percentage:>6.2f}%)\n")
        # dict instead
        t = f"{pkt_type}"
        data["Packet"].append({
            "name" : t,
            "packets": count,
            "percentage": percentage
        })
    
    data["total_packets"] = total_packets
    return jsonify(data)


@app.route("/api/analyzeOverview", methods=["GET"])
def analyze_overview():
    # For GET requests, use a default file or get from query params
    if request.method == "GET":
        pcap_file = request.args.get('pcap_file', "./pcapngFiles/28-1-25-bro-laptp-20ms.pcapng")
    # For POST requests with JSON payload
    else:
        data = request.get_json()
        pcap_file = data.get('pcap_file', "./pcapngFiles/28-1-25-bro-laptp-20ms.pcapng")
    
    if not os.path.exists(pcap_file):
        return jsonify({"error": "PCAP file not found"}), 404
    
    pa = PacketAnalyzer(pcap_file)
    
    # Get basic statistics and overview
    stats = pa.basic_statistics()
    total_packets = stats['total_packets']
    capture_duration = stats['capture_duration']
    overview = pa.get_capture_overview()
    
    # Create data structure to hold results
    result = {
        "overview": {
            "Protocol": [],
            "Packet": [],
            "stats": {
                "total_packets": total_packets,
                "avg_packet_size": stats['avg_packet_size'],
                "max_packet_size": stats['max_packet_size'],
                "min_packet_size": stats['min_packet_size'],
                "capture_duration": capture_duration,
                "packets_per_second": total_packets / capture_duration if capture_duration > 0 else 0
            },
            "time_range": overview['time_range'],
            "ip_stats": {
                "top_sources": [],
                "top_destinations": []
            },
            "port_stats": {
                "top_sources": [],
                "top_destinations": []
            }
        },
        "analysis": {
            "packet_loss": {},
            "latency": {},
            "jitter": {},
            "delay_categories": {},
            "iot_metrics": {
                "bundle_sizes": [],
                "aggregation_intervals": [],
                "device_patterns": {}
            }
        }
    }
    
    # Protocol distribution
    for proto, count in sorted(overview['protocols'].items(), key=lambda x: x[1], reverse=True):
        percentage = (count / total_packets) * 100
        result["overview"]["Protocol"].append({
            "name": proto,
            "packets": count,
            "percentage": percentage
        })
    
    # Packet type distribution
    for pkt_type, count in sorted(overview['packet_counts'].items(), key=lambda x: x[1], reverse=True):
        percentage = (count / total_packets) * 100
        result["overview"]["Packet"].append({
            "name": pkt_type,
            "packets": count,
            "percentage": percentage
        })
    
    # Top IP sources
    for ip, count in sorted(overview['ip_stats']['sources'].items(), key=lambda x: x[1], reverse=True)[:10]:
        percentage = (count / total_packets) * 100
        result["overview"]["ip_stats"]["top_sources"].append({
            "ip": ip,
            "packets": count,
            "percentage": percentage
        })
    
    # Top IP destinations
    for ip, count in sorted(overview['ip_stats']['destinations'].items(), key=lambda x: x[1], reverse=True)[:10]:
        percentage = (count / total_packets) * 100
        result["overview"]["ip_stats"]["top_destinations"].append({
            "ip": ip,
            "packets": count,
            "percentage": percentage
        })
    
    # Top source ports
    for port, count in sorted(overview['port_stats']['sources'].items(), key=lambda x: x[1], reverse=True)[:10]:
        percentage = (count / total_packets) * 100
        result["overview"]["port_stats"]["top_sources"].append({
            "port": port,
            "packets": count,
            "percentage": percentage
        })
    
    # Top destination ports
    for port, count in sorted(overview['port_stats']['destinations'].items(), key=lambda x: x[1], reverse=True)[:10]:
        percentage = (count / total_packets) * 100
        result["overview"]["port_stats"]["top_destinations"].append({
            "port": port,
            "packets": count,
            "percentage": percentage
        })
    
    # Perform analysis
    pa.analyze_delays()
    loss_stats = pa.calculate_packet_loss()
    result["analysis"]["packet_loss"] = loss_stats
    
    # Add latency statistics
    for proto in pa.latencies:
        if pa.latencies[proto]:
            result["analysis"]["latency"][proto] = {
                "avg": float(np.mean(pa.latencies[proto])),
                "max": float(max(pa.latencies[proto])),
                "min": float(min(pa.latencies[proto])),
                "std": float(np.std(pa.latencies[proto])),
                "count": len(pa.latencies[proto])
            }
    
    # Add jitter statistics
    for proto in pa.jitter_values:
        if pa.jitter_values[proto]:
            result["analysis"]["jitter"][proto] = {
                "avg": float(np.mean(pa.jitter_values[proto])),
                "max": float(max(pa.jitter_values[proto])),
                "min": float(min(pa.jitter_values[proto])),
                "std": float(np.std(pa.jitter_values[proto])),
                "count": len(pa.jitter_values[proto])
            }
    
    # Add delay categories
    for category, delays in pa.delay_categories.items():
        if delays:
            values = [d['delay'] for d in delays]
            result["analysis"]["delay_categories"][category] = {
                "avg": float(np.mean(values)),
                "max": float(max(values)),
                "count": len(values)
            }
    
    # Add IoT metrics
    if pa.iot_metrics['bundle_sizes']:
        result["analysis"]["iot_metrics"]["bundle_sizes"] = {
            "avg": float(np.mean(pa.iot_metrics['bundle_sizes'])),
            "max": float(max(pa.iot_metrics['bundle_sizes'])),
            "count": len(pa.iot_metrics['bundle_sizes'])
        }
    
    if pa.iot_metrics['aggregation_intervals']:
        result["analysis"]["iot_metrics"]["aggregation_intervals"] = {
            "avg": float(np.mean(pa.iot_metrics['aggregation_intervals'])),
            "max": float(max(pa.iot_metrics['aggregation_intervals'])),
            "count": len(pa.iot_metrics['aggregation_intervals'])
        }
    
    for device, patterns in pa.iot_metrics['device_patterns'].items():
        small_pkts = sum(1 for p in patterns if p['type'] == 'small')
        bundle_pkts = sum(1 for p in patterns if p['type'] == 'bundle')
        result["analysis"]["iot_metrics"]["device_patterns"][device] = {
            "small_packets": small_pkts,
            "bundled_packets": bundle_pkts,
            "total": len(patterns)
        }
    
    return jsonify(result)


@app.route("/api/data", methods=["GET"])
def get_data():
    return jsonify({"data": "Sample data"})


@app.route("/api/submit", methods=["POST"])
def submit_data():
    data = request.json
    return jsonify({"status": "success", "received": data})


if __name__ == "__main__":
    app.run(port=8000, debug=True)
