import pandas as pd
import numpy as np
import io
from app.analytics.visualization import generate_chart_payload, recommend_charts

def run_tests():
    print("=== Testing generate_chart_payload & recommend_charts ===")
    
    # Create test dataset with missing values, strings, dates, and numbers
    df = pd.DataFrame({
        "category": ["A", "B", "A", "C", "B", None, "A", "C"],
        "region": ["North", "South", "East", "West", "North", "South", "East", "West"],
        "sales": [100.5, 200.0, None, 450.75, 120.0, 300.0, 250.0, 500.0],
        "profit": [20.5, 50.0, 10.0, 90.0, -15.0, 60.0, 45.0, 110.0],
        "units": [5, 10, 2, 25, 6, 12, 11, 20],
        "order_date": ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08"]
    })

    # 1. Bar Vertical (single & with metric)
    res = generate_chart_payload(df, "bar_vertical", x_column="category")
    assert res["chart_type"] == "bar_vertical"
    assert len(res["categories"]) > 0
    assert len(res["series"][0]["data"]) == len(res["categories"])
    print("[OK] Bar Vertical (Count) passed")

    res = generate_chart_payload(df, "bar_vertical", x_column="category", y_column="sales", aggregation="mean")
    assert res["chart_type"] == "bar_vertical"
    assert len(res["series"][0]["data"]) > 0
    print("[OK] Bar Vertical (Aggregated) passed")

    res = generate_chart_payload(df, "bar_vertical", x_column="category", y_column="sales", group_by="region", aggregation="sum")
    assert res["chart_type"] == "bar_vertical"
    assert len(res["series"]) > 0
    print("[OK] Bar Vertical (Grouped) passed")

    # 2. Bar Horizontal
    res = generate_chart_payload(df, "bar_horizontal", x_column="category", y_column="sales", aggregation="sum")
    assert res["chart_type"] == "bar_horizontal"
    assert len(res["categories"]) > 0
    print("[OK] Bar Horizontal passed")

    # 3. Line Chart
    res = generate_chart_payload(df, "line", x_column="order_date", y_column="sales", aggregation="sum")
    assert res["chart_type"] == "line"
    assert len(res["categories"]) > 0
    print("[OK] Line Chart passed")

    # 4. Area Chart
    res = generate_chart_payload(df, "area", x_column="order_date", y_column="profit", aggregation="mean")
    assert res["chart_type"] == "area"
    assert len(res["categories"]) > 0
    print("[OK] Area Chart passed")

    # 5. Scatter Plot
    res = generate_chart_payload(df, "scatter", x_column="sales", y_column="profit", group_by="region")
    assert res["chart_type"] == "scatter"
    assert len(res["points"]) > 0
    for pt in res["points"]:
        assert "x" in pt and "y" in pt and "category" in pt
    print("[OK] Scatter Plot passed")

    # 6. Histogram
    res = generate_chart_payload(df, "histogram", x_column="sales", bins=5)
    assert res["chart_type"] == "histogram"
    assert len(res["bins"]) == 5
    print("[OK] Histogram passed")

    # 7. Box Plot (single and grouped)
    res = generate_chart_payload(df, "box", x_column="sales")
    assert res["chart_type"] == "box"
    assert res["min"] is not None and res["max"] is not None
    assert len(res["raw_data"]) > 0
    print("[OK] Box Plot (Single) passed")

    res = generate_chart_payload(df, "box", x_column="sales", group_by="region")
    assert res["chart_type"] == "box"
    assert len(res["raw_data"]) > 0
    print("[OK] Box Plot (Grouped) passed")

    # 8. Heatmap
    res = generate_chart_payload(df, "heatmap", selected_columns=["sales", "profit", "units"])
    assert res["chart_type"] == "heatmap"
    assert len(res["z_matrix"]) == 3
    assert len(res["z_matrix"][0]) == 3
    print("[OK] Heatmap passed")

    # 9. Pie Chart
    res = generate_chart_payload(df, "pie", x_column="region", y_column="sales", aggregation="sum")
    assert res["chart_type"] == "pie"
    assert len(res["labels"]) > 0
    assert len(res["values"]) == len(res["labels"])
    print("[OK] Pie Chart passed")

    # 10. Donut Chart
    res = generate_chart_payload(df, "donut", x_column="category")
    assert res["chart_type"] == "donut"
    assert res["is_donut"] is True
    assert len(res["labels"]) > 0
    print("[OK] Donut Chart passed")

    # Recommendations
    recs = recommend_charts(df)
    assert len(recs) > 0
    print(f"[OK] Recommendations passed ({len(recs)} recommendations generated):")
    for r in recs:
        print(f"    - [{r['chart_type']}] {r['title']}")

    print("\nALL 10 CHART TYPES AND RECOMMENDATIONS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
