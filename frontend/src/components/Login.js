import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function Login() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('success') === 'true') {
      navigate('/');
    }
  }, [location, navigate]);

  const handleLogin = () => {
    window.location.href = 'http://localhost:5000/auth/discord';
  };

  return (
    <div>
      <h2>Login</h2>
      <button onClick={handleLogin}>Login with Discord</button>
    </div>
  );
}

export default Login;
