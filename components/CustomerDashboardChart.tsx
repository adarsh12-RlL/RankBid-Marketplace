export interface CustomerDailyMetric {
  date: string;
  spendCents: number;
  clicks: number;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function TrendChart({ title, dates, values, color, formatValue }: { title: string; dates: string[]; values: number[]; color: "blue" | "orange"; formatValue: (value: number) => string }) {
  const width = 720, height = 190, left = 42, right = 704, top = 16, bottom = 137;
  const max = Math.max(1, ...values);
  const points = values.map((value, index) => ({
    x: left + (values.length <= 1 ? 0 : (right - left) * index / (values.length - 1)),
    y: bottom - (bottom - top) * value / max,
    value,
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const area = `${line} L${right},${bottom} L${left},${bottom} Z`;
  const labelIndexes = [...new Set([0, Math.floor((values.length - 1) / 3), Math.floor((values.length - 1) * 2 / 3), values.length - 1])];
  const peak = Math.max(0, ...values);

  return (
    <section className={`customer-trend customer-trend-${color}`} aria-label={`${title} over the last 14 days`}>
      <div className="customer-trend-head">
        <div><h3>{title}</h3><p>Daily · last 14 days (UTC)</p></div>
        <strong>{formatValue(peak)} <span>peak</span></strong>
      </div>
      <svg className="customer-trend-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} daily trend chart`}>
        {[0, 1, 2, 3].map((step) => {
          const y = top + (bottom - top) * step / 3;
          const label = peak ? formatValue(peak * (1 - step / 3)) : formatValue(0);
          return <g key={step}><line x1={left} x2={right} y1={y} y2={y} className="customer-trend-grid"/><text x={left - 8} y={y + 4} textAnchor="end" className="customer-trend-axis">{label}</text></g>;
        })}
        {peak > 0 && <path d={area} className="customer-trend-area" />}
        <path d={line} className="customer-trend-line" />
        {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={points.length > 10 && index % 2 ? 0 : 3.2} className="customer-trend-point"><title>{formatDate(dates[index])}: {formatValue(point.value)}</title></circle>)}
        {labelIndexes.map((index) => <text key={index} x={points[index]?.x ?? left} y={height - 16} textAnchor={index === 0 ? "start" : index === values.length - 1 ? "end" : "middle"} className="customer-trend-axis">{formatDate(dates[index])}</text>)}
      </svg>
      {!peak && <p className="customer-trend-empty">No {title.toLowerCase()} recorded in this period yet.</p>}
    </section>
  );
}

export default function CustomerDashboardChart({ metrics }: { metrics: CustomerDailyMetric[] }) {
  const spend = metrics.map((metric) => metric.spendCents / 100);
  const clicks = metrics.map((metric) => metric.clicks);
  const dates = metrics.map((metric) => metric.date);
  return (
    <div className="customer-trends-grid">
      <TrendChart title="Verified spend" dates={dates} values={spend} color="orange" formatValue={(value) => `$${value.toFixed(2)}`} />
      <TrendChart title="Product clicks" dates={dates} values={clicks} color="blue" formatValue={(value) => Math.round(value).toLocaleString()} />
    </div>
  );
}
