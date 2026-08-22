import { Navigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

function ProtectedRoute({ children }) {
    const { state } = useStore();

    // Đang chờ refresh token khi app khởi động → không redirect vội
    if (state.isInitializing) {
        return null; // hoặc <LoadingSpinner /> nếu muốn hiển thị loading
    }

    if (!state.currentUser) {
        return <Navigate to="/auth" replace />;
    }

    return children;
}

export default ProtectedRoute;