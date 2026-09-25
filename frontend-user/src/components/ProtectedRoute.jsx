import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import Forbidden from '../pages/customer/Forbidden';

function ProtectedRoute({ children, allowedRoles }) {
    const { state } = useStore();
    const location = useLocation();

    // 1. Đang chờ xác thực phiên (refresh token) khi app khởi động
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

    // 2. Chưa đăng nhập -> Chuyển hướng sang trang đăng nhập, lưu lại path trước đó
    if (!state.currentUser) {
        return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
    }

    // 3. Kiểm tra vai trò được phép (Role-Based Authorization)
    if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
        const currentRole = (state.currentUser?.roleCode || state.role || '').toLowerCase();
        const isAllowed = allowedRoles.some((r) => r.toLowerCase() === currentRole);

        if (!isAllowed) {
            return (
                <Forbidden
                    requiredRoles={allowedRoles}
                    currentRole={currentRole}
                    attemptedPath={location.pathname}
                />
            );
        }
    }

    return children;
}

export default ProtectedRoute;