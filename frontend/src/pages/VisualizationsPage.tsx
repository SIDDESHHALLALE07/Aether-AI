import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { Loader2, RefreshCw, AlertCircle, Sparkles, FileSpreadsheet, ChevronDown, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { 
  ChartRecommendation, 
  ChartPayload, 
  SupportedChartType, 
  ChartConfig 
} from '../types';
import { PlotlyChart } from '../components/common/PlotlyChart';

const CHART_TYPES: { id: SupportedChartType; label: string; desc: string }[] = [
  { id: 'bar_vertical', label: 'Bar (Vertical)', desc: 'Categorical comparisons & counts' },
  { id: 'bar_horizontal', label: 'Bar (Horizontal)', desc: 'Ranking & long category labels' },
  { id: 'line', label: 'Line Chart', desc: 'Time series & continuous trends' },
  { id: 'area', label: 'Area Chart', desc: 'Cumulative volume & trends' },
  { id: 'scatter', label: 'Scatter Plot', desc: 'Correlation & 2D bivariate distribution' },
  { id: 'histogram', label: 'Histogram', desc: 'Frequency & statistical distribution' },
  { id: 'box', label: 'Box Plot', desc: 'Quartiles, medians, & outlier detection' },
  { id: 'heatmap', label: 'Correlation Heatmap', desc: 'Multivariate Pearson correlation matrix' },
  { id: 'pie', label: 'Pie Chart', desc: 'Proportional share of total' },
  { id: 'donut', label: 'Donut Chart', desc: 'Ring share & distribution' },
];

export const VisualizationsPage: React.FC = () => {
  const { 
    activeDataset, 
    datasets, 
    selectDataset, 
    setActiveChartConfig 
  } = useWorkspaceStore();

  const [columnsMeta, setColumnsMeta] = useState<Record<string, any>>({});
  const [recommendations, setRecommendations] = useState<ChartRecommendation[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [selectedChartType, setSelectedChartType] = useState<SupportedChartType>('bar_vertical');
  const [xColumn, setXColumn] = useState<string>('');
  const [yColumn, setYColumn] = useState<string>('');
  const [groupBy, setGroupBy] = useState<string>('');
  const [aggregation, setAggregation] = useState<'sum' | 'mean' | 'count' | 'min' | 'max'>('sum');
  const [bins, setBins] = useState<number>(15);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  const [activeChartPayload, setActiveChartPayload] = useState<ChartPayload | null>(null);
  const [isGeneratingChart, setIsGeneratingChart] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartTitle, setChartTitle] = useState<string>('Visualization');
  const [showDatasetDropdown, setShowDatasetDropdown] = useState(false);

  const datasetDropdownRef = useRef<HTMLDivElement>(null);
  const currentReqIdRef = useRef<number>(0);
  const lastActiveDatasetIdRef = useRef<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (datasetDropdownRef.current && !datasetDropdownRef.current.contains(e.target as Node)) {
        setShowDatasetDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Compute column categories based on metadata
  const { allColumns, numericColumns, categoricalColumns, datetimeColumns } = useMemo(() => {
    const all = Object.keys(columnsMeta);
    const num: string[] = [];
    const cat: string[] = [];
    const dt: string[] = [];

    for (const col of all) {
      const meta = columnsMeta[col];
      const dtype = (meta?.dtype || '').toLowerCase();
      const colLower = col.toLowerCase();

      if (
        dtype.includes('int') || 
        dtype.includes('float') || 
        dtype.includes('double') || 
        dtype.includes('number') || 
        dtype.includes('num') ||
        dtype.includes('real')
      ) {
        num.push(col);
      } else if (
        dtype.includes('datetime') || 
        dtype.includes('date') || 
        dtype.includes('time') || 
        dtype.includes('timestamp') ||
        colLower.includes('date') || 
        colLower.includes('time') ||
        colLower.includes('year') ||
        colLower.includes('month') ||
        colLower.includes('day') ||
        colLower.includes('timestamp')
      ) {
        dt.push(col);
      } else {
        cat.push(col);
      }
    }

    return {
      allColumns: all,
      numericColumns: num,
      categoricalColumns: cat.length > 0 ? cat : all.filter(c => !num.includes(c)),
      datetimeColumns: dt
    };
  }, [columnsMeta]);

  // Execute chart generation API request
  const executeGenerate = useCallback(async (params: {
    type: SupportedChartType;
    x?: string;
    y?: string;
    group?: string;
    agg?: 'sum' | 'mean' | 'count' | 'min' | 'max';
    binCount?: number;
    multiCols?: string[];
    customTitle?: string;
    numColsOverride?: string[];
  }) => {
    if (!activeDataset) return;

    const reqId = ++currentReqIdRef.current;
    setIsGeneratingChart(true);
    setChartError(null);

    const { type, x, y, group, agg, binCount, multiCols, customTitle, numColsOverride } = params;
    const effectiveNumCols = numColsOverride || numericColumns;

    // Client-side pre-validation
    if (type === 'heatmap') {
      const targetCols = multiCols && multiCols.length > 0 ? multiCols : effectiveNumCols;
      if (targetCols.length < 2) {
        setIsGeneratingChart(false);
        setChartError('Correlation Heatmap requires at least two numeric columns.');
        setActiveChartPayload(null);
        return;
      }
    } else if (type === 'scatter') {
      if (!x || !y) {
        setIsGeneratingChart(false);
        setChartError('Scatter Plot requires both an X Axis and Y Axis column.');
        setActiveChartPayload(null);
        return;
      }
      if (effectiveNumCols.length > 0 && (!effectiveNumCols.includes(x) || !effectiveNumCols.includes(y))) {
        setIsGeneratingChart(false);
        setChartError('Scatter Plot requires both X and Y to be numeric columns.');
        setActiveChartPayload(null);
        return;
      }
    } else if (type === 'histogram') {
      if (!x) {
        setIsGeneratingChart(false);
        setChartError('Histogram requires a numeric column.');
        setActiveChartPayload(null);
        return;
      }
      if (effectiveNumCols.length > 0 && !effectiveNumCols.includes(x)) {
        setIsGeneratingChart(false);
        setChartError(`Histogram requires a numeric column. '${x}' is not numeric.`);
        setActiveChartPayload(null);
        return;
      }
    } else if (type === 'box') {
      if (!x) {
        setIsGeneratingChart(false);
        setChartError('Box Plot requires a numeric value column.');
        setActiveChartPayload(null);
        return;
      }
      if (effectiveNumCols.length > 0 && !effectiveNumCols.includes(x)) {
        setIsGeneratingChart(false);
        setChartError(`Box Plot requires a numeric column. '${x}' is not numeric.`);
        setActiveChartPayload(null);
        return;
      }
    } else {
      if (!x) {
        setIsGeneratingChart(false);
        setChartError('Please select a primary column to generate the visualization.');
        setActiveChartPayload(null);
        return;
      }
    }

    try {
      const payload = await api.generateChartPayload(activeDataset.id, {
        chart_type: type,
        x_column: type === 'heatmap' ? undefined : x,
        y_column: y || undefined,
        group_by: group || undefined,
        aggregation: agg || 'sum',
        bins: binCount || bins,
        selected_columns: type === 'heatmap' ? (multiCols && multiCols.length > 0 ? multiCols : effectiveNumCols) : undefined
      });

      if (reqId !== currentReqIdRef.current) return;

      if (
        (type === 'heatmap' && (!payload.z_matrix || payload.z_matrix.length < 2)) ||
        (type === 'scatter' && (!payload.points || payload.points.length === 0)) ||
        (type === 'histogram' && (!payload.bins || payload.bins.length === 0)) ||
        (['pie', 'donut'].includes(type) && (!payload.labels || payload.labels.length === 0)) ||
        (['bar_vertical', 'bar_horizontal', 'line', 'area'].includes(type) && (!payload.series || payload.series.length === 0))
      ) {
        setChartError('No valid data points available in the dataset for this chart configuration.');
        setActiveChartPayload(null);
      } else {
        setActiveChartPayload(payload);
        
        let title = customTitle;
        if (!title) {
          const typeLabel = CHART_TYPES.find(c => c.id === type)?.label || type.toUpperCase();
          if (type === 'heatmap') {
            title = 'Correlation Heatmap';
          } else if (y) {
            title = `${typeLabel}: ${x} vs ${y}`;
          } else {
            title = `${typeLabel}: ${x}`;
          }
        }
        setChartTitle(title);

        const activeConfig: ChartConfig = {
          chartType: type,
          xColumn: x || '',
          yColumn: y || undefined,
          groupColumn: group || undefined,
          aggregation: agg || 'sum',
          bins: binCount || bins,
          selectedColumns: multiCols || undefined
        };
        setActiveChartConfig(activeConfig);
      }
    } catch (err: any) {
      if (reqId === currentReqIdRef.current) {
        setChartError(err.message || 'Unable to generate visualization.');
        setActiveChartPayload(null);
      }
    } finally {
      if (reqId === currentReqIdRef.current) {
        setIsGeneratingChart(false);
      }
    }
  }, [activeDataset, numericColumns, bins, setActiveChartConfig]);

  // Handle switching chart types from dropdown
  const handleChartTypeChange = (newType: SupportedChartType) => {
    setSelectedChartType(newType);
    setChartError(null);

    let nextX = xColumn;
    let nextY = yColumn;
    let nextGroup = groupBy;
    let nextAgg = aggregation;
    let nextBins = bins;
    let nextMulti = selectedColumns.length > 0 ? selectedColumns : numericColumns;

    if (newType === 'heatmap') {
      if (nextMulti.length < 2 && numericColumns.length >= 2) {
        nextMulti = numericColumns;
        setSelectedColumns(nextMulti);
      }
    } else if (newType === 'scatter') {
      if (!numericColumns.includes(nextX) && numericColumns.length > 0) {
        nextX = numericColumns[0];
        setXColumn(nextX);
      }
      if ((!nextY || !numericColumns.includes(nextY) || nextY === nextX) && numericColumns.length > 1) {
        nextY = numericColumns.find(c => c !== nextX) || numericColumns[1];
        setYColumn(nextY);
      }
    } else if (newType === 'histogram') {
      if (!numericColumns.includes(nextX) && numericColumns.length > 0) {
        nextX = numericColumns[0];
        setXColumn(nextX);
      }
      nextY = '';
      setYColumn('');
    } else if (newType === 'box') {
      if (!numericColumns.includes(nextX) && numericColumns.length > 0) {
        nextX = numericColumns[0];
        setXColumn(nextX);
      }
      nextY = '';
      setYColumn('');
      if (nextGroup && (!categoricalColumns.includes(nextGroup) || nextGroup === nextX)) {
        nextGroup = '';
        setGroupBy('');
      }
    } else if (newType === 'line' || newType === 'area') {
      if (datetimeColumns.length > 0 && !datetimeColumns.includes(nextX)) {
        nextX = datetimeColumns[0];
        setXColumn(nextX);
      } else if (!nextX && allColumns.length > 0) {
        nextX = allColumns[0];
        setXColumn(nextX);
      }
      if (!nextY && numericColumns.length > 0) {
        nextY = numericColumns.find(c => c !== nextX) || numericColumns[0];
        setYColumn(nextY);
      }
    } else if (newType === 'pie' || newType === 'donut') {
      if (categoricalColumns.length > 0 && !categoricalColumns.includes(nextX)) {
        nextX = categoricalColumns[0];
        setXColumn(nextX);
      } else if (!nextX && allColumns.length > 0) {
        nextX = allColumns[0];
        setXColumn(nextX);
      }
    } else if (newType === 'bar_vertical' || newType === 'bar_horizontal') {
      if (categoricalColumns.length > 0 && !categoricalColumns.includes(nextX)) {
        nextX = categoricalColumns[0];
        setXColumn(nextX);
      } else if (!nextX && allColumns.length > 0) {
        nextX = allColumns[0];
        setXColumn(nextX);
      }
      if (!nextY && numericColumns.length > 0) {
        nextY = numericColumns[0];
        setYColumn(nextY);
      }
    }

    executeGenerate({
      type: newType,
      x: nextX,
      y: nextY,
      group: nextGroup,
      agg: nextAgg,
      binCount: nextBins,
      multiCols: nextMulti
    });
  };

  // Render a specific recommendation directly
  const handleRenderRecommendation = useCallback((rec: ChartRecommendation, currentNumCols?: string[]) => {
    let targetType: SupportedChartType = 'bar_vertical';
    const recType = (rec.chart_type || '').toLowerCase();
    if (recType === 'horizontal_bar' || recType === 'bar_horizontal') {
      targetType = 'bar_horizontal';
    } else if (recType === 'bar' || recType === 'bar_vertical') {
      targetType = 'bar_vertical';
    } else if (recType === 'line') {
      targetType = 'line';
    } else if (recType === 'area') {
      targetType = 'area';
    } else if (recType === 'scatter') {
      targetType = 'scatter';
    } else if (recType === 'histogram') {
      targetType = 'histogram';
    } else if (recType === 'box') {
      targetType = 'box';
    } else if (recType === 'heatmap') {
      targetType = 'heatmap';
    } else if (recType === 'donut') {
      targetType = 'donut';
    } else if (recType === 'pie') {
      targetType = 'pie';
    }

    setSelectedChartType(targetType);
    setXColumn(rec.x_column || '');
    setYColumn(rec.y_column || '');
    if (rec.group_by) {
      setGroupBy(rec.group_by);
    }
    const targetAgg = (rec.aggregation as any) || 'sum';
    if (rec.aggregation) setAggregation(targetAgg);

    executeGenerate({
      type: targetType,
      x: rec.x_column,
      y: rec.y_column,
      group: rec.group_by,
      agg: targetAgg,
      customTitle: rec.title,
      numColsOverride: currentNumCols
    });
  }, [executeGenerate]);

  // Fetch dataset metadata and recommendations whenever activeDataset changes
  useEffect(() => {
    if (!activeDataset) return;
    if (lastActiveDatasetIdRef.current === activeDataset.id) return;

    lastActiveDatasetIdRef.current = activeDataset.id;
    setIsLoadingMetadata(true);
    setMetaError(null);
    setChartError(null);
    setActiveChartPayload(null);

    const loadDatasetData = async () => {
      try {
        const [recs, detail] = await Promise.all([
          api.getChartRecommendations(activeDataset.id).catch(() => [] as ChartRecommendation[]),
          api.getDataset(activeDataset.id)
        ]);

        const rawMeta = detail?.latest_version?.columns_meta;
        const meta: Record<string, any> = {};
        if (Array.isArray(rawMeta)) {
          rawMeta.forEach((item: any) => {
            if (item && item.name) {
              meta[item.name] = item;
            }
          });
        } else if (rawMeta && typeof rawMeta === 'object') {
          Object.assign(meta, rawMeta);
        }
        setColumnsMeta(meta);
        setRecommendations(recs || []);

        const colKeys = Object.keys(meta);
        const numCols = colKeys.filter(c => {
          const dt = (meta[c]?.dtype || '').toLowerCase();
          return dt.includes('int') || dt.includes('float') || dt.includes('number') || dt.includes('num') || dt.includes('double');
        });
        const catCols = colKeys.filter(c => !numCols.includes(c));

        if (recs && recs.length > 0) {
          const preferred = recs.find((r: ChartRecommendation) => r.chart_type !== 'heatmap') || recs[0];
          handleRenderRecommendation(preferred, numCols);
        } else if (colKeys.length > 0) {
          const initX = catCols[0] || colKeys[0];
          const initY = numCols.length > 0 ? numCols[0] : (colKeys.length > 1 ? colKeys[1] : '');
          setSelectedChartType('bar_vertical');
          setXColumn(initX);
          setYColumn(initY);
          executeGenerate({
            type: 'bar_vertical',
            x: initX,
            y: initY,
            agg: 'sum',
            numColsOverride: numCols
          });
        }
      } catch (err: any) {
        setMetaError(err.message || 'Failed to load dataset metadata.');
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    loadDatasetData();
  }, [activeDataset, handleRenderRecommendation, executeGenerate]);

  const toggleHeatmapColumn = (col: string) => {
    const current = selectedColumns.length > 0 ? selectedColumns : numericColumns;
    let updated: string[];
    if (current.includes(col)) {
      if (current.length <= 2) return;
      updated = current.filter(c => c !== col);
    } else {
      updated = [...current, col];
    }
    setSelectedColumns(updated);
  };

  const handleSelectAllHeatmap = () => {
    setSelectedColumns(numericColumns);
  };

  // Convert payload into Plotly traces & layout
  const getPlotlyDataAndLayout = () => {
    if (!activeChartPayload) return { data: [], layout: {} };
    const p = activeChartPayload;
    const baseLayout = {
      autosize: true,
      paper_bgcolor: '#FFFFFF',
      plot_bgcolor: '#FFFFFF',
      font: { family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', color: '#0F172A', size: 11 },
      xaxis: { gridcolor: '#F1F5F9', zerolinecolor: '#E2E8F0', tickfont: { color: '#0F172A', size: 10 } },
      yaxis: { gridcolor: '#F1F5F9', zerolinecolor: '#E2E8F0', tickfont: { color: '#0F172A', size: 10 } },
    };

    const primaryColor = '#2563EB';
    const qualitativePalette = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0284C7', '#475569', '#DB2777', '#0891B2'];

    switch (p.chart_type) {
      case 'bar_vertical': {
        if (!p.categories || !p.series || p.series.length === 0) return { data: [], layout: {} };
        const seriesList = p.series;
        const isSingle = seriesList.length === 1;
        const data = seriesList.map((s, idx) => ({
          type: 'bar',
          name: s.name,
          x: p.categories,
          y: s.data,
          marker: { color: idx === 0 && isSingle ? primaryColor : qualitativePalette[idx % qualitativePalette.length] },
        }));
        return {
          data,
          layout: {
            ...baseLayout,
            barmode: seriesList.length > 1 ? 'group' : 'relative',
            xaxis: { ...baseLayout.xaxis, title: { text: p.x_axis_title || xColumn }, tickangle: -20 },
            yaxis: { ...baseLayout.yaxis, title: { text: p.y_axis_title || yColumn || 'Count' } }
          }
        };
      }
      case 'bar_horizontal': {
        if (!p.categories || !p.series || p.series.length === 0) return { data: [], layout: {} };
        const seriesList = p.series;
        const isSingle = seriesList.length === 1;
        const data = seriesList.map((s, idx) => ({
          type: 'bar',
          orientation: 'h',
          name: s.name,
          y: p.categories,
          x: s.data,
          marker: { color: idx === 0 && isSingle ? primaryColor : qualitativePalette[idx % qualitativePalette.length] },
        }));
        return {
          data,
          layout: {
            ...baseLayout,
            barmode: seriesList.length > 1 ? 'group' : 'relative',
            xaxis: { ...baseLayout.xaxis, title: { text: p.y_axis_title || 'Value' } },
            yaxis: { ...baseLayout.yaxis, title: { text: p.x_axis_title || xColumn }, autorange: 'reversed' }
          }
        };
      }
      case 'line': {
        if (!p.categories || !p.series || p.series.length === 0) return { data: [], layout: {} };
        const seriesList = p.series;
        const isSingle = seriesList.length === 1;
        const data = seriesList.map((s, idx) => ({
          type: 'scatter',
          mode: 'lines+markers',
          name: s.name,
          x: p.categories,
          y: s.data,
          line: { color: idx === 0 && isSingle ? primaryColor : qualitativePalette[idx % qualitativePalette.length], width: 2 },
          marker: { size: 5, color: idx === 0 && isSingle ? primaryColor : qualitativePalette[idx % qualitativePalette.length] },
        }));
        return {
          data,
          layout: {
            ...baseLayout,
            xaxis: { ...baseLayout.xaxis, title: { text: p.x_axis_title || xColumn }, tickangle: -20 },
            yaxis: { ...baseLayout.yaxis, title: { text: p.y_axis_title || yColumn } }
          }
        };
      }
      case 'area': {
        if (!p.categories || !p.series || p.series.length === 0) return { data: [], layout: {} };
        const seriesList = p.series;
        const isSingle = seriesList.length === 1;
        const data = seriesList.map((s, idx) => ({
          type: 'scatter',
          mode: 'lines',
          name: s.name,
          x: p.categories,
          y: s.data,
          fill: 'tozeroy',
          fillcolor: idx === 0 ? 'rgba(37, 99, 235, 0.12)' : undefined,
          line: { color: idx === 0 && isSingle ? primaryColor : qualitativePalette[idx % qualitativePalette.length], width: 2 },
        }));
        return {
          data,
          layout: {
            ...baseLayout,
            xaxis: { ...baseLayout.xaxis, title: { text: p.x_axis_title || xColumn }, tickangle: -20 },
            yaxis: { ...baseLayout.yaxis, title: { text: p.y_axis_title || yColumn } }
          }
        };
      }
      case 'scatter': {
        if (!p.points || p.points.length === 0) return { data: [], layout: {} };
        
        const categories = Array.from(new Set(p.points.map(pt => pt.category || 'Data Point')));
        const data = categories.map((cat, idx) => {
          const catPoints = p.points!.filter(pt => (pt.category || 'Data Point') === cat);
          return {
            type: 'scatter',
            mode: 'markers',
            name: cat,
            x: catPoints.map(pt => pt.x),
            y: catPoints.map(pt => pt.y),
            marker: {
              size: 6,
              color: categories.length === 1 ? primaryColor : qualitativePalette[idx % qualitativePalette.length],
              opacity: 0.8
            }
          };
        });

        return {
          data,
          layout: {
            ...baseLayout,
            showlegend: categories.length > 1,
            xaxis: { ...baseLayout.xaxis, title: { text: p.x_axis_title || xColumn } },
            yaxis: { ...baseLayout.yaxis, title: { text: p.y_axis_title || yColumn } }
          }
        };
      }
      case 'histogram': {
        if (!p.bins || p.bins.length === 0) return { data: [], layout: {} };
        const data = [{
          type: 'bar',
          x: p.bins.map(b => b.range),
          y: p.bins.map(b => b.count),
          marker: { color: primaryColor },
        }];
        return {
          data,
          layout: {
            ...baseLayout,
            xaxis: { ...baseLayout.xaxis, title: { text: p.x_axis_title || xColumn }, tickangle: -20 },
            yaxis: { ...baseLayout.yaxis, title: { text: 'Frequency' } }
          }
        };
      }
      case 'box': {
        if (p.raw_data && p.raw_data.length > 0) {
          const groupMap: Record<string, number[]> = {};
          for (const item of p.raw_data) {
            const cat = item.category || p.column || 'Values';
            if (!groupMap[cat]) groupMap[cat] = [];
            groupMap[cat].push(item.value);
          }
          const data = Object.entries(groupMap).map(([cat, vals], idx) => ({
            type: 'box',
            name: cat,
            y: vals,
            boxpoints: 'outliers',
            boxmean: true,
            marker: { color: Object.keys(groupMap).length === 1 ? primaryColor : qualitativePalette[idx % qualitativePalette.length] }
          }));
          return {
            data,
            layout: {
              ...baseLayout,
              showlegend: Object.keys(groupMap).length > 1,
              xaxis: { ...baseLayout.xaxis, title: { text: p.group_column || '' } },
              yaxis: { ...baseLayout.yaxis, title: { text: p.column || xColumn } }
            }
          };
        } else if (p.min !== undefined && p.max !== undefined) {
          const data = [{
            type: 'box',
            name: p.column || xColumn,
            y: p.outliers && p.outliers.length > 0
              ? [p.min, p.q1, p.median, p.q3, p.max, ...p.outliers]
              : [p.min, p.q1, p.median, p.q3, p.max],
            boxpoints: 'outliers',
            boxmean: true,
            marker: { color: primaryColor }
          }];
          return {
            data,
            layout: {
              ...baseLayout,
              yaxis: { ...baseLayout.yaxis, title: { text: p.column || xColumn } }
            }
          };
        }
        return { data: [], layout: {} };
      }
      case 'heatmap': {
        if (!p.z_matrix || !p.x_labels || !p.y_labels) return { data: [], layout: {} };
        const data = [{
          type: 'heatmap',
          z: p.z_matrix,
          x: p.x_labels,
          y: p.y_labels,
          colorscale: 'Blues',
          zmin: -1,
          zmax: 1,
        }];
        return {
          data,
          layout: {
            ...baseLayout,
            xaxis: { ...baseLayout.xaxis, tickangle: -25 },
            yaxis: { ...baseLayout.yaxis, autorange: 'reversed' }
          }
        };
      }
      case 'pie':
      case 'donut': {
        if (!p.labels || !p.values) return { data: [], layout: {} };
        const data = [{
          type: 'pie',
          labels: p.labels,
          values: p.values,
          hole: p.chart_type === 'donut' ? 0.45 : 0,
          marker: { colors: qualitativePalette }
        }];
        return { data, layout: baseLayout };
      }
      default:
        return { data: [], layout: {} };
    }
  };

  // State: No dataset selected
  if (!activeDataset) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 min-w-0">
        <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Visualizations</h1>
        <div className="p-8 text-center bg-white border border-[#E2E8F0] rounded-xl space-y-3">
          <FileSpreadsheet className="w-10 h-10 text-[#94A3B8] mx-auto mb-2" />
          <h2 className="text-sm font-semibold text-[#0F172A]">No Dataset Selected</h2>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            {datasets.length === 0 
              ? 'Please upload a dataset to begin generating analytical visualizations.' 
              : 'Select one of your existing datasets below to render charts and statistical summaries.'}
          </p>
          {datasets.length > 0 ? (
            <div className="pt-2 flex flex-wrap justify-center gap-2 max-w-md mx-auto">
              {datasets.map((d) => (
                <button
                  key={d.id}
                  onClick={() => selectDataset(d)}
                  className="bg-[#F8FAFC] hover:bg-[#EFF6FF] border border-[#CBD5E1] hover:border-[#2563EB] text-[#0F172A] hover:text-[#2563EB] text-xs font-medium px-3 py-1.5 rounded-md transition-colors touch-manipulation truncate max-w-[200px]"
                >
                  {d.original_filename}
                </button>
              ))}
            </div>
          ) : (
            <Link 
              to="/datasets"
              className="mt-2 inline-block bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium px-4 py-2 rounded-md transition-colors touch-manipulation"
            >
              Upload Dataset
            </Link>
          )}
        </div>
      </div>
    );
  }

  const { data: plotlyData, layout: plotlyLayout } = getPlotlyDataAndLayout();

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5 min-w-0">
      {/* Header & Dataset Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Visualizations</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Transform and render real-time statistical charts from your dataset.
          </p>
        </div>

        {/* Dataset Quick Switcher */}
        <div className="relative" ref={datasetDropdownRef}>
          <button
            onClick={() => setShowDatasetDropdown(!showDatasetDropdown)}
            className="flex items-center space-x-2 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F172A] transition-colors touch-manipulation"
            title="Switch Dataset"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="font-medium max-w-[160px] sm:max-w-[200px] truncate">{activeDataset.original_filename}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform ${showDatasetDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDatasetDropdown && (
            <div className="absolute right-0 mt-1.5 w-72 bg-white border border-[#E2E8F0] rounded-lg shadow-lg p-1.5 z-50 text-xs">
              <div className="px-2.5 py-1.5 border-b border-[#F1F5F9] font-semibold text-[#64748B]">Switch Dataset</div>
              <div className="max-h-56 overflow-y-auto py-1 space-y-0.5">
                {datasets.map((d) => {
                  const isSelected = activeDataset.id === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        selectDataset(d);
                        setShowDatasetDropdown(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-[#EFF6FF] text-[#2563EB] font-medium' : 'text-[#0F172A] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <span className="truncate mr-2">{d.original_filename}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#2563EB] flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations Chips */}
      {recommendations.length > 0 && !isLoadingMetadata && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 space-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#0F172A]">
            <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Recommended Visualizations</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {recommendations.map((rec, idx) => (
              <button
                key={idx}
                onClick={() => handleRenderRecommendation(rec)}
                className="flex-shrink-0 flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#EFF6FF] hover:border-[#2563EB] text-xs text-[#0F172A] transition-colors touch-manipulation"
                title={rec.reason || rec.title}
              >
                <span className="font-medium truncate max-w-[220px]">{rec.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-w-0">
        {/* Left Column: Configuration & Controls */}
        <div className="lg:col-span-1 p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-3.5 text-xs min-w-0">
          <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
            <h2 className="font-semibold text-xs text-[#0F172A] uppercase tracking-wider">
              Chart Controls
            </h2>
            {isLoadingMetadata && (
              <Loader2 className="w-3.5 h-3.5 text-[#2563EB] animate-spin" />
            )}
          </div>

          {/* Chart Type Selector */}
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">Chart Type</label>
            <select
              value={selectedChartType}
              onChange={(e) => handleChartTypeChange(e.target.value as SupportedChartType)}
              className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
            >
              {CHART_TYPES.map((ct) => (
                <option key={ct.id} value={ct.id}>{ct.label}</option>
              ))}
            </select>
          </div>

          {/* Controls for Vertical & Horizontal Bar */}
          {(selectedChartType === 'bar_vertical' || selectedChartType === 'bar_horizontal') && (
            <>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Category Column (X Axis)</label>
                <select
                  value={xColumn}
                  onChange={(e) => setXColumn(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                >
                  <option value="">Select category...</option>
                  {(categoricalColumns.length > 0 ? categoricalColumns : allColumns).map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Metric Column (Optional)</label>
                <select
                  value={yColumn}
                  onChange={(e) => setYColumn(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                >
                  <option value="">None (Count frequency)</option>
                  {numericColumns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {yColumn && (
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">Aggregation</label>
                  <select
                    value={aggregation}
                    onChange={(e) => setAggregation(e.target.value as any)}
                    className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                  >
                    <option value="sum">Sum</option>
                    <option value="mean">Mean (Average)</option>
                    <option value="count">Count</option>
                    <option value="min">Minimum</option>
                    <option value="max">Maximum</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Group By (Optional)</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                >
                  <option value="">None</option>
                  {allColumns.filter(c => c !== xColumn && c !== yColumn).map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Controls for Line & Area */}
          {(selectedChartType === 'line' || selectedChartType === 'area') && (
            <>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">X Column (Date / Sequence)</label>
                <select
                  value={xColumn}
                  onChange={(e) => setXColumn(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                >
                  <option value="">Select X column...</option>
                  {allColumns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Y Column (Metric)</label>
                <select
                  value={yColumn}
                  onChange={(e) => setYColumn(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                >
                  <option value="">Select Y metric...</option>
                  {numericColumns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {yColumn && (
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">Aggregation</label>
                  <select
                    value={aggregation}
                    onChange={(e) => setAggregation(e.target.value as any)}
                    className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                  >
                    <option value="sum">Sum</option>
                    <option value="mean">Mean (Average)</option>
                    <option value="count">Count</option>
                    <option value="min">Minimum</option>
                    <option value="max">Maximum</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Group By (Optional Multi-line)</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                >
                  <option value="">None</option>
                  {allColumns.filter(c => c !== xColumn && c !== yColumn).map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Controls for Scatter */}
          {selectedChartType === 'scatter' && (
            <>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">X Column (Numeric)</label>
                <select
                  value={xColumn}
                  onChange={(e) => setXColumn(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                >
                  <option value="">Select numeric X...</option>
                  {numericColumns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Y Column (Numeric)</label>
                <select
                  value={yColumn}
                  onChange={(e) => setYColumn(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                >
                  <option value="">Select numeric Y...</option>
                  {numericColumns.filter(c => c !== xColumn).map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Group / Color (Optional)</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                >
                  <option value="">None</option>
                  {allColumns.filter(c => c !== xColumn && c !== yColumn).map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Controls for Histogram */}
          {selectedChartType === 'histogram' && (
            <>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Numeric Column</label>
                <select
                  value={xColumn}
                  onChange={(e) => setXColumn(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                >
                  <option value="">Select column...</option>
                  {numericColumns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-[#475569]">Number of Bins</label>
                  <span className="text-xs font-semibold text-[#2563EB]">{bins}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={bins}
                  onChange={(e) => setBins(parseInt(e.target.value) || 15)}
                  className="w-full accent-[#2563EB]"
                />
              </div>
            </>
          )}

          {/* Controls for Box Plot */}
          {selectedChartType === 'box' && (
            <>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Numeric Column</label>
                <select
                  value={xColumn}
                  onChange={(e) => setXColumn(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                >
                  <option value="">Select column...</option>
                  {numericColumns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Group By Category (Optional)</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                >
                  <option value="">None (Single distribution)</option>
                  {categoricalColumns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Controls for Heatmap */}
          {selectedChartType === 'heatmap' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-[#475569]">Select Numeric Columns (≥ 2)</label>
                <button
                  type="button"
                  onClick={handleSelectAllHeatmap}
                  className="text-[11px] text-[#2563EB] hover:underline"
                >
                  Select All
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 p-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] scrollbar-thin">
                {numericColumns.length === 0 ? (
                  <p className="text-[11px] text-[#64748B] py-2 text-center">No numeric columns found.</p>
                ) : (
                  numericColumns.map((col) => {
                    const isSelected = (selectedColumns.length > 0 ? selectedColumns : numericColumns).includes(col);
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => toggleHeatmapColumn(col)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left transition-colors touch-manipulation ${
                          isSelected ? 'bg-[#EFF6FF] text-[#2563EB] font-medium' : 'text-[#64748B] hover:bg-white'
                        }`}
                      >
                        <span className="truncate mr-1">{col}</span>
                        {isSelected && <span className="text-xs font-bold">✓</span>}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Controls for Pie / Donut */}
          {(selectedChartType === 'pie' || selectedChartType === 'donut') && (
            <>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Category Column</label>
                <select
                  value={xColumn}
                  onChange={(e) => setXColumn(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                >
                  <option value="">Select category...</option>
                  {(categoricalColumns.length > 0 ? categoricalColumns : allColumns).map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Metric Value (Optional)</label>
                <select
                  value={yColumn}
                  onChange={(e) => setYColumn(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                >
                  <option value="">None (Count frequency)</option>
                  {numericColumns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {yColumn && (
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">Aggregation</label>
                  <select
                    value={aggregation}
                    onChange={(e) => setAggregation(e.target.value as any)}
                    className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                  >
                    <option value="sum">Sum</option>
                    <option value="mean">Mean (Average)</option>
                    <option value="count">Count</option>
                  </select>
                </div>
              )}
            </>
          )}

          {/* Action Button */}
          <button
            onClick={() => executeGenerate({
              type: selectedChartType,
              x: xColumn,
              y: yColumn,
              group: groupBy,
              agg: aggregation,
              binCount: bins,
              multiCols: selectedColumns
            })}
            disabled={isGeneratingChart || (selectedChartType !== 'heatmap' && !xColumn)}
            className="w-full mt-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-medium text-xs py-2.5 rounded-lg transition-colors touch-manipulation flex items-center justify-center space-x-1.5"
          >
            {isGeneratingChart ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Rendering...</span>
              </>
            ) : (
              <span>Render Plot</span>
            )}
          </button>
        </div>

        {/* Right Column: Visualization Canvas */}
        <div className="lg:col-span-3 p-3.5 sm:p-5 rounded-xl bg-white border border-[#E2E8F0] flex flex-col justify-between min-h-[360px] sm:min-h-[440px] min-w-0">
          {/* Canvas Title Bar */}
          <div className="flex justify-between items-center pb-2.5 border-b border-[#F1F5F9] mb-3 min-w-0 gap-2">
            <h2 className="text-xs sm:text-sm font-semibold text-[#0F172A] truncate" title={chartTitle}>
              {chartTitle}
            </h2>
            {activeChartPayload && (
              <span className="text-[11px] text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 rounded-md flex-shrink-0">
                {CHART_TYPES.find(c => c.id === selectedChartType)?.label || selectedChartType}
              </span>
            )}
          </div>

          {/* Canvas Content Body */}
          <div className="flex-1 flex items-center justify-center min-w-0 w-full">
            {isLoadingMetadata ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-2">
                <Loader2 className="w-7 h-7 text-[#2563EB] animate-spin" />
                <span className="text-xs text-[#64748B]">Loading dataset metadata & recommendations...</span>
              </div>
            ) : metaError ? (
              <div className="p-6 text-center text-xs max-w-md space-y-3">
                <AlertCircle className="w-8 h-8 text-[#DC2626] mx-auto" />
                <p className="font-semibold text-[#991B1B]">{metaError}</p>
                <button
                  onClick={() => {
                    lastActiveDatasetIdRef.current = null;
                    setIsLoadingMetadata(true);
                  }}
                  className="inline-flex items-center space-x-1.5 bg-[#2563EB] text-white text-xs font-medium px-3.5 py-2 rounded-md hover:bg-[#1D4ED8] transition-colors touch-manipulation min-h-[38px]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Loading</span>
                </button>
              </div>
            ) : isGeneratingChart ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-2">
                <Loader2 className="w-7 h-7 text-[#2563EB] animate-spin" />
                <span className="text-xs text-[#64748B]">Generating chart data...</span>
              </div>
            ) : chartError ? (
              <div className="p-6 text-center text-xs max-w-md space-y-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl">
                <AlertCircle className="w-7 h-7 text-[#DC2626] mx-auto" />
                <div>
                  <p className="font-semibold text-[#991B1B]">Unable to Render Visualization</p>
                  <p className="text-[#7F1D1D] mt-1 text-[11px]">{chartError}</p>
                </div>
                <button
                  onClick={() => executeGenerate({
                    type: selectedChartType,
                    x: xColumn,
                    y: yColumn,
                    group: groupBy,
                    agg: aggregation,
                    binCount: bins,
                    multiCols: selectedColumns
                  })}
                  className="inline-flex items-center space-x-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-medium px-3.5 py-2 rounded-md transition-colors touch-manipulation min-h-[38px]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            ) : plotlyData.length > 0 ? (
              <div className="w-full h-[300px] xs:h-[340px] sm:h-[400px] md:h-[460px] min-w-0 overflow-hidden">
                <PlotlyChart
                  data={plotlyData as any}
                  layout={plotlyLayout as any}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            ) : (
              <div className="text-center py-16 text-[#64748B] text-xs space-y-2">
                <FileSpreadsheet className="w-8 h-8 text-[#CBD5E1] mx-auto" />
                <p>Select columns from the controls on the left and click <strong>Render Plot</strong>.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
