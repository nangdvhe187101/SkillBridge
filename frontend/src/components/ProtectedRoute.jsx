import { Navigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

function ProtectedRoute({ children }) {
    const { state } = useStore();
    if (!state.currentUser) {
        return <Navigate to="/auth" replace />;
    }
    return children;
}

export default ProtectedRoute;