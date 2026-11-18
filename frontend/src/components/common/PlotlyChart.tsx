import React, { useState, useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import { useThemeStore } from '../../stores/useThemeStore';

const Plot = createPlotlyComponent(Plotly);

interface PlotlyChartProps {
  data: Plotly.Data[];
  layout: Partial<Plotly.Layout>;
  config?: Partial<Plotly.Config>;
  style?: React.CSSProperties;
  className?: string;
}

export const PlotlyChart: React.FC<PlotlyChartProps> = ({
  data,
  layout,
  config = { responsive: true, displayModeBar: false, displaylogo: false },
  style = { width: '100%', height: '100%' },
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isSmallMobile = containerWidth < 400;
  const isMobile = containerWidth < 640;

  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const textColor = isDark ? '#E2E8F0' : '#0F172A';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9';
  const zerolineColor = isDark ? 'rgba(255, 255, 255, 0.16)' : '#E2E8F0';

  const defaultMargin = isSmallMobile 
    ? { l: 38, r: 14, t: 28, b: 46, pad: 2 }
    : isMobile 
    ? { l: 48, r: 18, t: 32, b: 52, pad: 2 }
    : { l: 60, r: 28, t: 36, b: 56, pad: 4 };

  const mergedLayout: Partial<Plotly.Layout> = {
    autosize: true,
    margin: {
      ...defaultMargin,
      ...layout.margin,
    },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { 
      family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', 
      color: textColor, 
      size: isSmallMobile ? 11 : isMobile ? 12 : 13 
    },
    xaxis: {
      gridcolor: gridColor,
      zerolinecolor: zerolineColor,
      tickfont: { color: textColor, size: isSmallMobile ? 10 : isMobile ? 11 : 12 },
      automargin: true,
      tickangle: isMobile ? -25 : undefined,
      ...layout.xaxis,
    },
    yaxis: {
      gridcolor: gridColor,
      zerolinecolor: zerolineColor,
      tickfont: { color: textColor, size: isSmallMobile ? 10 : isMobile ? 11 : 12 },
      automargin: true,
      ...layout.yaxis,
    },
    legend: {
      font: { color: textColor, size: isSmallMobile ? 10 : isMobile ? 11 : 12 },
      orientation: isMobile ? 'h' : 'v',
      y: isMobile ? -0.25 : 1,
      x: isMobile ? 0 : 1.02,
      ...layout.legend,
    },
    ...layout,
  };

  return (
    <div ref={containerRef} className={`w-full h-full min-w-0 overflow-hidden ${className}`} style={{ width: '100%', height: '100%' }}>
      <Plot
        data={data}
        layout={mergedLayout}
        config={{
          responsive: true,
          displayModeBar: false,
          displaylogo: false,
          ...config,
        }}
        style={{ width: '100%', height: '100%', ...style }}
        useResizeHandler
      />
    </div>
  );
};
