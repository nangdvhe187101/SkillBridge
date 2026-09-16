import { Navigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

function ProtectedRoute({ children }) {
    const { state } = useStore();

    // Đang chờ xác thực phiên (refresh token) khi app khởi động
    if (state.isInitializing) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                gap: 16
            }}>
                <div className="verify-spin" style={{ width: 44, height: 44, margin: 0 }} />
                <div style={{ fontSize: 14, color: 'var(--ink-subtle, #888)' }}>Đang kiểm tra phiên đăng nhập...</div>
            </div>
        );
    }

    if (!state.currentUser) {
        return <Navigate to="/auth" replace />;
    }

    return children;
}

export default ProtectedRoute;