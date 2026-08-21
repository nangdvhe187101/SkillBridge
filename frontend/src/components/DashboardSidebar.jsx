import { useNavigate } from 'react-router-dom';

export const DASHBOARD_TABS = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'jobs', label: 'Tin đã đăng' },
    { id: 'post', label: 'Đăng tin mới' },
    { id: 'ads', label: 'Quảng cáo Affiliate' },
];

export default function DashboardSidebar({ activeTab, onTabClick }) {
    const navigate = useNavigate();

    const handleClick = (id) => {
        if (onTabClick) onTabClick(id);
        else navigate(`/dashboard?tab=${id}`);
    };

    return (
        <div className="acct-sidebar">
            <div className="acct-sidebar-head">
                <h2>Dashboard NTD</h2>
            </div>
            <div className="acct-tablist">
                {DASHBOARD_TABS.map((t) => (
                    <button
                        key={t.id}
                        className={'acct-tab' + (activeTab === t.id ? ' is-active' : '')}
                        onClick={() => handleClick(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
        </div>
    );
}