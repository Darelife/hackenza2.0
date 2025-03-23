# <img src="/home/soham/Documents/hackenza2.0/logo.png"></img>

A web-based tool for analyzing network packet captures (PCAPNG files) with detailed visualization and analysis capabilities.

## Features
- Real-time packet analysis  
- Interactive visualizations  
- Network traffic patterns  
- Protocol-specific analysis  
- IoT traffic detection  
- Detailed packet search  
- Export capabilities  

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- Flask
- Next.js 13+

### Installation
#### Clone the repository:
```bash
 git clone https://github.com/darelife/hackenza2.0.git
 cd hackenza2.0
```

#### Install backend dependencies:
- Activate virtual environment.
```bash
 cd backend
 pip install -r requirements.txt
```

#### Install frontend dependencies:
```bash
 cd frontend
 npm install
```

## Running the Application

1. Start the backend server:
```bash
 cd backend
 python main.py
```

2. Start the frontend development server:
```bash
 cd frontend
 npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Usage

### Uploading PCAPNG Files
1. Navigate to the home page  
2. Drag and drop your `.pcapng` file or click to browse  
3. Wait for the analysis to complete  
4. View the results on the overview page  

### Searching Packets
The search functionality allows you to:
- Filter by protocol
- Search by IP addresses
- Filter by packet size
- Full-text search in packet info
- Export filtered results

## Analysis Features

### Overview Page
- Total packet count
- Average packet size
- Capture duration
- Protocol distribution
- Traffic patterns

### Search Page
- Advanced filtering options
- Real-time search
- Packet details view
- Export functionality

### Visualization
- Protocol distribution charts
- Traffic timeline
- Packet size distribution
- Delay analysis

## API Documentation

### Endpoints
- insert afterwards

## Project Structure
```
/hackenza2.0
│── backend
│   ├── main.py
│   ├── test.py
│   └── requirements.txt
│── frontend
│   ├── pages
│   ├── components
│   ├── styles
│   └── package.json
└── README.md
```

## Development

### Frontend Development
The frontend is built with Next.js 13+ and uses:
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Shadcn/ui** for components
- **React Hooks** for state management

### Backend Development
The backend uses:
- **Flask** for the REST API
- **Scapy** for packet analysis
- **NumPy** for data processing
- **Matplotlib** for visualization

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments
- **ASCII BITS Pilani, Goa** for organizing Hackenza 2025
- **The dominoes delivery guy** for feeding all of us
- **The dog** who snuck inside the DLT

---
Made by MightHackShit