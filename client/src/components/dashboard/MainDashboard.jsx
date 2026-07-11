
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import CRDashboard from './CRDashboard';
import AdminDashboard from './AdminDashboard';

const MainDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  return <CRDashboard navigate={navigate} />;
};

export default MainDashboard;
