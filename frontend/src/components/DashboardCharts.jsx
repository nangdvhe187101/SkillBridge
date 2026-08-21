// Nhẹ, không phụ thuộc thư viện ngoài — vẽ biểu đồ bằng SVG thuần để khớp design system hiện có.

const PALETTE = ['#6C4CFF', '#CBFF4D', '#57C7FF', '#FF5C7A', '#A9A4CC', '#4B2FD1'];

export function DonutChart({ data, size = 150, thickness = 22 }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    const r = (size - thickness) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;

    let offsetAcc = 0;
    const arcs = total === 0 ? [] : data.filter((d) => d.value > 0).map((d, i) => {
        const frac = d.value / total;
        const dash = frac * circumference;
        const arc = {
            color: d.color || PALETTE[i % PALETTE.length],
            dash,
            gap: circumference - dash,
            offset: -offsetAcc,
            label: d.label,
            value: d.value,
        };
        offsetAcc += dash;
        return arc;
    });

    return (
        <div className="chart-donut-wrap">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="chart-donut-svg">
                {total === 0 && (
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={thickness} />
                )}
                {arcs.map((a, i) => (
                    <circle
                        key={i}
                        cx={cx} cy={cy} r={r}
                        fill="none"
                        stroke={a.color}
                        strokeWidth={thickness}
                        strokeDasharray={`${a.dash} ${a.gap}`}
                        strokeDashoffset={a.offset}
                        transform={`rotate(-90 ${cx} ${cy})`}
                        strokeLinecap="butt"
                    />
                ))}
                <text x={cx} y={cy - 4} textAnchor="middle" className="chart-donut-total">{total}</text>
                <text x={cx} y={cy + 14} textAnchor="middle" className="chart-donut-total-label">tin đăng</text>
            </svg>
            <div className="chart-legend">
                {data.map((d, i) => (
                    <div className="chart-legend-row" key={d.label}>
                        <span className="chart-legend-dot" style={{ background: d.color || PALETTE[i % PALETTE.length] }} />
                        <span className="chart-legend-label">{d.label}</span>
                        <span className="chart-legend-value">{d.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function BarChart({ data, valueSuffix = '' }) {
    const max = Math.max(1, ...data.map((d) => d.value));
    return (
        <div className="chart-bars">
            {data.length === 0 && <div className="empty-state">Chưa có dữ liệu</div>}
            {data.map((d, i) => (
                <div className="chart-bar-row" key={i}>
                    <span className="chart-bar-label" title={d.label}>{d.label}</span>
                    <div className="chart-bar-track">
                        <div
                            className="chart-bar-fill"
                            style={{ width: `${(d.value / max) * 100}%`, background: d.color || PALETTE[i % PALETTE.length] }}
                        />
                    </div>
                    <span className="chart-bar-value">{d.value}{valueSuffix}</span>
                </div>
            ))}
        </div>
    );
}