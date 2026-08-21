import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

export const DASHBOARD_TABS = [
    { id: 'overview', label: 'Tổng quan', icon: '📊' },
    { id: 'jobs', label: 'Tin đã đăng', icon: '📋' },
    { id: 'post', label: 'Đăng tin mới', icon: '✍️' },
    { id: 'ads', label: 'Quảng cáo Affiliate', icon: '📢' },
];

export default function DashboardSidebar({ activeTab, onTabClick }) {
    const navigate = useNavigate();
    const { state } = useStore();

    const openCount = state.myJobs?.filter((j) => j.status === 'open').length || 0;
    const submittedCount = state.myJobs?.filter((j) => j.status === 'submitted').length || 0;

    const handleClick = (id) => {
        if (onTabClick) onTabClick(id);
        else navigate(`/dashboard?tab=${id}`);
    };

    return (
        <div className="acct-sidebar">
            <div className="acct-sidebar-head">
                <h2>Dashboard NTD</h2>
                <span className="chip chip-lime" style={{ fontSize: 11, padding: '2px 8px' }}>Nhà tuyển dụng</span>
            </div>
            <div className="acct-tablist">
                {DASHBOARD_TABS.map((t) => {
                    let badge = null;
                    if (t.id === 'overview' && submittedCount > 0) {
                        badge = <span className="chip chip-coral" style={{ marginLeft: 'auto', fontSize: 11, padding: '1px 6px' }}>{submittedCount} chờ duyệt</span>;
                    } else if (t.id === 'jobs') {
                        badge = <span className="chip" style={{ marginLeft: 'auto', fontSize: 11, padding: '1px 6px' }}>{state.myJobs.length}</span>;
                    }
                    return (
                        <button
                            key={t.id}
                            className={'acct-tab' + (activeTab === t.id ? ' is-active' : '')}
                            onClick={() => handleClick(t.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            <span>{t.icon}</span>
                            <span>{t.label}</span>
                            {badge}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}