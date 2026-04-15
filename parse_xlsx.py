import openpyxl
import html

# Путь к файлу Excel
xlsx_path = 'orders2026.xlsx'

wb = openpyxl.load_workbook(xlsx_path)
ws = wb.active

rows = list(ws.iter_rows(values_only=True))
headers = rows[0]
data = rows[1:]

# Формируем HTML-таблицу
html_rows = []
html_rows.append('<table border="1" style="border-collapse:collapse;width:100%">')
html_rows.append('<thead><tr>' + ''.join(f'<th>{html.escape(str(h))}</th>' for h in headers) + '</tr></thead>')
html_rows.append('<tbody>')
for row in data:
    html_rows.append('<tr>' + ''.join(f'<td>{html.escape(str(cell)) if cell is not None else ""}</td>' for cell in row) + '</tr>')
html_rows.append('</tbody></table>')

with open('parse_xlsx_temp.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(html_rows))
