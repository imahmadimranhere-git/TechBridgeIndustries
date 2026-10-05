import './chartSetup.js';
import { Bar } from 'react-chartjs-2';
import { BarChart3 } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useChartColors } from '../../hooks/useChartColors.js';
import { formatCompactMoney } from '../../utils/formatMoney.js';
import EmptyState from '../ui/EmptyState.jsx';

/** Monthly bars: Received, Commission to staff, Net profit (data in paisa) */
export default function MonthlyBarChart({ data = [] }) {
  const colors = useChartColors();
  const { branding, formatMoney } = useSettings();

  const hasData = data.some((month) => month.received || month.commissionEarned || month.netProfit);
  if (!hasData) {
    return <EmptyState compact icon={BarChart3} title="No payments in this period" description="Payments you record will appear here month by month." />;
  }

  const dataset = (label, key, color) => ({
    label,
    data: data.map((month) => month[key] ?? 0),
    backgroundColor: color,
    borderRadius: 6,
    maxBarThickness: 26,
  });

  const chartData = {
    labels: data.map((month) => month.label),
    datasets: [
      dataset('Received', 'received', colors.info),
      dataset('Commission to staff', 'commissionEarned', colors.warning),
      dataset('Net profit', 'netProfit', colors.purple),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 16 } },
      tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${formatMoney(context.parsed.y)}` } },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        grid: { color: colors.grid },
        ticks: { callback: (value) => formatCompactMoney(value, branding.currencySymbol) },
      },
    },
  };

  return (
    <div className="h-72" role="img" aria-label="Bar chart of received, commission and net profit by month">
      <Bar data={chartData} options={options} />
    </div>
  );
}