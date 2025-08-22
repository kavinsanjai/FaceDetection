import React, { useState } from 'react';
import { IoMailSharp } from "react-icons/io5";
import { RiLockPasswordFill } from "react-icons/ri";
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CustomStyles.css';

// Component to demonstrate props usage
const FormField = ({ 
  type, 
  placeholder, 
  value, 
  onChange, 
  icon: Icon, 
  required = false 
}) => (
  <div className="mb-3 position-relative">
    <input
      type={type}
      className="form-control"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
    />
    {Icon && (
      <Icon className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted" />
    )}
  </div>
);

// Component to demonstrate list rendering
const RecentLogins = ({ logins, showHistory }) => (
  showHistory && (
    <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
      <p>Recent Login Attempts:</p>
      <ul style={{ listStyle: 'none', padding: '0', maxHeight: '100px', overflowY: 'auto' }}>
        {logins.map((login, index) => (
          <li 
            key={`${login.timestamp}-${index}`}
            style={{
              padding: '4px 0',
              borderBottom: index < logins.length - 1 ? '1px solid #eee' : 'none'
            }}
          >
            {login.time} - {login.status}
          </li>
        ))}
      </ul>
    </div>
  )
);

const Login = ({ 
  onLoginSuccess = () => {}, 
  showLoginHistory = false 
}) => {
    const [empid, setEmpid] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [loginAttempts, setLoginAttempts] = useState([]);
    const [showAdvanced, setShowAdvanced] = useState(showLoginHistory);
    const navigate = useNavigate();
    
    // Sample validation rules for demonstration
    const validationRules = [
        { field: 'empid', rule: 'required', message: 'Employee ID is required' },
        { field: 'empid', rule: 'minLength', value: 3, message: 'ID must be at least 3 characters' },
        { field: 'password', rule: 'required', message: 'Password is required' },
        { field: 'password', rule: 'minLength', value: 6, message: 'Password must be at least 6 characters' }
    ];

    const addLoginAttempt = (status) => {
        const newAttempt = {
            time: new Date().toLocaleTimeString(),
            status: status,
            timestamp: Date.now()
        };
        setLoginAttempts(prev => [newAttempt, ...prev.slice(0, 4)]); // Keep last 5 attempts
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        // Add login attempt
        addLoginAttempt('Attempting login...');
        
        axios.post('http://localhost:3001/login', { empid, password })   
        .then(result => {
                const { status, email, username, mobileNo } = result.data;                        
                if (status === "success") {
                    addLoginAttempt('Login successful');
                    localStorage.setItem('email', email);
                    localStorage.setItem('username', username || '');
                    localStorage.setItem('mobileNo', mobileNo);
                    onLoginSuccess(); // Call prop function
                    if (password === "1234567K") {
                        navigate('/ChangePassword');
                    } else {
                        navigate('/New1');
                    }
                } else {
                    addLoginAttempt('Login failed - Invalid credentials');
                    setError('Invalid email or password');
                }
            })
            .catch(err => {
                console.error("Login error:", err);
                addLoginAttempt('Login failed - Network error');
                setError('An error occurred. Please try again.');
            })
            .finally(() => setLoading(false));
    };
    return (
        <div className="container d-flex justify-content-center align-items-center vh-100 position-relative">
            {/* Admin Button at Top Right */}
            <button 
                className="btn btn-secondary position-absolute top-0 end-0 mt-3 me-3"
                onClick={() => navigate('/admin')}
            >
                Admin
            </button>

            <div className="card shadow-lg p-4" style={{ maxWidth: '400px', width: '100%' ,background: '#F8F9FA'}}>
                <h1 className="text-center mb-4">Login</h1>
                
                {/* Conditional rendering with logical AND */}
                {error && <p className="text-danger text-center">{error}</p>}
                
                <form onSubmit={handleSubmit}>
                    {/* Using custom FormField component with props */}
                    <FormField
                        type="text"
                        placeholder="User Id"
                        value={empid}
                        onChange={(e) => setEmpid(e.target.value)}
                        icon={IoMailSharp}
                        required={true}
                    />
                    <FormField
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        icon={RiLockPasswordFill}
                        required={true}
                    />
                    
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="rememberMe"
                            />
                            <label className="form-check-label" htmlFor="rememberMe">Remember me</label>
                        </div>
                        <Link to="/forget" className="text-decoration-none">Forgot Password?</Link>
                    </div>
                    
                    {/* Additional conditional rendering */}
                    {empid.length > 0 && password.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#28a745', marginBottom: '10px' }}>
                            ✓ Form fields completed
                        </div>
                    )}
                    
                    <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                        {/* Ternary conditional rendering */}
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                
                <div className="text-center mt-3">
                    <p>
                        Don't have an account? <Link to="/signup" className="text-decoration-none fw-bold">Signup</Link>
                    </p>
                </div>
                
                {/* Toggle for advanced options */}
                <div className="text-center mt-2">
                    <button 
                        type="button"
                        className="btn btn-link btn-sm"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        style={{ textDecoration: 'none' }}
                    >
                        {showAdvanced ? 'Hide' : 'Show'} Login History
                    </button>
                </div>
                
                {/* List rendering component with conditional display */}
                <RecentLogins 
                    logins={loginAttempts} 
                    showHistory={showAdvanced} 
                />
                
                {/* Additional inline CSS styling demonstration */}
                {validationRules.length > 0 && showAdvanced && (
                    <div style={{
                        marginTop: '10px',
                        padding: '8px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '4px',
                        fontSize: '11px'
                    }}>
                        <strong>Validation Rules:</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: '15px' }}>
                            {validationRules.map((rule, index) => (
                                <li key={`${rule.field}-${rule.rule}-${index}`}>
                                    {rule.message}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;
