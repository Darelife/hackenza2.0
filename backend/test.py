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
        """Analyze various types of delays"""
        for i in range(len(self.packets)-1):
            pkt = self.packets[i]
            next_pkt = self.packets[i+1]
            
            # Determine protocol
            proto = self._get_protocol(pkt)
            
            # Calculate basic latency
            latency = (float(next_pkt.time) - float(pkt.time)) * 1000
            self.latencies[proto].append(latency)
            self.timestamps[proto].append(float(pkt.time))
            self.packet_sizes[proto].append(len(pkt))
            
            # Calculate jitter (variation in delay)
            if len(self.latencies[proto]) > 1:
                jitter = abs(latency - self.latencies[proto][-2])
                self.jitter_values[proto].append(jitter)
            
            # Analyze TCP flows and retransmissions - only if packet has both IP and TCP layers
            if IP in pkt and TCP in pkt:
                flow = (pkt[IP].src, pkt[IP].dst, pkt[TCP].sport, pkt[TCP].dport)
                self.tcp_flows[flow].append((float(pkt.time), pkt[TCP].seq))
                
                # Check for retransmissions
                if len(self.tcp_flows[flow]) > 1:
                    if pkt[TCP].seq == self.tcp_flows[flow][-2][1]:
                        self.retransmissions.append({
                            'time': float(pkt.time),
                            'flow': flow,
                            'seq': pkt[TCP].seq
                        })

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
        
        # 4. Generate text report
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
    pcap_file = "/home/soham/Documents/hackenza2.0/backend/pcapngFiles/28-1-25-bro-laptp-40ms.pcapng"  # Replace with your pcap file
    
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
