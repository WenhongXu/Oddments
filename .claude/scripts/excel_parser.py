"""
Excel Business Report Parser
Parses complex Excel reports with merged cells, multi-level headers,
hierarchical row structures, and summary rows.
"""

import sys
import json
import re
import argparse
from pathlib import Path

try:
    import openpyxl
    from openpyxl.utils import get_column_letter, column_index_from_string
except ImportError:
    print("ERROR: openpyxl not installed. Run: pip install openpyxl pandas", file=sys.stderr)
    sys.exit(1)

try:
    import pandas as pd
except ImportError:
    pd = None


# ─────────────────────────────────────────────
# Core parser
# ─────────────────────────────────────────────

def get_merged_value(ws, row, col):
    """Return the top-left cell value for any cell that may be part of a merge."""
    cell = ws.cell(row=row, column=col)
    for merged_range in ws.merged_cells.ranges:
        if (merged_range.min_row <= row <= merged_range.max_row and
                merged_range.min_col <= col <= merged_range.max_col):
            return ws.cell(row=merged_range.min_row, column=merged_range.min_col).value
    return cell.value


def is_merged_owner(ws, row, col):
    """True if this cell is the top-left owner of a merge range."""
    for merged_range in ws.merged_cells.ranges:
        if merged_range.min_row == row and merged_range.min_col == col:
            return True, merged_range.max_row, merged_range.max_col
    return False, row, col


def cell_span(ws, row, col):
    """Return (rowspan, colspan) for a cell."""
    for merged_range in ws.merged_cells.ranges:
        if merged_range.min_row == row and merged_range.min_col == col:
            return (merged_range.max_row - merged_range.min_row + 1,
                    merged_range.max_col - merged_range.min_col + 1)
    return (1, 1)


def row_values(ws, row, max_col):
    """Get all effective cell values in a row (respecting merges)."""
    return [get_merged_value(ws, row, c) for c in range(1, max_col + 1)]


def is_title_row(ws, row, max_col):
    """Heuristic: a title row is typically a single merged cell spanning most columns."""
    for merged_range in ws.merged_cells.ranges:
        if (merged_range.min_row == row and
                merged_range.max_col - merged_range.min_col + 1 >= max_col * 0.6):
            val = ws.cell(row=row, column=merged_range.min_col).value
            if val and isinstance(val, str) and len(val.strip()) > 0:
                return True
    return False


def is_empty_row(ws, row, max_col):
    """True if all cells in the row are empty."""
    return all(get_merged_value(ws, row, c) in (None, '') for c in range(1, max_col + 1))


def looks_like_header_cell(val):
    """Heuristic: header cells are usually short strings, not numbers."""
    if val is None:
        return False
    if isinstance(val, (int, float)):
        return False
    s = str(val).strip()
    return len(s) > 0 and len(s) < 40


def detect_structure(ws):
    """
    Returns:
        title_rows   : list of row indices (1-based) that are titles
        header_rows  : list of row indices for column headers
        data_start   : first data row index
        max_col      : last column with data
    """
    max_row = ws.max_row
    max_col = ws.max_column

    # Trim trailing empty rows / cols
    while max_row > 1 and is_empty_row(ws, max_row, max_col):
        max_row -= 1
    while max_col > 1 and all(
            get_merged_value(ws, r, max_col) in (None, '') for r in range(1, max_row + 1)):
        max_col -= 1

    title_rows = []
    header_rows = []
    data_start = 1

    for r in range(1, max_row + 1):
        if is_empty_row(ws, r, max_col):
            continue
        if is_title_row(ws, r, max_col):
            title_rows.append(r)
            continue
        vals = row_values(ws, r, max_col)
        non_empty = [v for v in vals if v not in (None, '')]
        # A header row has mostly string values and no obvious numeric data
        has_numbers = any(isinstance(v, (int, float)) for v in non_empty)
        all_strings = all(looks_like_header_cell(v) for v in non_empty)
        if all_strings and not has_numbers and len(non_empty) > 0:
            header_rows.append(r)
        else:
            data_start = r
            break

    return title_rows, header_rows, data_start, max_row, max_col


def build_column_headers(ws, header_rows, max_col):
    """
    Build a list of column header labels by flattening multi-level headers.
    Returns list of strings, one per column (1..max_col).
    """
    if not header_rows:
        return [str(c) for c in range(1, max_col + 1)]

    levels = []
    for r in header_rows:
        row_labels = []
        for c in range(1, max_col + 1):
            row_labels.append(get_merged_value(ws, r, c))
        levels.append(row_labels)

    # Propagate None horizontally (merged cells) in each level
    for level in levels:
        last = None
        for i, v in enumerate(level):
            if v is not None and v != '':
                last = v
            elif last is not None:
                level[i] = last

    # Combine levels into compound labels
    col_headers = []
    for c_idx in range(max_col):
        parts = []
        prev = None
        for level in levels:
            v = level[c_idx]
            if v and v != prev:
                parts.append(str(v).strip())
                prev = v
        col_headers.append(' / '.join(parts) if parts else str(c_idx + 1))

    return col_headers


HIER_KEYWORDS = re.compile(r'^(其中|其他|合计|小计|汇总|总计|of which|total|subtotal)', re.IGNORECASE)


def detect_row_hierarchy(first_col_values):
    """
    Analyse the first column to infer row hierarchy.
    Returns list of dicts: {value, level, is_summary}
    Level 0 = top, 1 = child ("其中..."), etc.
    """
    result = []
    for val in first_col_values:
        s = str(val).strip() if val not in (None, '') else ''
        is_summary = bool(HIER_KEYWORDS.match(s)) or ('合计' in s) or ('汇总' in s)
        # Estimate indent level by leading spaces or "其中" prefix
        leading_spaces = len(s) - len(s.lstrip())
        level = leading_spaces // 2
        if s.startswith('其中'):
            level = max(level, 1)
        result.append({'value': s, 'level': level, 'is_summary': is_summary})
    return result


def parse_sheet(ws):
    """Parse a single worksheet and return a structured dict."""
    title_rows, header_rows, data_start, max_row, max_col = detect_structure(ws)

    titles = [ws.cell(row=r, column=1).value or get_merged_value(ws, r, 1)
              for r in title_rows]
    col_headers = build_column_headers(ws, header_rows, max_col)

    rows = []
    for r in range(data_start, max_row + 1):
        if is_empty_row(ws, r, max_col):
            continue
        vals = row_values(ws, r, max_col)
        row_dict = {col_headers[i]: vals[i] for i in range(max_col)}
        rows.append(row_dict)

    first_col_vals = [r.get(col_headers[0]) for r in rows]
    hierarchy = detect_row_hierarchy(first_col_vals)
    for i, meta in enumerate(hierarchy):
        rows[i]['_level'] = meta['level']
        rows[i]['_is_summary'] = meta['is_summary']

    return {
        'sheet_name': ws.title,
        'titles': titles,
        'col_headers': col_headers,
        'rows': rows,
        'shape': (len(rows), max_col),
    }


def parse_workbook(file_path):
    """Parse all sheets in a workbook."""
    wb = openpyxl.load_workbook(file_path, data_only=True)
    sheets = {}
    for name in wb.sheetnames:
        ws = wb[name]
        if ws.max_row and ws.max_column:
            sheets[name] = parse_sheet(ws)
    wb.close()
    return sheets


# ─────────────────────────────────────────────
# Comparison logic
# ─────────────────────────────────────────────

def _to_float(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def compare_sheets(sheet_a, sheet_b, key_col=None):
    """
    Compare two parsed sheets (same format, different periods).
    Returns a list of change records.
    """
    if key_col is None:
        key_col = sheet_a['col_headers'][0]

    # Index rows by key column
    def index_rows(rows):
        idx = {}
        for row in rows:
            k = str(row.get(key_col, '')).strip()
            if k:
                idx[k] = row
        return idx

    idx_a = index_rows(sheet_a['rows'])
    idx_b = index_rows(sheet_b['rows'])

    numeric_cols = []
    for hdr in sheet_a['col_headers'][1:]:
        vals = [_to_float(r.get(hdr)) for r in sheet_a['rows'] if r.get(hdr) is not None]
        if any(v is not None for v in vals):
            numeric_cols.append(hdr)

    changes = []
    all_keys = list(dict.fromkeys(list(idx_a.keys()) + list(idx_b.keys())))
    for key in all_keys:
        row_a = idx_a.get(key)
        row_b = idx_b.get(key)
        for col in numeric_cols:
            v_a = _to_float(row_a.get(col)) if row_a else None
            v_b = _to_float(row_b.get(col)) if row_b else None
            if v_a is None and v_b is None:
                continue
            abs_change = (v_b or 0) - (v_a or 0)
            pct_change = (abs_change / abs(v_a) * 100) if v_a else None
            changes.append({
                'key': key,
                'column': col,
                'value_a': v_a,
                'value_b': v_b,
                'abs_change': abs_change,
                'pct_change': pct_change,
            })

    # Sort by absolute change magnitude
    changes.sort(key=lambda x: abs(x['abs_change']), reverse=True)
    return changes


def top_changes(changes, n=10):
    return changes[:n]


def distribution_summary(sheet, numeric_col):
    """Basic distribution stats for a numeric column."""
    vals = [_to_float(r.get(numeric_col))
            for r in sheet['rows']
            if _to_float(r.get(numeric_col)) is not None
            and not r.get('_is_summary')]
    if not vals:
        return {}
    total = sum(vals)
    return {
        'column': numeric_col,
        'count': len(vals),
        'total': total,
        'mean': total / len(vals),
        'max': max(vals),
        'min': min(vals),
    }


# ─────────────────────────────────────────────
# Formatted text output for LLM consumption
# ─────────────────────────────────────────────

def _fmt(v, decimals=2):
    if v is None:
        return '-'
    if isinstance(v, float):
        return f'{v:,.{decimals}f}'
    return str(v)


def sheet_to_markdown(sheet, max_rows=200):
    """Convert parsed sheet to a markdown table."""
    headers = sheet['col_headers']
    lines = []
    if sheet['titles']:
        lines.append('**' + ' / '.join(str(t) for t in sheet['titles'] if t) + '**\n')
    # Header row
    lines.append('| ' + ' | '.join(str(h) for h in headers) + ' |')
    lines.append('|' + '|'.join(['---'] * len(headers)) + '|')
    for i, row in enumerate(sheet['rows'][:max_rows]):
        cells = [_fmt(row.get(h)) for h in headers]
        indent = '  ' * row.get('_level', 0)
        cells[0] = indent + cells[0]
        lines.append('| ' + ' | '.join(cells) + ' |')
    if len(sheet['rows']) > max_rows:
        lines.append(f'_... {len(sheet["rows"]) - max_rows} more rows omitted ..._')
    return '\n'.join(lines)


def changes_to_text(changes, n=10, period_a='期初', period_b='期末'):
    """Format top N changes as readable text."""
    top = changes[:n]
    if not top:
        return '未发现明显变化。'
    lines = [f'变动最大的前 {len(top)} 项（按绝对变动排序）：\n']
    for i, c in enumerate(top, 1):
        pct = f'({c["pct_change"]:+.1f}%)' if c['pct_change'] is not None else ''
        lines.append(
            f'{i}. **{c["key"]}** — {c["column"]}：'
            f'{period_a} {_fmt(c["value_a"])} → {period_b} {_fmt(c["value_b"])}，'
            f'变动 {_fmt(c["abs_change"])} {pct}'
        )
    return '\n'.join(lines)


# ─────────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Excel Business Report Parser')
    parser.add_argument('files', nargs='+', help='Excel file path(s). 1=single analysis, 2=comparison.')
    parser.add_argument('--sheet', default=None, help='Sheet name to analyse (default: first sheet).')
    parser.add_argument('--key-col', default=None, help='Column name to use as row key for comparison.')
    parser.add_argument('--top', type=int, default=10, help='Number of top changes to show.')
    parser.add_argument('--output', choices=['json', 'text', 'markdown'], default='markdown')
    parser.add_argument('--period-a', default='期初', help='Label for first file period.')
    parser.add_argument('--period-b', default='期末', help='Label for second file period.')
    parser.add_argument('--max-rows', type=int, default=200, help='Max data rows to include in markdown output.')
    args = parser.parse_args()

    results = {}

    if len(args.files) == 1:
        # Single file analysis
        path = args.files[0]
        sheets = parse_workbook(path)
        sheet_name = args.sheet or list(sheets.keys())[0]
        sheet = sheets[sheet_name]
        results['mode'] = 'single'
        results['file'] = path
        results['sheet'] = sheet_name
        results['titles'] = sheet['titles']
        results['col_headers'] = sheet['col_headers']
        results['row_count'] = len(sheet['rows'])
        results['shape'] = sheet['shape']

        # Distribution for all numeric columns
        distributions = {}
        for col in sheet['col_headers'][1:]:
            dist = distribution_summary(sheet, col)
            if dist:
                distributions[col] = dist
        results['distributions'] = distributions

        if args.output == 'json':
            results['rows'] = sheet['rows']
            print(json.dumps(results, ensure_ascii=False, indent=2, default=str))
        elif args.output == 'markdown':
            print(f'# 报表解析结果\n')
            print(f'文件：`{path}`  表单：`{sheet_name}`\n')
            print(sheet_to_markdown(sheet, max_rows=args.max_rows))
            print('\n## 数值列分布\n')
            for col, dist in distributions.items():
                print(f'**{col}**：合计 {_fmt(dist["total"])}，均值 {_fmt(dist["mean"])}，'
                      f'最大 {_fmt(dist["max"])}，最小 {_fmt(dist["min"])}，行数 {dist["count"]}')
        else:
            print(f'报表：{path}  表单：{sheet_name}')
            print(f'共 {results["row_count"]} 行数据，列：{", ".join(sheet["col_headers"])}')

    elif len(args.files) == 2:
        # Comparison mode
        path_a, path_b = args.files
        sheets_a = parse_workbook(path_a)
        sheets_b = parse_workbook(path_b)
        sheet_name = args.sheet or list(sheets_a.keys())[0]
        sheet_a = sheets_a[sheet_name]
        sheet_b = sheets_b.get(sheet_name, list(sheets_b.values())[0])

        changes = compare_sheets(sheet_a, sheet_b, key_col=args.key_col)
        top = top_changes(changes, n=args.top)

        results['mode'] = 'comparison'
        results['file_a'] = path_a
        results['file_b'] = path_b
        results['sheet'] = sheet_name
        results['total_changes'] = len(changes)
        results['top_changes'] = top

        if args.output == 'json':
            results['all_changes'] = changes
            print(json.dumps(results, ensure_ascii=False, indent=2, default=str))
        elif args.output == 'markdown':
            print(f'# 对比分析报告\n')
            print(f'- **{args.period_a}**：`{path_a}`\n- **{args.period_b}**：`{path_b}`\n')
            print(f'## {args.period_a} 数据\n')
            print(sheet_to_markdown(sheet_a, max_rows=args.max_rows))
            print(f'\n## {args.period_b} 数据\n')
            print(sheet_to_markdown(sheet_b, max_rows=args.max_rows))
            print(f'\n## 变动分析\n')
            print(changes_to_text(top, n=args.top, period_a=args.period_a, period_b=args.period_b))
        else:
            print(changes_to_text(top, n=args.top, period_a=args.period_a, period_b=args.period_b))
    else:
        print('ERROR: Provide 1 or 2 Excel files.', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
