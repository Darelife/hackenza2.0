from scapy.all import rdpcap, IP, TCP, UDP
import matplotlib.pyplot as plt
from collections import defaultdict, Counter
import numpy as np
import seaborn as sns
from datetime import datetime
import os
import json

class PacketAnalyzer:
    def __init__(self, pcap_file):
        self.pcap_file = pcap_file
        self.packets = rdpcap(pcap_file)
        self.latencies = defaultdict(list)
        self.timestamps = defaultdict(list)
        self.packet_sizes = defaultdict(list)
        self.retransmissions = []
        self.jitter_values = defaultdict(list)
        self.tcp_flows = defaultdict(list)
        self.delay_categories = {
            'bundling_delays': [],
            'broker_processing_delays': [],
            'retransmission_delays': [],
            'network_delays': [],
            'device_to_broker_delays': [],
            'broker_aggregation_delays': [],
            'cloud_upload_delays': [],
            'edge_processing_delays': []
        }
        self.packet_loss_stats = {
            'total_expected': 0,
            'total_received': 0,
            'lost_packets': defaultdict(list),
            'loss_timestamps': defaultdict(list),
            'protocol_stats': defaultdict(lambda: {'lost': 0, 'transmitted': 0})
        }
        self.iot_metrics = {
            'packet_bundles': [],
            'bundle_sizes': [],
            'aggregation_intervals': [],
            'device_patterns': defaultdict(list),
            'upload_patterns': []
        }
        # Add new delay analysis categories
        self.delay_analysis = {
            'transmission_delays': defaultdict(list),
            'processing_delays': defaultdict(list),
            'queuing_delays': defaultdict(list),
            'propagation_delays': defaultdict(list)
        }
        
        self.delay_patterns = {
            'congestion_events': [],
            'jitter_events': [],
            'aggregation_anomalies': []
        }
        
    def basic_statistics(self):
        """Calculate basic packet statistics"""
        total_packets = len(self.packets)
        protocols = Counter()
        sizes = []
        
        for pkt in self.packets:
            if IP in pkt:
                protocols[pkt[IP].proto] += 1
                sizes.append(len(pkt))
        
        stats = {
            "total_packets": total_packets,
            "protocol_distribution": dict(protocols),
            "avg_packet_size": np.mean(sizes),
            "max_packet_size": max(sizes),
            "min_packet_size": min(sizes),
            "capture_duration": float(self.packets[-1].time - self.packets[0].time)
        }
        return stats
    def getAllPackets(self):
        return self.packets

    def analyze_delays(self):
        """Analyze various types of delays and packet loss"""
        print("\nAnalyzing TCP sequence numbers and IoT patterns...")
        seq_debug_count = 0
        flow_seq_tracking = {}
        last_bundle_time = defaultdict(float)
        
        for i in range(len(self.packets)-1):
            pkt = self.packets[i]
            next_pkt = self.packets[i+1]
            
            # Determine protocol
            proto = self._get_protocol(pkt)
            
            # Update transmitted count for protocol
            self.packet_loss_stats['protocol_stats'][proto]['transmitted'] += 1
            
            # Calculate basic latency (ensure non-negative)
            latency = max(0, (float(next_pkt.time) - float(pkt.time)) * 1000)
            self.latencies[proto].append(latency)
            self.timestamps[proto].append(float(pkt.time))
            
            # Ensure packet size is non-negative
            packet_size = max(0, len(pkt))
            self.packet_sizes[proto].append(packet_size)
            
            # Calculate jitter (already using abs, but ensure base values are non-negative)
            if len(self.latencies[proto]) > 1:
                prev_latency = max(0, self.latencies[proto][-2])
                jitter = abs(latency - prev_latency)
                self.jitter_values[proto].append(jitter)
            
            # Only process IP packets for delay categories
            if IP in pkt and IP in next_pkt:
                delay = max(0, float(next_pkt.time) - float(pkt.time))  # Ensure non-negative
                
                # Analyze IoT-specific patterns
                if TCP in pkt:
                    # Check for MQTT ports (common in IoT)
                    is_mqtt = (pkt[TCP].dport in [1883, 8883] or 
                             pkt[TCP].sport in [1883, 8883])
                    
                    if is_mqtt:
                        flow = (pkt[IP].src, pkt[TCP].sport, pkt[IP].dst, pkt[TCP].dport)
                        payload_size = len(pkt[TCP].payload)
                        
                        # Device-to-Broker delays (typically small packets < 100 bytes)
                        if payload_size < 100:
                            self.delay_categories['device_to_broker_delays'].append({
                                'time': float(pkt.time),
                                'delay': max(0, delay * 1000),  # Ensure non-negative
                                'size': max(0, payload_size),
                                'flow': flow
                            })
                        
                        # Broker aggregation delays (larger packets indicating bundling)
                        if payload_size > 1000:  # Threshold for bundled data
                            self.delay_categories['broker_aggregation_delays'].append({
                                'time': float(pkt.time),
                                'delay': max(0, delay * 1000),  # Ensure non-negative
                                'size': max(0, payload_size),
                                'flow': flow
                            })
                            
                            # Track bundle patterns
                            self.iot_metrics['packet_bundles'].append({
                                'time': float(pkt.time),
                                'size': payload_size,
                                'flow': flow
                            })
                            self.iot_metrics['bundle_sizes'].append(payload_size)
                            
                            # Calculate aggregation interval
                            if last_bundle_time[flow]:
                                interval = float(pkt.time) - last_bundle_time[flow]
                                self.iot_metrics['aggregation_intervals'].append(interval)
                            last_bundle_time[flow] = float(pkt.time)
                        
                        # Cloud upload delays (large packets with sustained high throughput)
                        if (payload_size > 5000 and  # Large packets
                            len(self.tcp_flows[flow]) > 5):  # Sustained flow
                            self.delay_categories['cloud_upload_delays'].append({
                                'time': float(pkt.time),
                                'delay': max(0, delay * 1000),  # Ensure non-negative
                                'size': max(0, payload_size),
                                'flow': flow
                            })
                            
                            self.iot_metrics['upload_patterns'].append({
                                'time': float(pkt.time),
                                'size': payload_size,
                                'flow': flow
                            })
                        
                            # Track device transmission patterns
                            self.iot_metrics['device_patterns'][pkt[IP].src].append({
                                'time': float(pkt.time),
                                'size': payload_size,
                                'type': 'small' if payload_size < 100 else 'bundle'
                            })
                
                # Classify delays
                if delay > 0.1:  # More than 100ms
                    self.delay_categories['broker_processing_delays'].append({
                        'time': float(pkt.time),
                        'delay': max(0, delay * 1000),  # Ensure non-negative
                        'src': pkt[IP].src,
                        'dst': pkt[IP].dst
                    })
                
                # Only process TCP packets for bundling and packet loss analysis
                if TCP in pkt and TCP in next_pkt:
                    flow = (pkt[IP].src, pkt[TCP].sport, pkt[IP].dst, pkt[TCP].dport)
                    
                    # Check for retransmissions - UPDATED LOGIC
                    if len(self.tcp_flows[flow]) > 0:
                        last_seq = self.tcp_flows[flow][-1][1]
                        current_seq = pkt[TCP].seq
                        payload_len = len(pkt[TCP].payload)
                        
                        # Only count as retransmission if:
                        # 1. Sequence number matches exactly
                        # 2. Packet has payload (not just ACK)
                        # 3. Not a keep-alive packet (zero window probe)
                        if (current_seq == last_seq and 
                            payload_len > 0 and 
                            not (payload_len == 1 and pkt[TCP].window == 0)):
                            self.retransmissions.append({
                                'time': float(pkt.time),
                                'flow': flow,
                                'seq': current_seq
                            })
                    
                    self.tcp_flows[flow].append((float(pkt.time), pkt[TCP].seq))
                    
                    # Check for bundling
                    if delay < 0.001:  # Less than 1ms
                        self.delay_categories['bundling_delays'].append({
                            'time': float(pkt.time),
                            'delay': max(0, delay * 1000)  # Ensure non-negative
                        })
                    
                    # Analyze sequence numbers for packet loss - Updated logic
                    current_seq = pkt[TCP].seq
                    next_seq = next_pkt[TCP].seq
                    payload_len = len(pkt[TCP].payload)
                    
                    # Initialize flow tracking if new flow
                    if flow not in flow_seq_tracking:
                        flow_seq_tracking[flow] = {'last_seq': current_seq, 'last_ack': pkt[TCP].ack}
                    
                    # Debug output (limit to first 10 pairs to avoid spam)
                    if seq_debug_count < 10:
                        print(f"\nPacket pair {seq_debug_count}:")
                        print(f"  Flow: {flow}")
                        print(f"  Current packet: seq={current_seq}, ack={pkt[TCP].ack}, payload_len={payload_len}")
                        print(f"  Next packet: seq={next_seq}, ack={next_pkt[TCP].ack}")
                        if payload_len > 0:
                            expected_seq = (current_seq + payload_len) & 0xFFFFFFFF
                            print(f"  Expected next seq: {expected_seq}")
                        print(f"  TCP flags: {pkt[TCP].flags}")
                        seq_debug_count += 1
                    
                    # Check for sequence number discontinuity
                    last_seq = flow_seq_tracking[flow]['last_seq']
                    if payload_len > 0:
                        expected_seq = (last_seq + payload_len) & 0xFFFFFFFF
                        
                        # Check if next sequence number is unexpected
                        if current_seq != expected_seq:
                            # Ignore if it's a retransmission
                            if current_seq != last_seq:
                                missing_bytes = (current_seq - expected_seq) & 0xFFFFFFFF
                                if 0 < missing_bytes < 10000:  # Reasonable threshold
                                    print(f"\nPotential loss detected in flow {flow} (Protocol: {proto}):")
                                    print(f"  Expected seq: {expected_seq}")
                                    print(f"  Actual seq: {current_seq}")
                                    print(f"  Missing bytes: {missing_bytes}")
                                    
                                    self.packet_loss_stats['lost_packets'][proto].append({
                                        'time': float(pkt.time),
                                        'flow': flow,
                                        'missing_seq': range(expected_seq, current_seq),
                                        'bytes_lost': missing_bytes
                                    })
                                    self.packet_loss_stats['loss_timestamps'][proto].append(float(pkt.time))
                                    self.packet_loss_stats['protocol_stats'][proto]['lost'] += 1
                    
                    # Update flow tracking
                    flow_seq_tracking[flow]['last_seq'] = (current_seq + payload_len) & 0xFFFFFFFF
                    flow_seq_tracking[flow]['last_ack'] = pkt[TCP].ack

    def _get_protocol(self, pkt):
        """Determine packet protocol with expanded protocol detection"""
        if IP in pkt:
            if TCP in pkt:
                # MQTT (both standard and secure)
                if pkt[TCP].dport in [1883, 8883] or pkt[TCP].sport in [1883, 8883]:
                    return 'MQTT'
                # HTTP/HTTPS
                elif pkt[TCP].dport in [80, 8080] or pkt[TCP].sport in [80, 8080]:
                    return 'HTTP'
                elif pkt[TCP].dport == 443 or pkt[TCP].sport == 443:
                    return 'HTTPS'
                # FTP
                elif pkt[TCP].dport in [20, 21] or pkt[TCP].sport in [20, 21]:
                    return 'FTP'
                # SSH
                elif pkt[TCP].dport == 22 or pkt[TCP].sport == 22:
                    return 'SSH'
                # SMTP
                elif pkt[TCP].dport == 25 or pkt[TCP].sport == 25:
                    return 'SMTP'
                # DNS over TCP
                elif pkt[TCP].dport == 53 or pkt[TCP].sport == 53:
                    return 'DNS-TCP'
                # Telnet
                elif pkt[TCP].dport == 23 or pkt[TCP].sport == 23:
                    return 'Telnet'
                return 'TCP'
            
            elif UDP in pkt:
                # DNS
                if pkt[UDP].dport == 53 or pkt[UDP].sport == 53:
                    return 'DNS'
                # DHCP
                elif pkt[UDP].dport in [67, 68] or pkt[UDP].sport in [67, 68]:
                    return 'DHCP'
                # SNMP
                elif pkt[UDP].dport == 161 or pkt[UDP].sport == 161:
                    return 'SNMP'
                # NTP
                elif pkt[UDP].dport == 123 or pkt[UDP].sport == 123:
                    return 'NTP'
                # TFTP
                elif pkt[UDP].dport == 69 or pkt[UDP].sport == 69:
                    return 'TFTP'
                return 'UDP'
            
            elif pkt[IP].proto == 1:  # ICMP
                return 'ICMP'
            elif pkt[IP].proto == 2:  # IGMP
                return 'IGMP'
            elif pkt[IP].proto == 50:  # ESP (IPSec)
                return 'ESP'
            elif pkt[IP].proto == 51:  # AH (IPSec)
                return 'AH'
            elif pkt[IP].proto == 89:  # OSPF
                return 'OSPF'
            elif pkt[IP].proto == 103:  # PIM
                return 'PIM'
        
        # Non-IP protocols
        if 'ARP' in pkt:
            return 'ARP'
        elif 'IPv6' in pkt:
            return 'IPv6'
        elif 'LLC' in pkt:
            return 'LLC'
        elif 'STP' in pkt:
            return 'STP'
        
        return 'Other'

    def calculate_packet_loss(self):
        """Calculate protocol-wise packet loss statistics"""
        results = {
            'overall': {
                'total_lost_packets': 0,
                'total_transmitted': len(self.packets),
                'loss_percentage': 0.0,
                'loss_events': 0
            },
            'per_protocol': {}
        }
        
        # Calculate per-protocol statistics
        for proto in self.packet_loss_stats['protocol_stats']:
            stats = self.packet_loss_stats['protocol_stats'][proto]
            lost = stats['lost']
            transmitted = stats['transmitted']
            
            if transmitted > 0:
                loss_percentage = (lost / (transmitted + lost)) * 100
            else:
                loss_percentage = 0.0
                
            results['per_protocol'][proto] = {
                'lost_packets': lost,
                'transmitted': transmitted,
                'loss_percentage': loss_percentage,
                'loss_events': len(self.packet_loss_stats['lost_packets'][proto])
            }
            
            # Update overall statistics
            results['overall']['total_lost_packets'] += lost
            results['overall']['loss_events'] += len(self.packet_loss_stats['lost_packets'][proto])
        
        # Calculate overall loss percentage
        total_lost = results['overall']['total_lost_packets']
        total_transmitted = results['overall']['total_transmitted']
        if total_transmitted > 0:
            results['overall']['loss_percentage'] = (total_lost / (total_transmitted + total_lost)) * 100
        
        return results

    def analyze_delay_types(self):
        """Analyze and categorize different types of delays"""
        print("Analyzing delay types...")
        
        for i in range(len(self.packets)-1):
            pkt = self.packets[i]
            next_pkt = self.packets[i+1]
            
            if IP in pkt and IP in next_pkt:
                delay = float(next_pkt.time) - float(pkt.time)
                pkt_size = len(pkt)
                proto = self._get_protocol(pkt)
                
                # Transmission delay (size-dependent)
                transmission_delay = pkt_size * 0.00008  # Simplified calculation
                self.delay_analysis['transmission_delays'][proto].append({
                    'time': float(pkt.time),
                    'delay': transmission_delay,
                    'size': pkt_size
                })
                
                # Processing delay (protocol-dependent)
                if TCP in pkt:
                    processing_delay = delay * 0.3  # Estimated TCP overhead
                elif UDP in pkt:
                    processing_delay = delay * 0.1  # Estimated UDP overhead
                else:
                    processing_delay = delay * 0.2  # Default overhead
                
                self.delay_analysis['processing_delays'][proto].append({
                    'time': float(pkt.time),
                    'delay': processing_delay,
                    'type': proto
                })
                
                # Queuing delay detection
                if delay > 0.1:  # Threshold for potential queuing
                    self.delay_analysis['queuing_delays'][proto].append({
                        'time': float(pkt.time),
                        'delay': delay,
                        'size': pkt_size
                    })
                
                # Detect congestion patterns
                if len(self.delay_analysis['queuing_delays'][proto]) >= 3:
                    recent_delays = [d['delay'] for d in self.delay_analysis['queuing_delays'][proto][-3:]]
                    if all(d > 0.1 for d in recent_delays) and sum(recent_delays) > 0.5:
                        self.delay_patterns['congestion_events'].append({
                            'time': float(pkt.time),
                            'protocol': proto,
                            'avg_delay': sum(recent_delays) / 3
                        })
                
                # Detect jitter
                if len(self.latencies[proto]) >= 2:
                    jitter = abs(self.latencies[proto][-1] - self.latencies[proto][-2])
                    if jitter > 50:  # High jitter threshold (ms)
                        self.delay_patterns['jitter_events'].append({
                            'time': float(pkt.time),
                            'protocol': proto,
                            'jitter': jitter
                        })

    def analyze_delay_root_causes(self):
        """Analyze root causes of delays by correlating various factors"""
        print("Analyzing delay root causes...")
        
        # Initialize correlation data
        correlation_data = {
            'size_vs_delay': defaultdict(list),
            'protocol_vs_delay': defaultdict(list),
            'time_vs_delay': defaultdict(list)
        }
        
        for proto in self.latencies:
            for i, delay in enumerate(self.latencies[proto]):
                timestamp = self.timestamps[proto][i]
                pkt_size = self.packet_sizes[proto][i]
                
                correlation_data['size_vs_delay'][proto].append({
                    'size': pkt_size,
                    'delay': delay
                })
                
                correlation_data['protocol_vs_delay'][proto].append(delay)
                
                correlation_data['time_vs_delay'][proto].append({
                    'time': timestamp,
                    'delay': delay
                })
        
        return correlation_data

    def plot_delay_analysis(self, output_dir):
        """Generate visualizations for delay analysis"""
        # 1. Delay Types Distribution
        plt.figure(figsize=(12, 6))
        for delay_type, delays in self.delay_analysis.items():
            all_delays = []
            for proto_delays in delays.values():
                all_delays.extend([d['delay'] for d in proto_delays])
            if all_delays:
                sns.kdeplot(data=all_delays, label=delay_type.replace('_', ' ').title())
        
        plt.xlabel('Delay (ms)')
        plt.ylabel('Density')
        plt.title('Distribution of Different Delay Types')
        plt.legend()
        plt.xlim(left=0)
        plt.savefig(f'{output_dir}/delay_types_distribution.png')
        plt.close()
        
        # 2. Delay Patterns Timeline
        plt.figure(figsize=(15, 8))
        
        # Plot congestion events
        congestion_times = [event['time'] for event in self.delay_patterns['congestion_events']]
        congestion_delays = [event['avg_delay'] for event in self.delay_patterns['congestion_events']]
        plt.scatter(congestion_times, congestion_delays, label='Congestion Events', color='red', alpha=0.6)
        
        # Plot jitter events
        jitter_times = [event['time'] for event in self.delay_patterns['jitter_events']]
        jitter_values = [event['jitter'] for event in self.delay_patterns['jitter_events']]
        plt.scatter(jitter_times, jitter_values, label='High Jitter Events', color='orange', alpha=0.6)
        
        plt.xlabel('Time (seconds)')
        plt.ylabel('Delay/Jitter (ms)')
        plt.title('Network Events Timeline')
        plt.legend()
        plt.grid(True)
        plt.savefig(f'{output_dir}/delay_patterns_timeline.png')
        plt.close()
        
        # 3. Root Cause Correlation
        correlation_data = self.analyze_delay_root_causes()
        
        # Size vs Delay correlation
        plt.figure(figsize=(12, 6))
        for proto, data in correlation_data['size_vs_delay'].items():
            sizes = [d['size'] for d in data]
            delays = [d['delay'] for d in data]
            plt.scatter(sizes, delays, label=proto, alpha=0.5)
        
        plt.xlabel('Packet Size (bytes)')
        plt.ylabel('Delay (ms)')
        plt.title('Packet Size vs Delay Correlation')
        plt.legend()
        plt.savefig(f'{output_dir}/size_delay_correlation.png')
        plt.close()

    def generate_reports(self):
        """Generate comprehensive analysis reports"""
        # Create output directory
        output_dir = 'analysis_output'
        os.makedirs(output_dir, exist_ok=True)
        
        # 1. Latency Analysis
        self._plot_latency_distribution(output_dir)
        self._plot_latency_timeline(output_dir)
        
        # 2. Jitter Analysis
        self._plot_jitter_distribution(output_dir)
        
        # 3. Packet Size Analysis
        self._plot_packet_size_distribution(output_dir)
        
        # 4. Delay Categories Analysis
        self._plot_delay_categories(output_dir)
        
        # Add delay analysis
        self.analyze_delay_types()
        self.plot_delay_analysis(output_dir)
        
        # 5. Generate text report
        self._generate_text_report(output_dir)

    def _plot_latency_distribution(self, output_dir):
        """Plot the distribution of latencies for each protocol and send data to API"""
        plt.figure(figsize=(12, 6))
        distribution_data = {}
        
        for proto in self.latencies:
            # Filter out negative latencies
            positive_latencies = [lat for lat in self.latencies[proto] if lat >= 0]
            if positive_latencies:
                # Create KDE plot
                kde = sns.kdeplot(data=positive_latencies, label=proto)
                
                # Get coordinates
                line = kde.lines[-1]
                xdata = line.get_xdata()
                ydata = line.get_ydata()
                
                # Store filtered coordinates
                valid_indices = [i for i, x in enumerate(xdata) if x >= 0]
                distribution_data[proto] = {
                    'x': [float(xdata[i]) for i in valid_indices],
                    'y': [float(ydata[i]) for i in valid_indices]
                }
        
        # Complete and save the figure
        plt.xlabel('Latency (ms)')
        plt.ylabel('Density')
        plt.title('Latency Distribution by Protocol')
        plt.legend()
        plt.xlim(left=0)
        plt.savefig(f'{output_dir}/latency_distribution.png')
        plt.close()
        
        # Send data to API
        try:
            import requests
            response = requests.get(
                'http://localhost:8000/api/graph/latency_distribution',
                params={'data': json.dumps(distribution_data)}
            )
            if response.status_code != 200:
                print(f"Error sending latency distribution data: {response.text}")
        except Exception as e:
            print(f"Error sending data to API: {str(e)}")

    def _plot_latency_timeline(self, output_dir):
        plt.figure(figsize=(15, 7))
        for proto in self.latencies:
            # Filter out negative latencies
            positive_data = [(t, l) for t, l in zip(self.timestamps[proto], self.latencies[proto]) if l >= 0]
            if positive_data:
                timestamps, latencies = zip(*positive_data)
                plt.plot(timestamps, latencies, label=proto, alpha=0.7, marker='.')
        
        plt.xlabel('Time (seconds)')
        plt.ylabel('Latency (ms)')
        plt.title('Packet Latency Timeline')
        plt.legend()
        plt.grid(True)
        plt.ylim(bottom=0)  # Force y-axis to start at 0
        plt.savefig(f'{output_dir}/latency_timeline.png')
        plt.close()

    def _plot_jitter_distribution(self, output_dir):
        plt.figure(figsize=(12, 6))
        for proto in self.jitter_values:
            # Jitter values should already be non-negative (abs), but let's ensure
            jitter_values = [j for j in self.jitter_values[proto] if j >= 0]
            if jitter_values:
                sns.kdeplot(data=jitter_values, label=proto)
        
        plt.xlabel('Jitter (ms)')
        plt.ylabel('Density')
        plt.title('Jitter Distribution by Protocol')
        plt.legend()
        plt.xlim(left=0)  # Force x-axis to start at 0
        plt.savefig(f'{output_dir}/jitter_distribution.png')
        plt.close()

    def _plot_packet_size_distribution(self, output_dir):
        plt.figure(figsize=(12, 6))
        has_data = False
        
        for proto in self.packet_sizes:
            # Ensure all packet sizes are non-negative
            sizes = [size for size in self.packet_sizes[proto] if size >= 0]
            if len(sizes) > 1 and np.var(sizes) > 0:
                sns.kdeplot(data=sizes, label=f"{proto} (n={len(sizes)})")
                has_data = True
            elif len(sizes) > 0:
                avg_size = np.mean(sizes)
                plt.axvline(x=avg_size, label=f"{proto} (constant {avg_size:.0f} bytes, n={len(sizes)})", 
                           linestyle='--')
                has_data = True
        
        if has_data:
            plt.xlabel('Packet Size (bytes)')
            plt.ylabel('Density')
            plt.title('Packet Size Distribution by Protocol')
            plt.legend()
            plt.xlim(left=0)  # Force x-axis to start at 0
        else:
            plt.text(0.5, 0.5, 'No packet size data available', 
                    horizontalalignment='center', verticalalignment='center')
        
        plt.savefig(f'{output_dir}/packet_size_distribution.png')
        plt.close()

    def _plot_delay_categories(self, output_dir):
        plt.figure(figsize=(15, 7))
        for category, delays in self.delay_categories.items():
            if delays:
                # Filter out negative delays
                positive_delays = [d['delay'] for d in delays if d['delay'] >= 0]
                if positive_delays:
                    plt.boxplot(positive_delays, positions=[list(self.delay_categories.keys()).index(category)],
                              labels=[category.replace('_', ' ').title()])
        
        plt.xlabel('Delay Category')
        plt.ylabel('Delay (ms)')
        plt.title('Delay Distribution by Category')
        plt.xticks(rotation=45)
        plt.grid(True)
        plt.ylim(bottom=0)  # Force y-axis to start at 0
        plt.tight_layout()
        plt.savefig(f'{output_dir}/delay_categories.png')
        plt.close()

    def _generate_text_report(self, output_dir):
        """Generate comprehensive analysis report"""
        with open(f'{output_dir}/analysis_report.txt', 'w') as f:
            # Get overview data
            overview = self.get_capture_overview()
            stats = self.basic_statistics()
            
            # File Information
            f.write("=====================================\n")
            f.write("=== PCAP ANALYSIS DETAILED REPORT ===\n")
            f.write("=====================================\n\n")
            f.write(f"File: {self.pcap_file}\n")
            f.write(f"Total Packets: {stats['total_packets']}\n")
            
            # Time Information
            start_time = datetime.fromtimestamp(overview['time_range']['start'])
            end_time = datetime.fromtimestamp(overview['time_range']['end'])
            duration = overview['time_range']['end'] - overview['time_range']['start']
            
            f.write(f"\nCapture Duration: {duration:.2f} seconds\n")
            f.write(f"Start Time: {start_time}\n")
            f.write(f"End Time: {end_time}\n")
            
            # Protocol Distribution
            f.write("\n=== Protocol Distribution ===\n")
            for proto, count in sorted(overview['protocols'].items(), key=lambda x: x[1], reverse=True):
                percentage = (count / len(self.packets)) * 100
                f.write(f"{proto:<10} : {count:>6} packets ({percentage:>6.2f}%)\n")
            
            # Packet Type Distribution
            f.write("\n=== Packet Type Distribution ===\n")
            for pkt_type, count in sorted(overview['packet_counts'].items(), key=lambda x: x[1], reverse=True):
                percentage = (count / len(self.packets)) * 100
                f.write(f"{pkt_type:<10} : {count:>6} packets ({percentage:>6.2f}%)\n")
            
            # IP Statistics
            f.write("\n=== Top Source IP Addresses ===\n")
            for ip, count in sorted(overview['ip_stats']['sources'].items(), key=lambda x: x[1], reverse=True)[:10]:
                percentage = (count / len(self.packets)) * 100
                f.write(f"{ip:<15} : {count:>6} packets ({percentage:>6.2f}%)\n")
            
            f.write("\n=== Top Destination IP Addresses ===\n")
            for ip, count in sorted(overview['ip_stats']['destinations'].items(), key=lambda x: x[1], reverse=True)[:10]:
                percentage = (count / len(self.packets)) * 100
                f.write(f"{ip:<15} : {count:>6} packets ({percentage:>6.2f}%)\n")
            
            # Port Statistics
            f.write("\n=== Top Source Ports ===\n")
            for port, count in sorted(overview['port_stats']['sources'].items(), key=lambda x: x[1], reverse=True)[:10]:
                percentage = (count / len(self.packets)) * 100
                f.write(f"Port {port:<6} : {count:>6} packets ({percentage:>6.2f}%)\n")
            
            f.write("\n=== Top Destination Ports ===\n")
            for port, count in sorted(overview['port_stats']['destinations'].items(), key=lambda x: x[1], reverse=True)[:10]:
                percentage = (count / len(self.packets)) * 100
                f.write(f"Port {port:<6} : {count:>6} packets ({percentage:>6.2f}%)\n")
            
            # Protocol-specific Statistics
            f.write("\n=== Protocol-Specific Statistics ===\n")
            for proto in self.latencies:
                f.write(f"\n{proto} Statistics:\n")
                f.write(f"  Packet Count: {len(self.latencies[proto])}\n")
                if self.latencies[proto]:
                    f.write(f"  Average Latency: {np.mean(self.latencies[proto]):.2f} ms\n")
                    f.write(f"  Max Latency: {max(self.latencies[proto]):.2f} ms\n")
                    f.write(f"  Min Latency: {min(self.latencies[proto]):.2f} ms\n")
                    f.write(f"  Std Dev Latency: {np.std(self.latencies[proto]):.2f} ms\n")
                    
                    if self.jitter_values[proto]:
                        f.write(f"  Average Jitter: {np.mean(self.jitter_values[proto]):.2f} ms\n")
                    
                    f.write(f"  Average Packet Size: {np.mean(self.packet_sizes[proto]):.2f} bytes\n")
            
            # Retransmission Analysis
            f.write("\n=== Retransmission Analysis ===\n")
            f.write(f"Total Retransmissions: {len(self.retransmissions)}\n")
            if self.retransmissions:
                f.write("\nTop Retransmission Events:\n")
                for retrans in self.retransmissions[:10]:
                    f.write(f"  Time: {datetime.fromtimestamp(retrans['time'])} - "
                           f"Flow: {retrans['flow']}\n")
            
            # Performance Insights
            f.write("\n=== Performance Insights ===\n")
            # Add average packet rates
            packets_per_second = len(self.packets) / duration
            f.write(f"Average Packet Rate: {packets_per_second:.2f} packets/second\n")
            
            # Add protocol-specific rates
            f.write("\nProtocol-specific Rates:\n")
            for proto, count in overview['protocols'].items():
                rate = count / duration
                f.write(f"  {proto:<10}: {rate:.2f} packets/second\n")
            
            # Add overall network load
            total_bytes = sum(len(pkt) for pkt in self.packets)
            bandwidth = (total_bytes * 8) / (duration * 1000000)  # Mbps
            f.write(f"\nAverage Network Load: {bandwidth:.2f} Mbps\n")
            
            # Add delay category analysis
            f.write("\n=== Delay Category Analysis ===\n")
            for category, delays in self.delay_categories.items():
                if delays:
                    avg_delay = np.mean([d['delay'] for d in delays])
                    max_delay = max([d['delay'] for d in delays])
                    f.write(f"\n{category.replace('_', ' ').title()}:\n")
                    f.write(f"  Count: {len(delays)}\n")
                    f.write(f"  Average Delay: {avg_delay:.2f} ms\n")
                    f.write(f"  Maximum Delay: {max_delay:.2f} ms\n")
            
            # Add protocol-wise packet loss statistics
            loss_stats = self.calculate_packet_loss()
            f.write("\n=== Packet Loss Analysis ===\n")
            f.write("\nOverall Statistics:\n")
            f.write(f"Total Lost Packets: {loss_stats['overall']['total_lost_packets']}\n")
            f.write(f"Total Transmitted: {loss_stats['overall']['total_transmitted']}\n")
            f.write(f"Overall Loss Percentage: {loss_stats['overall']['loss_percentage']:.2f}%\n")
            f.write(f"Total Loss Events: {loss_stats['overall']['loss_events']}\n")
            
            f.write("\nPer-Protocol Statistics:\n")
            for proto, stats in loss_stats['per_protocol'].items():
                if stats['transmitted'] > 0:  # Only show protocols with traffic
                    f.write(f"\n{proto}:\n")
                    f.write(f"  Lost Packets: {stats['lost_packets']}\n")
                    f.write(f"  Transmitted: {stats['transmitted']}\n")
                    f.write(f"  Loss Percentage: {stats['loss_percentage']:.2f}%\n")
                    f.write(f"  Loss Events: {stats['loss_events']}\n")

            # Add IoT-specific analysis
            f.write("\n=== IoT Traffic Analysis ===\n")
            
            # Bundle analysis
            if self.iot_metrics['bundle_sizes']:
                avg_bundle = np.mean(self.iot_metrics['bundle_sizes'])
                max_bundle = max(self.iot_metrics['bundle_sizes'])
                f.write(f"\nPacket Bundling:\n")
                f.write(f"  Total Bundles: {len(self.iot_metrics['packet_bundles'])}\n")
                f.write(f"  Average Bundle Size: {avg_bundle:.2f} bytes\n")
                f.write(f"  Maximum Bundle Size: {max_bundle:.2f} bytes\n")
            
            # Aggregation intervals
            if self.iot_metrics['aggregation_intervals']:
                avg_interval = np.mean(self.iot_metrics['aggregation_intervals'])
                f.write(f"\nAggregation Patterns:\n")
                f.write(f"  Average Interval: {avg_interval:.2f} seconds\n")
            
            # Device patterns
            f.write("\nDevice Transmission Patterns:\n")
            for device, patterns in self.iot_metrics['device_patterns'].items():
                small_pkts = sum(1 for p in patterns if p['type'] == 'small')
                bundle_pkts = sum(1 for p in patterns if p['type'] == 'bundle')
                f.write(f"\n  Device {device}:\n")
                f.write(f"    Small Packets: {small_pkts}\n")
                f.write(f"    Bundled Packets: {bundle_pkts}\n")

            # Add delay analysis
            f.write("\n=== Detailed Delay Analysis ===\n")
            
            # Delay Types Summary
            f.write("\nDelay Type Statistics:\n")
            for delay_type, delays in self.delay_analysis.items():
                f.write(f"\n{delay_type.replace('_', ' ').title()}:\n")
                for proto, proto_delays in delays.items():
                    if proto_delays:
                        avg_delay = np.mean([d['delay'] for d in proto_delays])
                        max_delay = max([d['delay'] for d in proto_delays])
                        f.write(f"  {proto}:\n")
                        f.write(f"    Average: {avg_delay:.2f} ms\n")
                        f.write(f"    Maximum: {max_delay:.2f} ms\n")
                        f.write(f"    Count: {len(proto_delays)}\n")
            
            # Network Events
            f.write("\nNetwork Events:\n")
            f.write(f"Congestion Events: {len(self.delay_patterns['congestion_events'])}\n")
            f.write(f"High Jitter Events: {len(self.delay_patterns['jitter_events'])}\n")
            
            # Root Cause Analysis
            f.write("\nRoot Cause Analysis:\n")
            correlation_data = self.analyze_delay_root_causes()
            for proto in correlation_data['protocol_vs_delay']:
                delays = correlation_data['protocol_vs_delay'][proto]
                if delays:
                    f.write(f"\n{proto}:\n")
                    f.write(f"  Average Delay: {np.mean(delays):.2f} ms\n")
                    f.write(f"  Delay Variation: {np.std(delays):.2f} ms\n")
                    
                    # Size correlation
                    size_data = correlation_data['size_vs_delay'][proto]
                    sizes = [d['size'] for d in size_data]
                    size_delays = [d['delay'] for d in size_data]
                    if len(sizes) > 1:
                        correlation = np.corrcoef(sizes, size_delays)[0,1]
                        f.write(f"  Size-Delay Correlation: {correlation:.2f}\n")

    def get_capture_overview(self):
        """Generate a comprehensive overview of the capture file"""
        overview = {
            'packet_counts': defaultdict(int),
            'protocols': defaultdict(int),
            'time_range': {
                'start': float('inf'),
                'end': float('-inf')
            },
            'ip_stats': {
                'sources': defaultdict(int),
                'destinations': defaultdict(int)
            },
            'port_stats': {
                'sources': defaultdict(int),
                'destinations': defaultdict(int)
            }
        }
        
        for pkt in self.packets:
            # Update timestamp range
            pkt_time = float(pkt.time)
            overview['time_range']['start'] = min(overview['time_range']['start'], pkt_time)
            overview['time_range']['end'] = max(overview['time_range']['end'], pkt_time)
            
            # Get protocol and update counts
            proto = self._get_protocol(pkt)
            overview['protocols'][proto] += 1
            
            # IP-level statistics
            if IP in pkt:
                overview['packet_counts']['IP'] += 1
                overview['ip_stats']['sources'][pkt[IP].src] += 1
                overview['ip_stats']['destinations'][pkt[IP].dst] += 1
                
                # TCP statistics
                if TCP in pkt:
                    overview['packet_counts']['TCP'] += 1
                    overview['port_stats']['sources'][pkt[TCP].sport] += 1
                    overview['port_stats']['destinations'][pkt[TCP].dport] += 1
                
                # UDP statistics
                elif UDP in pkt:
                    overview['packet_counts']['UDP'] += 1
                    overview['port_stats']['sources'][pkt[UDP].sport] += 1
                    overview['port_stats']['destinations'][pkt[UDP].dport] += 1
            
            # Non-IP packet statistics
            elif 'ARP' in pkt:
                overview['packet_counts']['ARP'] += 1
            elif 'IPv6' in pkt:
                overview['packet_counts']['IPv6'] += 1
        
        return overview

    def print_capture_overview(self):
        """Print a formatted overview of the capture file"""
        overview = self.get_capture_overview()
        
        print("\n=== PCAP File Overview ===")
        print(f"File: {self.pcap_file}")
        print(f"Total Packets: {len(self.packets)}")
        
        # Time range
        start_time = datetime.fromtimestamp(overview['time_range']['start'])
        end_time = datetime.fromtimestamp(overview['time_range']['end'])
        duration = overview['time_range']['end'] - overview['time_range']['start']
        
        print(f"\nCapture Duration: {duration:.2f} seconds")
        print(f"Start Time: {start_time}")
        print(f"End Time: {end_time}")
        
        # Protocol distribution
        print("\nProtocol Distribution:")
        for proto, count in sorted(overview['protocols'].items(), key=lambda x: x[1], reverse=True):
            percentage = (count / len(self.packets)) * 100
            print(f"  {proto:<10} : {count:>6} packets ({percentage:>6.2f}%)")
        
        # Packet type counts
        print("\nPacket Type Counts:")
        for pkt_type, count in sorted(overview['packet_counts'].items(), key=lambda x: x[1], reverse=True):
            percentage = (count / len(self.packets)) * 100
            print(f"  {pkt_type:<10} : {count:>6} packets ({percentage:>6.2f}%)")
        
        # Top IP addresses
        print("\nTop Source IP Addresses:")
        for ip, count in sorted(overview['ip_stats']['sources'].items(), key=lambda x: x[1], reverse=True)[:5]:
            percentage = (count / len(self.packets)) * 100
            print(f"  {ip:<15} : {count:>6} packets ({percentage:>6.2f}%)")
        
        print("\nTop Destination IP Addresses:")
        for ip, count in sorted(overview['ip_stats']['destinations'].items(), key=lambda x: x[1], reverse=True)[:5]:
            percentage = (count / len(self.packets)) * 100
            print(f"  {ip:<15} : {count:>6} packets ({percentage:>6.2f}%)")
        
        # Top ports
        print("\nTop Source Ports:")
        for port, count in sorted(overview['port_stats']['sources'].items(), key=lambda x: x[1], reverse=True)[:5]:
            percentage = (count / len(self.packets)) * 100
            print(f"  Port {port:<6} : {count:>6} packets ({percentage:>6.2f}%)")
        
        print("\nTop Destination Ports:")
        for port, count in sorted(overview['port_stats']['destinations'].items(), key=lambda x: x[1], reverse=True)[:5]:
            percentage = (count / len(self.packets)) * 100
            print(f"  Port {port:<6} : {count:>6} packets ({percentage:>6.2f}%)")

    def get_latency_distribution(self):
        """Generate latency distribution data for plotting"""
        distribution_data = {}
        
        plt.figure(figsize=(12, 6))
        
        for proto in self.latencies:
            # Filter out negative latencies
            positive_latencies = [lat for lat in self.latencies[proto] if lat >= 0]
            if positive_latencies:
                kde = sns.kdeplot(data=positive_latencies, label=proto)
                
                line = kde.lines[-1]
                xdata = line.get_xdata()
                ydata = line.get_ydata()
                
                # Store coordinates in the distribution data
                distribution_data[proto] = {
                    'x': [float(x) for x in xdata if x >= 0],  # Convert to float for JSON serialization
                    'y': [float(y) for y in ydata if y >= 0]   # Convert to float for JSON serialization
                }
        
        plt.close()  # Close the figure since we don't need it
        
        return distribution_data

def main():
    # Use relative path from the script's location
    pcap_file = os.path.join(os.path.dirname(__file__), "pcapngFiles", "28-1-25-bro-laptp-20ms.pcapng")
    
    print(f"Analyzing {pcap_file}...")
    analyzer = PacketAnalyzer(pcap_file)
    
    print("\nGenerating capture overview...")
    analyzer.print_capture_overview()
    
    print("\nCalculating basic statistics...")
    stats = analyzer.basic_statistics()
    
    print("Analyzing delays and patterns...")
    analyzer.analyze_delays()
    
    print("Generating reports and visualizations...")
    analyzer.generate_reports()
    
    print("\nAnalysis complete! Check the 'analysis_output' directory for results.")

if __name__ == "__main__":
    main()