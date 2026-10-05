import './chartSetup.js';
import { Doughnut } from 'react-chartjs-2';
import { PieChart } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useChartColors } from '../../hooks/useChartColors.js';
import { percentOf } from '../../utils/formatMoney.js';
import EmptyState from '../ui/EmptyState.jsx';

/** Money received, split into staff commission and our share (data in paisa) */
export default function ShareDoughnut({ staffCommission = 0, ourShare = 0 }) {
  const colors = useChartColors();
  const { formatMoney } = useSettings();
  const total = staffCommission + ourShare;

  if (total <= 0) {
    return <EmptyState compact icon={PieChart} title="Nothing received yet" description="The split appears once payments are recorded." />;
  }

  const slices = [
    { label: 'Staff commission', value: staffCommission, color: colors.warning },
    { label: 'Our share', value: ourShare, color: colors.success },
  ];

  const chartData = {
    labels: slices.map((slice) => slice.label),
    datasets: [{ data: slices.map((slice) => slice.value), backgroundColor: slices.map((slice) => slice.color), borderWidth: 0 }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (context) => `${context.label}: ${formatMoney(context.parsed)}` } },
    },
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-48 w-48" role="img" aria-label="Doughnut chart of staff commission versus our share">
        <Doughnut data={chartData} options={options} />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500">Received</span>
          <span className="text-base font-semibold text-gray-900 tabular-nums">{formatMoney(total, { decimals: 'never' })}</span>
        </div>
      </div>

      <ul className="w-full space-y-2">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-gray-600">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: slice.color }} aria-hidden="true" />
              {slice.label}
            </span>
            <span className="font-medium text-gray-900 tabular-nums">
              {formatMoney(slice.value)} <span className="text-gray-400">({percentOf(slice.value, total)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}