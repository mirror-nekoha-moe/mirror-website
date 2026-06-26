import React, { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

export default function DownloadChart({ data }) {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!data || data.length === 0) return;

        const sorted = [...data].sort((a, b) => new Date(a.day) - new Date(b.day));
        const labels = sorted.map(d => d.day.slice(0, 10));
        const downloads = sorted.map(d => Number(d.downloads));
        const bytes = sorted.map(d => (Number(d.bytes_sent) / (1024 ** 3)).toFixed(2));

        if (chartInstanceRef.current) {
            chartInstanceRef.current.data.labels = labels;
            chartInstanceRef.current.data.datasets[0].data = downloads;
            chartInstanceRef.current.data.datasets[1].data = bytes;
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
                    label: 'Downloads',
                    data: downloads,
                    borderColor: '#00CEFF',
                    backgroundColor: 'rgba(0, 206, 255, 0.1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    fill: true,
                    tension: 0.3,
                    yAxisID: 'y',
                },
                {
                    label: 'GB Sent',
                    data: bytes,
                    borderColor: '#ff7f7f',
                    backgroundColor: 'rgba(255, 127, 127, 0.1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    fill: true,
                    tension: 0.3,
                    yAxisID: 'y2',
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
                    label: (ctx) => {
                        if (ctx.datasetIndex === 1)
                        return `GB Sent: ${ctx.parsed.y} GB`;
                        return `Downloads: ${ctx.parsed.y.toLocaleString()}`;
                    }
                    }
                }
                },
                interaction: { mode: 'index', intersect: false },
                scales: {
                y: {
                    beginAtZero: true,
                    position: 'left',
                    ticks: { color: '#00CEFF' },
                    grid: { color: '#222' },
                    title: { display: true, text: 'Downloads', color: '#00CEFF' }
                },
                y2: {
                    beginAtZero: true,
                    position: 'right',
                    ticks: { color: '#ff7f7f', callback: v => `${v} GB` },
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'GB Sent', color: '#ff7f7f' }
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
        <div class="download-chart-container">
            <canvas ref={chartRef} />
        </div>
    );
}
