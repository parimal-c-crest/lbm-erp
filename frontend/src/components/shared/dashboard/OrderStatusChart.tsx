import { ORDER_STATUS } from '@/lib/mock-data/dashboard';

// Fixed categorical order/colors (dataviz skill: "assign categorical hues in fixed order, never
// cycled") — Completed/Pending/Shipped always map to chart-1/chart-2/chart-3.
const STATUS_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)'];
const RADIUS = 60;
const STROKE_WIDTH = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 4;

function computeSegments() {
  let cumulative = 0;
  return ORDER_STATUS.breakdown.map((segment, index) => {
    const segmentLength = (segment.percent / 100) * CIRCUMFERENCE;
    const dash = Math.max(segmentLength - GAP, 0);
    const dashOffset = -cumulative;
    cumulative += segmentLength;
    return { ...segment, color: STATUS_COLORS[index], dash, dashOffset };
  });
}

export function OrderStatusChart() {
  const segments = computeSegments();

  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <h2 className="text-foreground mb-4 text-sm font-semibold">Order Status</h2>

      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <svg width={160} height={160} viewBox="0 0 140 140">
            <g transform="rotate(-90 70 70)">
              {segments.map((segment) => (
                <circle
                  key={segment.status}
                  cx={70}
                  cy={70}
                  r={RADIUS}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray={`${segment.dash} ${CIRCUMFERENCE - segment.dash}`}
                  strokeDashoffset={segment.dashOffset}
                >
                  <title>
                    {segment.status}: {segment.percent}%
                  </title>
                </circle>
              ))}
            </g>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-foreground text-2xl font-bold">{ORDER_STATUS.total}</span>
            <span className="text-muted-foreground text-xs">Orders</span>
          </div>
        </div>

        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {ORDER_STATUS.breakdown.map((segment, index) => (
            <li key={segment.status} className="flex items-center gap-1.5 text-sm">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[index] }}
                aria-hidden="true"
              />
              <span className="text-foreground">{segment.status}</span>
              <span className="text-muted-foreground">{segment.percent}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
