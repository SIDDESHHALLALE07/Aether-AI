import type { ChartPayload } from '../types';

export interface PlotlyRenderData {
  data: any[];
  layout: Record<string, any>;
}

export function chartPayloadToPlotly(payload: ChartPayload): PlotlyRenderData {
  if (!payload || !payload.chart_type) {
    return { data: [], layout: {} };
  }

  const baseLayout = {
    font: { family: 'Inter, sans-serif', color: '#1E293B', size: 11 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    margin: { l: 50, r: 25, t: 40, b: 50 },
    autosize: true,
  };

  const primaryColor = '#4F46E5';
  const qualitativePalette = [
    '#4F46E5', '#06B6D4', '#10B981', '#F59E0B', 
    '#EC4899', '#8B5CF6', '#64748B', '#0EA5E9'
  ];

  const chartType = payload.chart_type.toLowerCase();

  switch (chartType) {
    case 'bar_vertical':
    case 'bar':
    case 'column': {
      if (!payload.categories || !payload.series || payload.series.length === 0) {
        return { data: [], layout: {} };
      }
      const data = payload.series.map((s, idx) => ({
        type: 'bar',
        name: s.name,
        x: payload.categories,
        y: s.data,
        marker: { 
          color: idx === 0 ? primaryColor : qualitativePalette[idx % qualitativePalette.length],
          line: { color: idx === 0 ? '#3730A3' : 'transparent', width: 0.5 }
        },
        hovertemplate: '<b>%{x}</b><br>%{y}<extra></extra>'
      }));
      return {
        data,
        layout: {
          ...baseLayout,
          barmode: payload.series.length > 1 ? 'group' : 'relative',
          xaxis: { title: { text: payload.x_axis_title || 'Category' }, tickangle: -25 },
          yaxis: { title: { text: payload.y_axis_title || 'Value' } }
        }
      };
    }

    case 'bar_horizontal':
    case 'horizontal_bar': {
      if (!payload.categories || !payload.series || payload.series.length === 0) {
        return { data: [], layout: {} };
      }
      const data = payload.series.map((s, idx) => ({
        type: 'bar',
        orientation: 'h',
        name: s.name,
        y: payload.categories,
        x: s.data,
        marker: { 
          color: idx === 0 ? primaryColor : qualitativePalette[idx % qualitativePalette.length]
        },
        hovertemplate: '<b>%{y}</b>: %{x}<extra></extra>'
      }));
      return {
        data,
        layout: {
          ...baseLayout,
          xaxis: { title: { text: payload.x_axis_title || 'Value' } },
          yaxis: { title: { text: payload.y_axis_title || 'Category' }, automargin: true }
        }
      };
    }

    case 'line':
    case 'area': {
      if (!payload.categories || !payload.series || payload.series.length === 0) {
        return { data: [], layout: {} };
      }
      const isArea = chartType === 'area';
      const data = payload.series.map((s, idx) => ({
        type: 'scatter',
        mode: 'lines+markers',
        name: s.name,
        x: payload.categories,
        y: s.data,
        line: { 
          color: idx === 0 ? primaryColor : qualitativePalette[idx % qualitativePalette.length], 
          width: 2.5 
        },
        fill: isArea ? 'tozeroy' : 'none',
        fillcolor: isArea ? 'rgba(79, 70, 229, 0.12)' : undefined,
        marker: { size: 5 },
        hovertemplate: '<b>%{x}</b><br>%{y}<extra></extra>'
      }));
      return {
        data,
        layout: {
          ...baseLayout,
          xaxis: { title: { text: payload.x_axis_title || 'Index / Sequence' }, tickangle: -25 },
          yaxis: { title: { text: payload.y_axis_title || 'Value' } }
        }
      };
    }

    case 'scatter': {
      if (!payload.points || payload.points.length === 0) {
        return { data: [], layout: {} };
      }
      const data = [{
        type: 'scatter',
        mode: 'markers',
        x: payload.points.map(p => p.x),
        y: payload.points.map(p => p.y),
        text: payload.points.map(p => p.category),
        marker: {
          color: primaryColor,
          size: 7,
          opacity: 0.75,
          line: { color: '#3730A3', width: 0.5 }
        },
        hovertemplate: '<b>X</b>: %{x}<br><b>Y</b>: %{y}<br><b>Group</b>: %{text}<extra></extra>'
      }];
      return {
        data,
        layout: {
          ...baseLayout,
          xaxis: { title: { text: payload.x_axis_title || 'X' } },
          yaxis: { title: { text: payload.y_axis_title || 'Y' } }
        }
      };
    }

    case 'histogram': {
      if (!payload.bins || payload.bins.length === 0) {
        return { data: [], layout: {} };
      }
      const data = [{
        type: 'bar',
        x: payload.bins.map(b => b.range),
        y: payload.bins.map(b => b.count),
        marker: {
          color: primaryColor,
          line: { color: '#3730A3', width: 0.5 }
        },
        hovertemplate: '<b>Range</b>: %{x}<br><b>Count</b>: %{y}<extra></extra>'
      }];
      return {
        data,
        layout: {
          ...baseLayout,
          xaxis: { title: { text: payload.x_axis_title || 'Range (Binned)' }, tickangle: -30 },
          yaxis: { title: { text: payload.y_axis_title || 'Frequency' } }
        }
      };
    }

    case 'box': {
      let data: any[] = [];
      if (payload.raw_data && payload.raw_data.length > 0) {
        const grouped: Record<string, number[]> = {};
        payload.raw_data.forEach(item => {
          const cat = item.category || payload.column || 'Values';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(item.value);
        });
        data = Object.keys(grouped).map((cat, idx) => ({
          type: 'box',
          name: cat,
          y: grouped[cat],
          marker: { color: qualitativePalette[idx % qualitativePalette.length] },
          boxpoints: 'outliers'
        }));
      } else {
        data = [{
          type: 'box',
          name: payload.column || 'Values',
          q1: [payload.q1],
          median: [payload.median],
          q3: [payload.q3],
          lowerfence: [payload.min],
          upperfence: [payload.max],
          marker: { color: primaryColor }
        }];
      }
      return {
        data,
        layout: {
          ...baseLayout,
          yaxis: { title: { text: payload.column || 'Value' } }
        }
      };
    }

    case 'heatmap': {
      if (!payload.z_matrix || !payload.x_labels) {
        return { data: [], layout: {} };
      }
      const data = [{
        type: 'heatmap',
        z: payload.z_matrix,
        x: payload.x_labels,
        y: payload.y_labels,
        colorscale: [
          [0, '#EF4444'],
          [0.5, '#F8FAFC'],
          [1, '#4F46E5']
        ],
        zmin: -1,
        zmax: 1,
        hovertemplate: '<b>%{x} vs %{y}</b><br>Correlation: %{z:.3f}<extra></extra>'
      }];
      return {
        data,
        layout: {
          ...baseLayout,
          margin: { l: 80, r: 30, t: 40, b: 80 },
          xaxis: { tickangle: -35 },
          yaxis: { automargin: true }
        }
      };
    }

    case 'pie':
    case 'donut': {
      if (!payload.labels || !payload.values) {
        return { data: [], layout: {} };
      }
      const isDonut = chartType === 'donut' || payload.is_donut;
      const data = [{
        type: 'pie',
        labels: payload.labels,
        values: payload.values,
        hole: isDonut ? 0.45 : 0,
        marker: { colors: qualitativePalette },
        textinfo: 'label+percent',
        hoverinfo: 'label+value+percent'
      }];
      return {
        data,
        layout: {
          ...baseLayout,
          showlegend: true
        }
      };
    }

    default:
      return { data: [], layout: {} };
  }
}
