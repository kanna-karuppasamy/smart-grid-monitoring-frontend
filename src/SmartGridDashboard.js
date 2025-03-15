import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Zap, Building, Map } from 'lucide-react';

// Import the styling directly in the component
const tailwindStyles = `
  @import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');
`;

const Dashboard = () => {
  const [energyByRegion, setEnergyByRegion] = useState([]);
  const [faultyMeters, setFaultyMeters] = useState(0);
  const [energyByBuildingType, setEnergyByBuildingType] = useState([]);
  const [peakLoadMeters, setPeakLoadMeters] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    // Websocket connection
    const socket = new WebSocket('ws://localhost:8080/ws');
    
    socket.onopen = () => {
      setConnectionStatus('Connected');
      console.log('WebSocket connected');
    };
    
    socket.onclose = () => {
      setConnectionStatus('Disconnected');
      console.log('WebSocket disconnected');
    };
    
    socket.onerror = (error) => {
      setConnectionStatus('Error connecting');
      console.error('WebSocket error:', error);
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastUpdate(new Date().toLocaleTimeString());
        console.log('Received message:', message.type);
        
        switch(message.type) {
          case 'energyByRegion':
            // Safely handle data
            if (Array.isArray(message.data)) {
              const regionData = message.data.map(item => ({
                name: item.region || 'Unknown',
                value: Math.round((item._value || 0) / 1000), // Convert to MWh for better display
              }));
              setEnergyByRegion(regionData);
            }
            break;
            
          case 'faultyMeters':
            if (Array.isArray(message.data) && message.data.length > 0) {
              setFaultyMeters(message.data[0]?._value || 0);
            }
            break;
            
          case 'energyByBuildingType':
            if (Array.isArray(message.data)) {
              const buildingData = message.data.map(item => ({
                name: (item.building_type || 'Unknown').charAt(0).toUpperCase() + (item.building_type || 'Unknown').slice(1),
                value: parseFloat((item._value || 0).toFixed(2))
              }));
              setEnergyByBuildingType(buildingData);
            }
            break;
            
          case 'peakLoadMeters':
            if (Array.isArray(message.data)) {
              // Group by region
              const peakByRegion = message.data.reduce((acc, item) => {
                const region = item.region || 'Unknown';
                if (!acc[region]) {
                  acc[region] = 0;
                }
                acc[region]++;
                return acc;
              }, {});
              
              // Convert to array for chart
              const peakData = Object.keys(peakByRegion).map(region => ({
                name: region,
                value: peakByRegion[region]
              }));
              
              setPeakLoadMeters(peakData);
            }
            break;
            
          default:
            console.log('Unknown message type:', message.type);
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    return () => {
      socket.close();
    };
  }, []);

  // Colors for the charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  
  // Format number with commas
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Add the Tailwind CSS styles */}
      <style>{tailwindStyles}</style>
      
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Smart Grid Monitoring Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm ${connectionStatus === 'Connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {connectionStatus}
            </span>
            {lastUpdate && (
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdate}
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Faulty Meters Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-10 w-10 text-red-500 mr-3" />
              <div>
                <h2 className="text-lg font-semibold text-gray-700">Faulty Meters</h2>
                <p className="text-3xl font-bold text-red-500">{formatNumber(faultyMeters)}</p>
              </div>
            </div>
          </div>
          
          {/* Peak Load Meters Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Zap className="h-10 w-10 text-yellow-500 mr-3" />
              <div>
                <h2 className="text-lg font-semibold text-gray-700">Peak Load Meters</h2>
                <p className="text-3xl font-bold text-yellow-500">{peakLoadMeters.reduce((sum, item) => sum + item.value, 0)}</p>
              </div>
            </div>
            {peakLoadMeters.length > 0 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={peakLoadMeters}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {peakLoadMeters.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          
          {/* Energy by Region Chart */}
          <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
            <div className="flex items-center mb-4">
              <Map className="h-10 w-10 text-blue-500 mr-3" />
              <h2 className="text-lg font-semibold text-gray-700">Energy Consumption by Region (MWh)</h2>
            </div>
            <div className="h-64">
              {energyByRegion.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={energyByRegion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${formatNumber(value)} MWh`, 'Consumption']} />
                    <Legend />
                    <Bar dataKey="value" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>
          
          {/* Energy by Building Type Chart */}
          <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
            <div className="flex items-center mb-4">
              <Building className="h-10 w-10 text-green-500 mr-3" />
              <h2 className="text-lg font-semibold text-gray-700">Average Energy Consumption by Building Type (kWh)</h2>
            </div>
            <div className="h-64">
              {energyByBuildingType.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={energyByBuildingType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} kWh`, 'Avg. Consumption']} />
                    <Legend />
                    <Bar dataKey="value" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;