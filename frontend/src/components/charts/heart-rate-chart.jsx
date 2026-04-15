import React, { useMemo, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Title,
    Filler,
} from 'chart.js';

import { formatToLocalTime } from '../../utilities/dateUtils.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Title,
    Filler
);

const HeartRateChart = ({ heartRateData = [] }) => {
    const chartRef = useRef(null);
    const gradientRef = useRef(null);

    // Generate data from API or use mock data
    const { labels, data } = useMemo(() => {
        if (heartRateData && heartRateData.length > 0) {
            // Use real API data
            const labels = [];
            const data = [];

            // Sample data points if too many (for performance)
            const sampleRate = heartRateData.length > 200 ? Math.ceil(heartRateData.length / 200) : 1;

            heartRateData.forEach((item, index) => {
                if (index % sampleRate === 0 || index === heartRateData.length - 1) {
                    // Replaced formatTime with formatToLocalTime
                    // Standardized to 'time' property from patientService
                    labels.push(formatToLocalTime(item.time));
                    data.push(item.value);
                }
            });

            return { labels, data };
        }

        // Fallback removed to clean up mock data
        return { labels: [], data: [] };
    }, [heartRateData]);

    // Chart config with gradient fill
    const chartData = useMemo(() => {
        return {
            labels,
            datasets: [
                {
                    label: 'Heart Rate',
                    data,
                    borderColor: '#078EFD',
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;

                        if (!chartArea) {
                            return 'rgba(7, 142, 253, 0.1)';
                        }

                        // Guard against non-finite dimensions (e.g. triggered by html2canvas layout shifts)
                        const { top, bottom } = chartArea;
                        if (!isFinite(top) || !isFinite(bottom) || top === bottom) {
                            return 'rgba(7, 142, 253, 0.1)';
                        }

                        if (!gradientRef.current) {
                            gradientRef.current = ctx.createLinearGradient(0, top, 0, bottom);
                            gradientRef.current.addColorStop(0, 'rgba(7, 142, 253, 0.3)');
                            gradientRef.current.addColorStop(1, 'rgba(7, 142, 253, 0.05)');
                        }

                        return gradientRef.current;
                    },
                    pointRadius: 4,
                    pointBackgroundColor: '#E54D4D',
                    pointBorderColor: '#59595A',
                    tension: 0.2,
                    fill: true,
                },
            ],
        };
    }, [labels, data]);

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            onComplete: () => {
                gradientRef.current = null;
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                bodyColor: 'white',
                backgroundColor: '#0F0F0F',
                displayColors: false,
                callbacks: {
                    label: (context) => `HR: ${Math.round(context.parsed.y)} bpm`,
                },
            },
        },
        scales: {
            x: {
                ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10, color: '#999' },
                grid: {
                    color: 'rgba(75, 75, 77, .2)',
                    borderColor: 'rgba(75, 75, 77, .2)',
                    drawTicks: true,
                    drawBorder: true,
                    borderDash: [4, 4],
                },
            },
            y: {
                min: 40,
                max: 140,
                ticks: { stepSize: 20, color: '#BABEC4' },
                grid: {
                    color: 'rgba(75, 75, 77, .2)',
                    borderColor: 'rgba(75, 75, 77, .2)',
                    borderDash: [5, 5],
                    drawTicks: true,
                    drawBorder: true,
                },
                title: {
                    display: true,
                    text: 'HR (bpm)',
                    color: '#999',
                    font: { size: 12 },
                },
            },
        },
    }), []);

    const info = [
        { color: '#2A7FFF', name: 'Heart Rate' },
        { color: '#E54D4D', name: 'Normal Range (60-100 bpm)' },
        { color: '#F59E0D', name: 'Baseline (72 bpm)' },
    ];

    return (
        <>
            <div className='h-87'>
                <Line ref={chartRef} data={chartData} options={chartOptions} />
            </div>

            <div className="flex items-center flex-wrap gap-4 md:gap-5 lg:gap-6 mt-4 md:mt-6">
                {info.map((item, index) => (
                    <div className="flex items-center gap-2" key={index}>
                        <span className="block size-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <span className="text-xs font-normal text-white">{item.name}</span>
                    </div>
                ))}
            </div>
        </>
    );
};

export default HeartRateChart;