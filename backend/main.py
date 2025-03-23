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
from scapy.all import IP, TCP, UDP
from test import PacketAnalyzer

app = Flask(__name__)
CORS(app)


@app.route("/")
def index():
    return jsonify({"message": "Welcome to the API"})

@app.route("/api/graph/latency_distribution", methods=["GET"])
def latency_distribution():
    pcap_file = request.args.get('pcap_file', "./pcapngFiles/28-1-25-bro-laptp-40ms.pcapng")
    print("REQUEST ARGUMENTS:", dict(request.args))
    print("PCAP_FILE_NAME: ", pcap_file)
    
    if not os.path.exists(pcap_file):
        return jsonify({"error": "PCAP file not found"}), 404
    try:
        pa = PacketAnalyzer(pcap_file)
        pa.analyze_delays()
        distribution_data = pa.get_latency_distribution()
        
        return jsonify({
            "status": "success",
            "data": distribution_data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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

        # Process the file with the PacketAnalyzer
        pa = PacketAnalyzer(temp_path)
        
        # Get basic statistics and overview
        stats = pa.basic_statistics()
        pa.analyze_delays()
        total_packets = stats['total_packets']
        capture_duration = stats['capture_duration']
        overview = pa.get_capture_overview()
        
        # Create data structure to hold results - matches data.json format
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
                "time_range": overview.get('time_range', {"start": 0, "end": 0}),
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
            },
            "packets": [],
            "data_distribution" : [],
            "packet_size_distribution" : [],
            "delay_correlation" : [],
            "latency_timeline" : [],
            "jitter_distribution" : []
        }

        distribution_data = pa.get_latency_distribution()
        result["data_distribution"] = distribution_data

        packet_size_distribution = pa.get_packet_size_distribution()
        result["packet_size_distribution"] = packet_size_distribution

        # delay_correlation = pa.get_delay_correlation()
        # result["delay_correlation"] = delay_correlation

        latency_timeline = pa.get_latency_timeline()
        result["latency_timeline"] = latency_timeline

        jitter_distribution = pa.get_jitter_distribution()
        result["jitter_distribution"] = jitter_distribution

        
        # Fill in protocol data
        for proto, count in sorted(overview['protocols'].items(), key=lambda x: x[1], reverse=True):
            percentage = (count / total_packets) * 100
            result["overview"]["Protocol"].append({
                "name": proto,
                "packets": count,
                "percentage": percentage
            })

        # Fill in packet type data
        for pkt_type, count in sorted(overview['packet_counts'].items(), key=lambda x: x[1], reverse=True):
            percentage = (count / total_packets) * 100
            result["overview"]["Packet"].append({
                "name": pkt_type,
                "packets": count,
                "percentage": percentage
            })

        # Add IP stats if available
        if 'ip_stats' in overview:
            # Top IP sources
            for ip, count in sorted(overview['ip_stats'].get('sources', {}).items(), key=lambda x: x[1], reverse=True)[:10]:
                percentage = (count / total_packets) * 100
                result["overview"]["ip_stats"]["top_sources"].append({
                    "ip": ip,
                    "packets": count,
                    "percentage": percentage
                })
            
            # Top IP destinations
            for ip, count in sorted(overview['ip_stats'].get('destinations', {}).items(), key=lambda x: x[1], reverse=True)[:10]:
                percentage = (count / total_packets) * 100
                result["overview"]["ip_stats"]["top_destinations"].append({
                    "ip": ip,
                    "packets": count,
                    "percentage": percentage
                })

        # Add port stats if available
        if 'port_stats' in overview:
            # Top source ports
            for port, count in sorted(overview['port_stats'].get('sources', {}).items(), key=lambda x: x[1], reverse=True)[:10]:
                percentage = (count / total_packets) * 100
                result["overview"]["port_stats"]["top_sources"].append({
                    "port": port,
                    "packets": count,
                    "percentage": percentage
                })
            
            # Top destination ports
            for port, count in sorted(overview['port_stats'].get('destinations', {}).items(), key=lambda x: x[1], reverse=True)[:10]:
                percentage = (count / total_packets) * 100
                result["overview"]["port_stats"]["top_destinations"].append({
                    "port": port,
                    "packets": count,
                    "percentage": percentage
                })

        # Perform analysis if the methods are available in PacketAnalyzer
        try:
            pa.analyze_delays()
            
            # Add delay categories if available
            if hasattr(pa, 'delay_categories'):
                for category, delays in pa.delay_categories.items():
                    if delays:
                        values = [d['delay'] for d in delays]
                        result["analysis"]["delay_categories"][category] = {
                            "avg": float(np.mean(values)),
                            "max": float(max(values)),
                            "count": len(values)
                        }
            
            # Add latency statistics if available
            if hasattr(pa, 'latencies'):
                for proto in pa.latencies:
                    if pa.latencies[proto]:
                        result["analysis"]["latency"][proto] = {
                            "avg": float(np.mean(pa.latencies[proto])),
                            "max": float(max(pa.latencies[proto])),
                            "min": float(min(pa.latencies[proto])),
                            "std": float(np.std(pa.latencies[proto])),
                            "count": len(pa.latencies[proto])
                        }
            
            # Add jitter statistics if available
            if hasattr(pa, 'jitter_values'):
                for proto in pa.jitter_values:
                    if pa.jitter_values[proto]:
                        result["analysis"]["jitter"][proto] = {
                            "avg": float(np.mean(pa.jitter_values[proto])),
                            "max": float(max(pa.jitter_values[proto])),
                            "min": float(min(pa.jitter_values[proto])),
                            "std": float(np.std(pa.jitter_values[proto])),
                            "count": len(pa.jitter_values[proto])
                        }
            
            # Add packet loss statistics if available
            if hasattr(pa, 'calculate_packet_loss'):
                loss_stats = pa.calculate_packet_loss()
                result["analysis"]["packet_loss"] = loss_stats
            
            # Add IoT metrics if available
            if hasattr(pa, 'iot_metrics'):
                # Add bundle sizes
                if pa.iot_metrics.get('bundle_sizes'):
                    result["analysis"]["iot_metrics"]["bundle_sizes"] = pa.iot_metrics['bundle_sizes']
                
                # Add aggregation intervals
                if pa.iot_metrics.get('aggregation_intervals'):
                    result["analysis"]["iot_metrics"]["aggregation_intervals"] = pa.iot_metrics['aggregation_intervals']
                
                # Add device patterns
                if pa.iot_metrics.get('device_patterns'):
                    for device, patterns in pa.iot_metrics['device_patterns'].items():
                        small_pkts = sum(1 for p in patterns if p.get('type') == 'small')
                        bundle_pkts = sum(1 for p in patterns if p.get('type') == 'bundle')
                        result["analysis"]["iot_metrics"]["device_patterns"][device] = {
                            "small_packets": small_pkts,
                            "bundled_packets": bundle_pkts,
                            "total": len(patterns)
                        }
                
            # Add packet list as well
            all_packets = pa.getAllPackets()
            packet_list = []
            for i, pkt in enumerate(all_packets):
                packet_info = {
                    "number": i + 1,
                    "time": str(datetime.fromtimestamp(float(pkt.time))),
                    "length": len(pkt),
                    "protocol": "Unknown",
                    "source": "",
                    "destination": "",
                    "info": ""
                }
                
                # Extract common fields if available
                if IP in pkt:
                    packet_info["source"] = pkt[IP].src
                    packet_info["destination"] = pkt[IP].dst
                    
                    # Determine protocol
                    if TCP in pkt:
                        packet_info["protocol"] = "TCP"
                        src_port = pkt[TCP].sport
                        dst_port = pkt[TCP].dport
                        packet_info["info"] = f"TCP {src_port} → {dst_port} [SYN: {pkt[TCP].flags.S}, ACK: {pkt[TCP].flags.A}, FIN: {pkt[TCP].flags.F}]"
                    elif UDP in pkt:
                        packet_info["protocol"] = "UDP"
                        src_port = pkt[UDP].sport
                        dst_port = pkt[UDP].dport
                        packet_info["info"] = f"UDP {src_port} → {dst_port} Len={len(pkt[UDP].payload)}"
                    else:
                        packet_info["protocol"] = "IP"
                        packet_info["info"] = f"IP Protocol: {pkt[IP].proto}"
                
                # If we couldn't determine protocol from IP, try other common protocols
                elif 'ARP' in pkt:
                    packet_info["protocol"] = "ARP"
                    if hasattr(pkt.getlayer('ARP'), 'psrc') and hasattr(pkt.getlayer('ARP'), 'pdst'):
                        packet_info["source"] = pkt.getlayer('ARP').psrc
                        packet_info["destination"] = pkt.getlayer('ARP').pdst
                        packet_info["info"] = f"Who has {pkt.getlayer('ARP').pdst}? Tell {pkt.getlayer('ARP').psrc}"
                elif 'IPv6' in pkt:
                    packet_info["protocol"] = "IPv6"
                    if hasattr(pkt.getlayer('IPv6'), 'src') and hasattr(pkt.getlayer('IPv6'), 'dst'):
                        packet_info["source"] = pkt.getlayer('IPv6').src
                        packet_info["destination"] = pkt.getlayer('IPv6').dst
                        packet_info["info"] = f"IPv6 {pkt.getlayer('IPv6').nh}"
                
                packet_list.append(packet_info)
            
            result["packets"] = packet_list

            
        except Exception as analysis_err:
            print(f"Error during analysis: {analysis_err}")
            # Continue with basic data even if analysis fails

        # Delete the temporary file after processing
        os.unlink(temp_path)

        return jsonify(result)

    except Exception as e:
        print(f"Error processing file: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/getOverview", methods=["GET"])
def get_overview():
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

@app.route("/api/getAllPackets", methods=["GET"])
def get_all_packets():
    # For GET requests, use a default file or get from query params
    pcap_file = request.args.get('pcap_file', "./pcapngFiles/28-1-25-bro-laptp-20ms.pcapng")
    
    if not os.path.exists(pcap_file):
        return jsonify({"error": "PCAP file not found"}), 404
    
    try:
        pa = PacketAnalyzer(pcap_file)
        all_packets = pa.getAllPackets()
        
        # Convert Scapy packets to a serializable format
        packet_list = []
        for i, pkt in enumerate(all_packets):
            packet_info = {
                "number": i + 1,
                "time": str(datetime.fromtimestamp(float(pkt.time))),
                "length": len(pkt),
                "protocol": "Unknown",
                "source": "",
                "destination": "",
                "info": ""
            }
            
            # Extract common fields if available
            if IP in pkt:
                packet_info["source"] = pkt[IP].src
                packet_info["destination"] = pkt[IP].dst
                
                # Determine protocol
                if TCP in pkt:
                    packet_info["protocol"] = "TCP"
                    src_port = pkt[TCP].sport
                    dst_port = pkt[TCP].dport
                    packet_info["info"] = f"TCP {src_port} → {dst_port} [SYN: {pkt[TCP].flags.S}, ACK: {pkt[TCP].flags.A}, FIN: {pkt[TCP].flags.F}]"
                elif UDP in pkt:
                    packet_info["protocol"] = "UDP"
                    src_port = pkt[UDP].sport
                    dst_port = pkt[UDP].dport
                    packet_info["info"] = f"UDP {src_port} → {dst_port} Len={len(pkt[UDP].payload)}"
                else:
                    packet_info["protocol"] = "IP"
                    packet_info["info"] = f"IP Protocol: {pkt[IP].proto}"
            
            # If we couldn't determine protocol from IP, try other common protocols
            elif 'ARP' in pkt:
                packet_info["protocol"] = "ARP"
                if hasattr(pkt.getlayer('ARP'), 'psrc') and hasattr(pkt.getlayer('ARP'), 'pdst'):
                    packet_info["source"] = pkt.getlayer('ARP').psrc
                    packet_info["destination"] = pkt.getlayer('ARP').pdst
                    packet_info["info"] = f"Who has {pkt.getlayer('ARP').pdst}? Tell {pkt.getlayer('ARP').psrc}"
            elif 'IPv6' in pkt:
                packet_info["protocol"] = "IPv6"
                if hasattr(pkt.getlayer('IPv6'), 'src') and hasattr(pkt.getlayer('IPv6'), 'dst'):
                    packet_info["source"] = pkt.getlayer('IPv6').src
                    packet_info["destination"] = pkt.getlayer('IPv6').dst
                    packet_info["info"] = f"IPv6 {pkt.getlayer('IPv6').nh}"
            
            packet_list.append(packet_info)
        
        return jsonify({"AllPackets": packet_list})
        
    except Exception as e:
        print(f"Error retrieving packets: {str(e)}")
        return jsonify({"error": str(e), "AllPackets": []}), 500

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
        },
        "packets": []
    }

    all_packets = pa.getAllPackets()
        
        # Convert Scapy packets to a serializable format
    packet_list = []
    for i, pkt in enumerate(all_packets):
        packet_info = {
            "number": i + 1,
            "time": str(datetime.fromtimestamp(float(pkt.time))),
            "length": len(pkt),
            "protocol": "Unknown",
            "source": "",
            "destination": "",
            "info": ""
        }
        
        # Extract common fields if available
        if IP in pkt:
            packet_info["source"] = pkt[IP].src
            packet_info["destination"] = pkt[IP].dst
            
            # Determine protocol
            if TCP in pkt:
                packet_info["protocol"] = "TCP"
                src_port = pkt[TCP].sport
                dst_port = pkt[TCP].dport
                packet_info["info"] = f"TCP {src_port} → {dst_port} [SYN: {pkt[TCP].flags.S}, ACK: {pkt[TCP].flags.A}, FIN: {pkt[TCP].flags.F}]"
            elif UDP in pkt:
                packet_info["protocol"] = "UDP"
                src_port = pkt[UDP].sport
                dst_port = pkt[UDP].dport
                packet_info["info"] = f"UDP {src_port} → {dst_port} Len={len(pkt[UDP].payload)}"
            else:
                packet_info["protocol"] = "IP"
                packet_info["info"] = f"IP Protocol: {pkt[IP].proto}"
        
        # If we couldn't determine protocol from IP, try other common protocols
        elif 'ARP' in pkt:
            packet_info["protocol"] = "ARP"
            if hasattr(pkt.getlayer('ARP'), 'psrc') and hasattr(pkt.getlayer('ARP'), 'pdst'):
                packet_info["source"] = pkt.getlayer('ARP').psrc
                packet_info["destination"] = pkt.getlayer('ARP').pdst
                packet_info["info"] = f"Who has {pkt.getlayer('ARP').pdst}? Tell {pkt.getlayer('ARP').psrc}"
        elif 'IPv6' in pkt:
            packet_info["protocol"] = "IPv6"
            if hasattr(pkt.getlayer('IPv6'), 'src') and hasattr(pkt.getlayer('IPv6'), 'dst'):
                packet_info["source"] = pkt.getlayer('IPv6').src
                packet_info["destination"] = pkt.getlayer('IPv6').dst
                packet_info["info"] = f"IPv6 {pkt.getlayer('IPv6').nh}"
        
        packet_list.append(packet_info)
    
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
    if 'ip_stats' in overview and 'sources' in overview['ip_stats']:
        for ip, count in sorted(overview['ip_stats']['sources'].items(), key=lambda x: x[1], reverse=True)[:10]:
            percentage = (count / total_packets) * 100
            result["overview"]["ip_stats"]["top_sources"].append({
                "ip": ip,
                "packets": count,
                "percentage": percentage
            })
    
    # Top IP destinations
    if 'ip_stats' in overview and 'destinations' in overview['ip_stats']:
        for ip, count in sorted(overview['ip_stats']['destinations'].items(), key=lambda x: x[1], reverse=True)[:10]:
            percentage = (count / total_packets) * 100
            result["overview"]["ip_stats"]["top_destinations"].append({
                "ip": ip,
                "packets": count,
                "percentage": percentage
            })
    
    # Top source ports
    if 'port_stats' in overview and 'sources' in overview['port_stats']:
        for port, count in sorted(overview['port_stats']['sources'].items(), key=lambda x: x[1], reverse=True)[:10]:
            percentage = (count / total_packets) * 100
            result["overview"]["port_stats"]["top_sources"].append({
                "port": port,
                "packets": count,
                "percentage": percentage
            })
    
    # Top destination ports
    if 'port_stats' in overview and 'destinations' in overview['port_stats']:
        for port, count in sorted(overview['port_stats']['destinations'].items(), key=lambda x: x[1], reverse=True)[:10]:
            percentage = (count / total_packets) * 100
            result["overview"]["port_stats"]["top_destinations"].append({
                "port": port,
                "packets": count,
                "percentage": percentage
            })

    
    # Perform analysis
    try:
        pa.analyze_delays()
        
        # Add delay categories if available
        if hasattr(pa, 'delay_categories'):
            for category, delays in pa.delay_categories.items():
                if delays:
                    values = [d['delay'] for d in delays]
                    result["analysis"]["delay_categories"][category] = {
                        "avg": float(np.mean(values)),
                        "max": float(max(values)),
                        "count": len(values)
                    }
        
        # Add latency statistics
        if hasattr(pa, 'latencies'):
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
        if hasattr(pa, 'jitter_values'):
            for proto in pa.jitter_values:
                if pa.jitter_values[proto]:
                    result["analysis"]["jitter"][proto] = {
                        "avg": float(np.mean(pa.jitter_values[proto])),
                        "max": float(max(pa.jitter_values[proto])),
                        "min": float(min(pa.jitter_values[proto])),
                        "std": float(np.std(pa.jitter_values[proto])),
                        "count": len(pa.jitter_values[proto])
                    }
        
        # Add packet loss statistics
        if hasattr(pa, 'calculate_packet_loss'):
            loss_stats = pa.calculate_packet_loss()
            result["analysis"]["packet_loss"] = loss_stats
        
        # Add IoT metrics
        if hasattr(pa, 'iot_metrics'):
            # Bundle sizes
            if pa.iot_metrics.get('bundle_sizes'):
                result["analysis"]["iot_metrics"]["bundle_sizes"] = pa.iot_metrics['bundle_sizes']
            
            # Aggregation intervals
            if pa.iot_metrics.get('aggregation_intervals'):
                result["analysis"]["iot_metrics"]["aggregation_intervals"] = pa.iot_metrics['aggregation_intervals']
            
            # Device patterns
            if pa.iot_metrics.get('device_patterns'):
                for device, patterns in pa.iot_metrics['device_patterns'].items():
                    small_pkts = sum(1 for p in patterns if p.get('type') == 'small')
                    bundle_pkts = sum(1 for p in patterns if p.get('type') == 'bundle')
                    result["analysis"]["iot_metrics"]["device_patterns"][device] = {
                        "small_packets": small_pkts,
                        "bundled_packets": bundle_pkts,
                        "total": small_pkts + bundle_pkts
                    }
            
            result["packets"] = packet_list
        

    except Exception as e:
        print(f"Error during analysis: {e}")
        # Continue with the data we have so far
    
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
