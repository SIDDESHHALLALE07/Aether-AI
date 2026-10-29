import React, { useState, useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';

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

  const textColor = '#0F172A';
  const gridColor = '#F1F5F9';
  const zerolineColor = '#E2E8F0';

  const defaultMargin = isSmallMobile 
    ? { l: 32, r: 12, t: 24, b: 40, pad: 2 }
    : isMobile 
    ? { l: 40, r: 16, t: 28, b: 44, pad: 2 }
    : { l: 50, r: 24, t: 32, b: 48, pad: 4 };

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
      size: isSmallMobile ? 9 : isMobile ? 10 : 11 
    },
    xaxis: {
      gridcolor: gridColor,
      zerolinecolor: zerolineColor,
      tickfont: { color: textColor, size: isSmallMobile ? 8 : isMobile ? 9 : 10 },
      automargin: true,
      tickangle: isMobile ? -25 : undefined,
      ...layout.xaxis,
    },
    yaxis: {
      gridcolor: gridColor,
      zerolinecolor: zerolineColor,
      tickfont: { color: textColor, size: isSmallMobile ? 8 : isMobile ? 9 : 10 },
      automargin: true,
      ...layout.yaxis,
    },
    legend: {
      font: { color: textColor, size: isSmallMobile ? 8 : 9 },
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
