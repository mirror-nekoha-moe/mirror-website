import React, { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

export default function ApiCallChart({ data }) {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!data) return;

        // Build a unified sorted label set from both v1 and v2 minutes
        const allMinutes = Array.from(new Set([
            ...data.v1.map(d => d.minute),
            ...data.v2.map(d => d.minute),
        ])).sort();

        const v1Map = Object.fromEntries(data.v1.map(d => [d.minute, Number(d.calls)]));
        const v2Map = Object.fromEntries(data.v2.map(d => [d.minute, Number(d.calls)]));

        const labels = allMinutes.map(m => {
            const d = new Date(m);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        });
        const v1Values = allMinutes.map(m => v1Map[m] ?? 0);
        const v2Values = allMinutes.map(m => v2Map[m] ?? 0);

        if (chartInstanceRef.current) {
            chartInstanceRef.current.data.labels = labels;
            chartInstanceRef.current.data.datasets[0].data = v1Values;
            chartInstanceRef.current.data.datasets[1].data = v2Values;
            chartInstanceRef.current.update();
            return;
        }

        const ctx = chartRef.current.getContext('2d');
        chartInstanceRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'API v1',
                        data: v1Values,
                        borderColor: '#c084fc',
                        backgroundColor: 'rgba(192, 132, 252, 0.2)',
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y',
                    },
                    {
                        label: 'API v2',
                        data: v2Values,
                        borderColor: '#ff7f7f',
                        backgroundColor: 'rgba(255, 112, 112, 0.2)',
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: '#eee' },
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (ctx) => {
                                const perMin = ctx.parsed.y;
                                return `${ctx.dataset.label}: ${perMin} calls/min`;
                            },
                        },
                    },
                },
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#aaa',
                            callback: v => `${v}/min`,
                        },
                        grid: { color: '#222' },
                        title: { display: true, text: 'calls/min', color: '#aaa' },
                    },
                    x: {
                        ticks: {
                            color: '#eee',
                            maxTicksLimit: 12,
                            maxRotation: 0,
                        },
                        grid: { color: '#222' },
                    },
                },
            },
        });
    }, [data]);

    return (
        <div class="api-call-stats-chart-container">
            <canvas ref={chartRef} />
        </div>
    );
}
