from scapy.all import rdpcap, IP, TCP, UDP
import matplotlib.pyplot as plt
from collections import defaultdict, Counter
import numpy as np
import seaborn as sns
from datetime import datetime
import os

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
            'network_delays': []
        }
        self.packet_loss_stats = {
            'total_expected': 0,
            'total_received': 0,
            'lost_packets': defaultdict(list),
            'loss_timestamps': defaultdict(list),
            'protocol_stats': defaultdict(lambda: {'lost': 0, 'transmitted': 0})
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

    def analyze_delays(self):
        """Analyze various types of delays and packet loss"""
        print("\nAnalyzing TCP sequence numbers for packet loss...")
        seq_debug_count = 0
        flow_seq_tracking = {}
        
        for i in range(len(self.packets)-1):
            pkt = self.packets[i]
            next_pkt = self.packets[i+1]
            
            # Determine protocol
            proto = self._get_protocol(pkt)
            
            # Update transmitted count for protocol
            self.packet_loss_stats['protocol_stats'][proto]['transmitted'] += 1
            
            # Calculate basic latency
            latency = (float(next_pkt.time) - float(pkt.time)) * 1000
            self.latencies[proto].append(latency)
            self.timestamps[proto].append(float(pkt.time))
            self.packet_sizes[proto].append(len(pkt))
            
            # Calculate jitter (variation in delay)
            if len(self.latencies[proto]) > 1:
                jitter = abs(latency - self.latencies[proto][-2])
                self.jitter_values[proto].append(jitter)
            
            # Only process IP packets for delay categories
            if IP in pkt and IP in next_pkt:
                # Classify delays
                delay = float(next_pkt.time) - float(pkt.time)
                
                # Classify based on delay characteristics
                if delay > 0.1:  # More than 100ms
                    self.delay_categories['broker_processing_delays'].append({
                        'time': float(pkt.time),
                        'delay': delay * 1000,  # Convert to ms
                        'src': pkt[IP].src,
                        'dst': pkt[IP].dst
                    })
                
                # Only process TCP packets for bundling and packet loss analysis
                if TCP in pkt and TCP in next_pkt:
                    flow = (pkt[IP].src, pkt[TCP].sport, pkt[IP].dst, pkt[TCP].dport)
                    self.tcp_flows[flow].append((float(pkt.time), pkt[TCP].seq))
                    
                    # Check for retransmissions
                    if len(self.tcp_flows[flow]) > 1:
                        if pkt[TCP].seq == self.tcp_flows[flow][-2][1]:
                            self.retransmissions.append({
                                'time': float(pkt.time),
                                'flow': flow,
                                'seq': pkt[TCP].seq
                            })
                    
                    # Check for bundling
                    if delay < 0.001:  # Less than 1ms
                        self.delay_categories['bundling_delays'].append({
                            'time': float(pkt.time),
                            'delay': delay * 1000
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
                # MQTT
                if pkt[TCP].dport == 1883 or pkt[TCP].sport == 1883:
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

    def generate_reports(self):
        """Generate comprehensive analysis reports"""
        # Create output directory
        output_dir = 'analysis_output'
        os.makedirs(output_dir, exist_ok=True)
        
        # 1. Latency Analysis
        self._plot_latency_distribution(output_dir)
        self._plot_latency_timeline(output_dir)
        
        # 2. Jitter Analysis
        self._plot_jitter_analysis(output_dir)
        
        # 3. Packet Size Analysis
        self._plot_packet_size_distribution(output_dir)
        
        # 4. Delay Categories Analysis
        self._plot_delay_categories(output_dir)
        
        # 5. Generate text report
        self._generate_text_report(output_dir)

    def _plot_latency_distribution(self, output_dir):
        plt.figure(figsize=(12, 6))
        for proto in self.latencies:
            sns.kdeplot(data=self.latencies[proto], label=proto)
        plt.xlabel('Latency (ms)')
        plt.ylabel('Density')
        plt.title('Latency Distribution by Protocol')
        plt.legend()
        plt.savefig(f'{output_dir}/latency_distribution.png')
        plt.close()

    def _plot_latency_timeline(self, output_dir):
        plt.figure(figsize=(15, 7))
        for proto in self.latencies:
            plt.plot(self.timestamps[proto], self.latencies[proto], 
                    label=proto, alpha=0.7, marker='.')
        plt.xlabel('Time (seconds)')
        plt.ylabel('Latency (ms)')
        plt.title('Packet Latency Timeline')
        plt.legend()
        plt.grid(True)
        plt.savefig(f'{output_dir}/latency_timeline.png')
        plt.close()

    def _plot_jitter_analysis(self, output_dir):
        plt.figure(figsize=(12, 6))
        for proto in self.jitter_values:
            if self.jitter_values[proto]:
                sns.kdeplot(data=self.jitter_values[proto], label=proto)
        plt.xlabel('Jitter (ms)')
        plt.ylabel('Density')
        plt.title('Jitter Distribution by Protocol')
        plt.legend()
        plt.savefig(f'{output_dir}/jitter_analysis.png')
        plt.close()

    def _plot_packet_size_distribution(self, output_dir):
        plt.figure(figsize=(12, 6))
        for proto in self.packet_sizes:
            sns.kdeplot(data=self.packet_sizes[proto], label=proto)
        plt.xlabel('Packet Size (bytes)')
        plt.ylabel('Density')
        plt.title('Packet Size Distribution by Protocol')
        plt.legend()
        plt.savefig(f'{output_dir}/packet_size_distribution.png')
        plt.close()

    def _plot_delay_categories(self, output_dir):
        """Plot delay categories distribution"""
        plt.figure(figsize=(15, 8))
        
        # Create subplots for different delay categories
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(15, 10))
        
        # Plot delay distributions
        colors = ['blue', 'green', 'red', 'orange']
        categories = ['bundling_delays', 'broker_processing_delays', 
                     'retransmission_delays', 'network_delays']
        
        for cat, color in zip(categories, colors):
            delays = [d['delay'] for d in self.delay_categories[cat]]
            if delays:
                sns.kdeplot(data=delays, ax=ax1, label=cat.replace('_', ' ').title(), color=color)
        
        ax1.set_xlabel('Delay (ms)')
        ax1.set_ylabel('Density')
        ax1.set_title('Delay Categories Distribution')
        ax1.legend()
        
        # Plot delay timeline
        for cat, color in zip(categories, colors):
            delays = self.delay_categories[cat]
            if delays:
                times = [d['time'] for d in delays]
                values = [d['delay'] for d in delays]
                ax2.scatter(times, values, label=cat.replace('_', ' ').title(), 
                          color=color, alpha=0.6, s=30)
        
        # Add packet loss indicators if available - FIXED VERSION
        if self.packet_loss_stats['loss_timestamps']:
            # Flatten all timestamps from all protocols into a single list
            all_timestamps = []
            for proto_timestamps in self.packet_loss_stats['loss_timestamps'].values():
                all_timestamps.extend(proto_timestamps)
            
            if all_timestamps:  # Only plot if we have timestamps
                ax2.vlines(all_timestamps,
                          ax2.get_ylim()[0], ax2.get_ylim()[1],
                          colors='red', linestyles='dashed', label='Packet Loss Events')
        
        ax2.set_xlabel('Time (seconds)')
        ax2.set_ylabel('Delay (ms)')
        ax2.set_title('Delay Categories Timeline')
        ax2.legend()
        
        plt.tight_layout()
        plt.savefig(f'{output_dir}/delay_categories_analysis.png')
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

def main():
    pcap_file = "/home/soham/Documents/hackenza2.0/backend/pcapngFiles/28-1-25-bro-rpi-30ms.pcapng"  # Replace with your pcap file
    
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
