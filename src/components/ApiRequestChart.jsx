import React, { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

export default function ApiRequestChart({ data }) {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!data || data.length === 0) return;

        const labels = data.map(d => d.day);
        const requests = data.map(d => Number(d.requests));

        if (chartInstanceRef.current) {
            chartInstanceRef.current.data.labels = labels;
            chartInstanceRef.current.data.datasets[0].data = requests;
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
                        label: 'API Requests',
                        data: requests,
                        borderColor: '#00CEFF',
                        backgroundColor: 'rgba(0, 206, 255, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: true,
                        tension: 0.3,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: '#eee' }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (ctx) => `API Requests: ${ctx.parsed.y.toLocaleString()}`
                        }
                    }
                },
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#00CEFF' },
                        grid: { color: '#222' },
                        title: { display: true, text: 'Requests', color: '#00CEFF' }
                    },
                    x: {
                        ticks: { color: '#eee' },
                        grid: { color: '#222' }
                    }
                }
            }
        });
    }, [data]);
    return (
        <div class="api-request-chart-container">
            <canvas ref={chartRef} />
        </div>
    );
}