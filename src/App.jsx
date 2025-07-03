import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import './index.css'; // THIS IS THE CORRECTED LINE
// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Fix default icon issue with Leaflet in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const API_BASE_URL = 'http://localhost:3000'; // Your JSON Server URL

// --- Components ---

// Mobile App: Report Flood
const ReportFlood = ({ addReport }) => {
    const [location, setLocation] = useState('');
    const [waterLevel, setWaterLevel] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('https://via.placeholder.com/150/0000FF/FFFFFF?text=Simulated+Flood'); // Simulated image
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        const newReport = {
            location,
            latitude: 6.5244 + (Math.random() - 0.5) * 0.1, // Simulate nearby Lagos coords
            longitude: 3.3792 + (Math.random() - 0.5) * 0.1,
            waterLevel: parseFloat(waterLevel),
            imageUrl,
            description,
            timestamp: new Date().toISOString(),
            validated: false, // Initially false, pending validation
            upvotes: 0,
            downvotes: 0
        };
        addReport(newReport);
        alert('Report submitted for peer validation!');
        setLocation('');
        setWaterLevel('');
        setDescription('');
        navigate('/app/validate'); // Go to validation page after submitting
    };

    return (
        <div className="container">
            <h2>Report Flood Incident</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Location (e.g., Ikorodu, Ajegunle)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                />
                <input
                    type="number"
                    step="0.1"
                    placeholder="Water Level (meters, e.g., 1.5)"
                    value={waterLevel}
                    onChange={(e) => setWaterLevel(e.target.value)}
                    required
                />
                <textarea
                    placeholder="Description of flood (e.g., Heavy flooding, blocked drain)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="4"
                    required
                ></textarea>
                <button type="submit">Submit Report</button>
            </form>
        </div>
    );
};

// Mobile App: Peer Validation
const PeerValidation = ({ reports, updateReport }) => {
    const [currentReportIndex, setCurrentReportIndex] = useState(0);
    const pendingReports = reports.filter(r => !r.validated && r.upvotes + r.downvotes < 5); // Simple rule for pending

    useEffect(() => {
        if (pendingReports.length > 0) {
            setCurrentReportIndex(0);
        }
    }, [pendingReports.length]);

    const handleVote = (voteType) => {
        if (pendingReports.length === 0) return;

        const reportToValidate = pendingReports[currentReportIndex];
        let updatedReport = { ...reportToValidate };

        if (voteType === 'upvote') {
            updatedReport.upvotes += 1;
        } else {
            updatedReport.downvotes += 1;
        }

        // Simple validation logic: 3+ upvotes without significant downvotes
        if (updatedReport.upvotes >= 3 && updatedReport.downvotes < 2) {
            updatedReport.validated = true;
            alert('Report validated successfully!');
        } else if (updatedReport.downvotes >= 3) {
             alert('Report rejected by peer validation!');
             // Optionally, remove or mark as explicitly rejected
             updatedReport.validated = false; // Still false, but effectively rejected
        }

        updateReport(updatedReport); // Update in the parent state and API

        // Move to next report or loop
        if (currentReportIndex < pendingReports.length - 1) {
            setCurrentReportIndex(currentReportIndex + 1);
        } else {
            setCurrentReportIndex(0); // Loop back or show "no more reports"
            alert("No more pending reports for now! Check back later.");
        }
    };

    if (pendingReports.length === 0) {
        return (
            <div className="container">
                <h2>Peer Validation</h2>
                <p>No reports pending validation at the moment. Try submitting a new report!</p>
                <Link to="/app/report"><button>Report New Flood</button></Link>
            </div>
        );
    }

    const currentReport = pendingReports[currentReportIndex];

    return (
        <div className="container">
            <h2>Peer Validation</h2>
            <h3>Validate this report:</h3>
            <div className="report-card pending">
                <img src={currentReport.imageUrl} alt="Flood scene" />
                <div>
                    <p><strong>Location:</strong> {currentReport.location}</p>
                    <p><strong>Water Level:</strong> {currentReport.waterLevel}m</p>
                    <p><strong>Description:</strong> {currentReport.description}</p>
                    <p>Votes: ↑{currentReport.upvotes} ↓{currentReport.downvotes}</p>
                </div>
            </div>
            <div>
                <button onClick={() => handleVote('upvote')}>Validate (Upvote)</button>
                <button onClick={() => handleVote('downvote')} style={{backgroundColor: '#e74c3c'}}>Reject (Downvote)</button>
            </div>
            <p style={{marginTop: '20px'}}>
                <Link to="/app/report"><button style={{backgroundColor: '#6c757d'}}>Report New Flood</button></Link>
            </p>
        </div>
    );
};

// Dashboard: Map and Charts
const Dashboard = ({ reports, sensors }) => {
    // Filter validated reports for display
    const validatedReports = reports.filter(r => r.validated);

    // Chart data for sensor
    const sensorData = {
        labels: sensors.length > 0 ? [`${new Date(sensors[0].timestamp).toLocaleTimeString()}`] : [],
        datasets: [
            {
                label: 'Water Level (m)',
                data: sensors.length > 0 ? [sensors[0].currentWaterLevel] : [],
                fill: false,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Simulated Sensor Data (Lagos Island)',
            },
        },
        scales: {
            y: {
                min: 0,
                max: 2.5,
                title: {
                    display: true,
                    text: 'Water Level (m)'
                }
            }
        }
    };

    const initialMapCenter = [6.5244, 3.3792]; // Central Lagos coordinates

    return (
        <div className="container">
            <h1>FloodDataSync Dashboard</h1>
            <h2>Real-time Flood Incidents</h2>
            <div className="map-container">
                <MapContainer center={initialMapCenter} zoom={12} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {validatedReports.map((report) => (
                        <Marker key={report.id} position={[report.latitude, report.longitude]}>
                            <Popup>
                                <strong>Location:</strong> {report.location}<br />
                                <strong>Water Level:</strong> {report.waterLevel}m<br />
                                <strong>Description:</strong> {report.description}<br />
                                <strong>Status:</strong> {report.validated ? 'Validated' : 'Pending/Rejected'}<br />
                                <img src={report.imageUrl} alt="Flood scene" style={{width: '100px', height: 'auto'}}/>
                            </Popup>
                        </Marker>
                    ))}
                     {sensors.map((sensor) => (
                        <Marker key={sensor.id} position={[sensor.latitude, sensor.longitude]}>
                            <Popup>
                                <strong>IoT Sensor:</strong> {sensor.location}<br />
                                <strong>Current Level:</strong> {sensor.currentWaterLevel}m<br />
                                <strong>Last Updated:</strong> {new Date(sensor.timestamp).toLocaleTimeString()}
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            <h2>Sensor Readings</h2>
            {sensors.length > 0 && (
                 <div className="chart-container">
                    <Line data={sensorData} options={chartOptions} />
                 </div>
            )}


            <h2>All Reports (for Demo purpose)</h2>
            {reports.length === 0 ? (
                <p>No reports submitted yet.</p>
            ) : (
                <div>
                    {reports.map((report) => (
                        <div key={report.id} className={`report-card ${report.validated ? 'validated' : 'pending'}`}>
                            <img src={report.imageUrl} alt="Flood scene" />
                            <div>
                                <h3>{report.location} ({report.waterLevel}m)</h3>
                                <p>{report.description}</p>
                                <p>Status: <strong>{report.validated ? 'Validated' : 'Pending Validation'}</strong></p>
                                <p>Votes: ↑{report.upvotes} ↓{report.downvotes}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Main App Component
const App = () => {
    const [reports, setReports] = useState([]);
    const [sensors, setSensors] = useState([]);

    // Fetch reports and sensors initially and periodically
    useEffect(() => {
        const fetchReportsAndSensors = async () => {
            try {
                const reportsRes = await axios.get(`${API_BASE_URL}/reports`);
                setReports(reportsRes.data);

                const sensorsRes = await axios.get(`${API_BASE_URL}/sensors`);
                setSensors(sensorsRes.data);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchReportsAndSensors(); // Initial fetch

        const interval = setInterval(fetchReportsAndSensors, 3000); // Fetch every 3 seconds

        return () => clearInterval(interval); // Cleanup on unmount
    }, []);

    const addReport = async (newReport) => {
        try {
            const res = await axios.post(`${API_BASE_URL}/reports`, newReport);
            setReports((prevReports) => [...prevReports, res.data]);
        } catch (error) {
            console.error('Error adding report:', error);
        }
    };

    const updateReport = async (updatedReport) => {
        try {
            const res = await axios.put(`${API_BASE_URL}/reports/${updatedReport.id}`, updatedReport);
            setReports((prevReports) =>
                prevReports.map((report) =>
                    report.id === updatedReport.id ? res.data : report
                )
            );
        } catch (error) {
            console.error('Error updating report:', error);
        }
    };

    return (
        <Router>
            <nav style={{ padding: '10px', marginBottom: '20px', backgroundColor: '#2c3e50', color: 'white', display: 'flex', justifyContent: 'center', gap: '20px' }}>
                <Link to="/app/report" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>Mobile App (Report)</Link>
                <Link to="/app/validate" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>Mobile App (Validate)</Link>
                <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>Dashboard</Link>
            </nav>

            <Routes>
                <Route path="/" element={
                    <div className="container" style={{textAlign: 'center'}}>
                        <h1>Welcome to FloodDataSync Demo</h1>
                        <p>Select a view to begin:</p>
                        <Link to="/app/report"><button>Go to Mobile App (Report)</button></Link>
                        <Link to="/dashboard"><button>Go to Dashboard</button></Link>
                    </div>
                } />
                <Route path="/app/report" element={<ReportFlood addReport={addReport} />} />
                <Route path="/app/validate" element={<PeerValidation reports={reports} updateReport={updateReport} />} />
                <Route path="/dashboard" element={<Dashboard reports={reports} sensors={sensors} />} />
            </Routes>
        </Router>
    );
};

export default App;