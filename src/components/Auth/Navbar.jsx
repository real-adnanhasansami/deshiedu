import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const { currentUser, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        Deshi<span className="highlight">Edu</span>
      </Link>
      <div className="nav-items">
        <ThemeToggle />
        {currentUser && <Link to="/my-space">My Space</Link>}
        {isAdmin && (
          <Link to="/admin" className="admin-nav-link">
            Admin
          </Link>
        )}
        {currentUser ? (
          <>
            <span className="nav-user">{currentUser.displayName || currentUser.email}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Log Out
            </button>
          </>
        ) : (
          <Link to="/login">Sign In</Link>
        )}
      </div>
    </nav>
  );
}
