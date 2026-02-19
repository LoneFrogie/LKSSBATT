import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  getDocs,
  orderBy,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import firebaseConfig, { ADMIN_EMAILS } from './firebase';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Helper: Get today's date string
const getTodayDate = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// Helper: Format time
const formatTime = (timestamp) => {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
};

// Helper: Get location info
const getLocationInfo = async (position) => {
  const { latitude, longitude } = position.coords;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`
    );
    const data = await response.json();
    const address = data.address || {};
    const city = address.city || address.town || address.village || address.county || 'Unknown';
    const area = address.suburb || address.neighbourhood || address.hamlet || '';
    return { lat: latitude, lng: longitude, city, area };
  } catch (error) {
    console.error('Geocoding error:', error);
    return { lat: latitude, lng: longitude, city: 'Unknown', area: '' };
  }
};

// Helper: Get current location
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
};

// Component: Login
function Login({ onLogin }) {
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const isAdmin = ADMIN_EMAILS.includes(user.email);
      
      if (!userDoc.exists()) {
        // Create user document
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL,
          role: isAdmin ? 'admin' : 'staff',
          createdAt: serverTimestamp()
        });
      }
      
      onLogin({ ...user, role: isAdmin ? 'admin' : 'staff' });
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>StaffClock</h1>
        <p>Time & Location Tracker</p>
        <button className="google-btn" onClick={handleLogin}>
          <img src="https://www.google.com/favicon.ico" alt="Google" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

// Component: Staff Dashboard
function StaffDashboard({ user }) {
  const [todayRecord, setTodayRecord] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const today = getTodayDate();
      
      // Get today's record - simple query
      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', user.uid),
        where('date', '==', today)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setTodayRecord({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setTodayRecord(null);
      }

      // Get all recent records - will filter in JS
      const recentQ = query(
        collection(db, 'attendance'),
        where('userId', '==', user.uid)
      );
      const recentSnapshot = await getDocs(recentQ);
      let records = recentSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sort in JavaScript
      records.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        const aTime = a.timeIn?.toDate?.()?.getTime() || 0;
        const bTime = b.timeIn?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
      
      setRecentRecords(records);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleClock = async (type) => {
    setClocking(true);
    try {
      const position = await getCurrentLocation();
      const locationInfo = await getLocationInfo(position);
      setLocation(locationInfo);
      
      const now = new Date();
      const today = getTodayDate();
      
      if (type === 'clockIn') {
        // Create new attendance record
        const newRecord = {
          userId: user.uid,
          email: user.email,
          name: user.displayName,
          date: today,
          timeIn: now,
          timeOut: null,
          locationIn: locationInfo,
          locationOut: null,
          createdAt: serverTimestamp()
        };
        
        const docRef = doc(collection(db, 'attendance'));
        await setDoc(docRef, newRecord);
        setTodayRecord({ id: docRef.id, ...newRecord });
      } else {
        // Update existing record
        await updateDoc(doc(db, 'attendance', todayRecord.id), {
          timeOut: now,
          locationOut: locationInfo
        });
        
        setTodayRecord(prev => ({
          ...prev,
          timeOut: now,
          locationOut: locationInfo
        }));
      }
      
      await loadData();
    } catch (error) {
      console.error('Clock error:', error);
      alert('Failed to record. Please enable location access.');
    }
    setClocking(false);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const isClockedIn = todayRecord && !todayRecord.timeOut;

  return (
    <div className="container">
      <div className="card">
        <h2>Current Status</h2>
        {todayRecord ? (
          isClockedIn ? (
            <>
              <p className="status-text">🟢 Clocked In</p>
              <p className="status-text">In: {formatTime(todayRecord.timeIn)}</p>
              {todayRecord.locationIn && (
                <p className="location-info">
                  📍 {todayRecord.locationIn.city} {todayRecord.locationIn.area && ` - ${todayRecord.locationIn.area}`}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="status-text">🔴 Completed for Today</p>
              <p>In: {formatTime(todayRecord.timeIn)} | Out: {formatTime(todayRecord.timeOut)}</p>
            </>
          )
        ) : (
          <p className="status-text">Not clocked in yet</p>
        )}
      </div>

      <div className="card">
        {!isClockedIn && !todayRecord ? (
          <button 
            className="clock-btn clock-in" 
            onClick={() => handleClock('clockIn')}
            disabled={clocking}
          >
            {clocking ? 'Getting Location...' : '🟢 Clock In'}
          </button>
        ) : isClockedIn ? (
          <button 
            className="clock-btn clock-out" 
            onClick={() => handleClock('clockOut')}
            disabled={clocking}
          >
            {clocking ? 'Getting Location...' : '🔴 Clock Out'}
          </button>
        ) : (
          <p className="status-text">✓ Today's attendance complete</p>
        )}
      </div>

      <div className="card">
        <h2>Recent History</h2>
        {recentRecords.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Location In</th>
                  <th>Location Out</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.slice(0, 7).map((record) => (
                  <tr key={record.id}>
                    <td>{record.date}</td>
                    <td>{formatTime(record.timeIn)}</td>
                    <td>{formatTime(record.timeOut)}</td>
                    <td>{record.locationIn?.city || '-'}</td>
                    <td>{record.locationOut?.city || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="status-text">No records yet</p>
        )}
      </div>
    </div>
  );
}

// Component: Admin Panel
function AdminPanel({ user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    // Set default date range to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadRecords();
    }
  }, [startDate, endDate]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      // Simplified query - get all records in date range without composite index
      const q = query(
        collection(db, 'attendance'),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      
      const snapshot = await getDocs(q);
      let records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sort in JavaScript instead of Firestore
      records.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        const aTime = a.timeIn?.toDate?.()?.getTime() || 0;
        const bTime = b.timeIn?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
      
      setRecords(records);
    } catch (error) {
      console.error('Error loading records:', error);
      alert('Error loading records: ' + error.message);
    }
    setLoading(false);
  };

  const exportToExcel = () => {
    const data = records.map(record => ({
      'Name': record.name,
      'Email': record.email,
      'Date': record.date,
      'Time In': record.timeIn ? formatTime(record.timeIn) : '-',
      'Time Out': record.timeOut ? formatTime(record.timeOut) : '-',
      'Location In': record.locationIn ? 
        `${record.locationIn.city}${record.locationIn.area ? `, ${record.locationIn.area}` : ''}` : '-',
      'Location Out': record.locationOut ? 
        `${record.locationOut.city}${record.locationOut.area ? `, ${record.locationOut.area}` : ''}` : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // Name
      { wch: 30 }, // Email
      { wch: 12 }, // Date
      { wch: 10 }, // Time In
      { wch: 10 }, // Time Out
      { wch: 25 }, // Location In
      { wch: 25 }, // Location Out
    ];

    XLSX.writeFile(wb, `attendance_${startDate}_to_${endDate}.xlsx`);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Admin Controls</h2>
        <div className="admin-controls">
          <input
            type="date"
            className="date-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span>to</span>
          <input
            type="date"
            className="date-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button className="export-btn" onClick={exportToExcel}>
            📊 Export to Excel
          </button>
        </div>
        <p>{records.length} records found</p>
      </div>

      <div className="card">
        <h2>All Attendance Records</h2>
        {records.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Date</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Location In</th>
                  <th>Location Out</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.name}</td>
                    <td>{record.email}</td>
                    <td>{record.date}</td>
                    <td>{formatTime(record.timeIn)}</td>
                    <td>{formatTime(record.timeOut)}</td>
                    <td>
                      {record.locationIn?.city || '-'}
                      {record.locationIn?.area && `, ${record.locationIn.area}`}
                    </td>
                    <td>
                      {record.locationOut?.city || '-'}
                      {record.locationOut?.area && `, ${record.locationOut.area}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="status-text">No records found</p>
        )}
      </div>
    </div>
  );
}

// Main App
function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const isAdmin = ADMIN_EMAILS.includes(firebaseUser.email);
        
        setUser({ 
          ...firebaseUser, 
          role: userDoc.exists() ? userDoc.data().role : (isAdmin ? 'admin' : 'staff')
        });
      } else {
        setUser(null);
      }
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  if (initializing) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const isAdmin = user.role === 'admin';

  return (
    <>
      <header className="header">
        <h1>StaffClock</h1>
        <div className="header-user">
          {user.photoURL && <img src={user.photoURL} alt={user.displayName} />}
          <span>{user.displayName}</span>
          {isAdmin && <span className="badge badge-admin">Admin</span>}
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      
      {isAdmin ? <AdminPanel user={user} /> : <StaffDashboard user={user} />}
    </>
  );
}

export default App;
