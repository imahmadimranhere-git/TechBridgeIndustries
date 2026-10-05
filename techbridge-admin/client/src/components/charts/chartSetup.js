import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';

// Chart.js only bundles what is registered, which keeps the app small
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

ChartJS.defaults.font.family = '"Inter Variable", ui-sans-serif, system-ui, "Segoe UI", Arial, sans-serif';
ChartJS.defaults.color = '#6b7280';