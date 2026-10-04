import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

function ProtectedRoute({ children, allowedRoles }) {
    const { state, showToast } = useStore();
    const location = useLocation();

    const currentRole = (state.currentUser?.roleCode || state.role || '').toLowerCase();
    const isAllowed = !allowedRoles || !Array.isArray(allowedRoles) || allowedRoles.length === 0 ||
        allowedRoles.some((r) => r.toLowerCase() === currentRole);

    useEffect(() => {
        if (!state.isInitializing && state.currentUser && !isAllowed) {
            if (typeof showToast === 'function') {
                showToast('Trang này không khả dụng cho tài khoản của bạn.', 'warning');
            }
        }
    }, [state.isInitializing, state.currentUser, isAllowed, showToast]);

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

    // 3. Kiểm tra vai trò được phép (Role-Based Authorization) -> Tự động chuyển hướng thông minh
    if (!isAllowed) {
        const isEmployer = ['employer', 'recruiter', 'business', 'admin'].includes(currentRole);
        const targetPath = isEmployer ? '/employer/dashboard' : '/jobs';
        return <Navigate to={targetPath} replace />;
    }

    return children;
}

export default ProtectedRoute;