from pathlib import Path
from html import escape
import json
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether,
)
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'docs/rules/bardo-informe-2026-10-23.md'
OUTPUT = ROOT / 'output/pdf/bardo-informe-2026-10-23.pdf'
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

FONT_DIR = Path('C:/Windows/Fonts')
for name, file in [
    ('Body', 'segoeui.ttf'), ('Body-Bold', 'segoeuib.ttf'),
    ('Body-Italic', 'segoeuii.ttf'), ('Body-BoldItalic', 'segoeuiz.ttf'),
    ('Display', 'georgia.ttf'), ('Display-Bold', 'georgiab.ttf'),
]:
    pdfmetrics.registerFont(TTFont(name, str(FONT_DIR / file)))
pdfmetrics.registerFontFamily('Body', normal='Body', bold='Body-Bold', italic='Body-Italic', boldItalic='Body-BoldItalic')

PAGE_W, PAGE_H = A4
MARGIN_X = 52
TEXT_W = PAGE_W - 2 * MARGIN_X
styles = {
    'title': ParagraphStyle('ReportTitle', fontName='Display-Bold', fontSize=25, leading=30, textColor=colors.black, spaceAfter=10),
    'subtitle': ParagraphStyle('ReportSubtitle', fontName='Body', fontSize=12, leading=17, textColor=colors.HexColor('#343a40'), spaceAfter=7),
    'meta': ParagraphStyle('ReportMeta', fontName='Body', fontSize=9, leading=13, textColor=colors.HexColor('#5a6168'), spaceAfter=18),
    'section': ParagraphStyle('ReportSection', fontName='Display-Bold', fontSize=17, leading=22, textColor=colors.black, spaceAfter=13, keepWithNext=True),
    'subhead': ParagraphStyle('ReportSubhead', fontName='Body-Bold', fontSize=11.1, leading=15, textColor=colors.black, spaceBefore=10, spaceAfter=5, keepWithNext=True),
    'body': ParagraphStyle('ReportBody', fontName='Body', fontSize=10.1, leading=14.2, textColor=colors.HexColor('#20252a'), spaceAfter=8.5, splitLongWords=True, allowWidows=0, allowOrphans=0),
    'table': ParagraphStyle('ReportCell', fontName='Body', fontSize=8.8, leading=12.2, textColor=colors.HexColor('#20252a'), spaceAfter=0, splitLongWords=True),
    'tablehead': ParagraphStyle('ReportCellHeader', fontName='Body-Bold', fontSize=8.8, leading=12.2, textColor=colors.black, spaceAfter=0),
    'url': ParagraphStyle('ReportURL', fontName='Body', fontSize=8.7, leading=12.5, textColor=colors.HexColor('#234c69'), spaceAfter=10, splitLongWords=True),
}


def markup(text):
    value = escape(text)
    value = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', value)
    return value


class ReportDoc(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name == 'ReportSection':
            label = flowable.getPlainText()
            key = 'section-' + re.sub(r'[^a-zA-Z0-9]+', '-', label)
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(label, key, level=0, closed=False)


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('Body', 8)
    canvas.setFillColor(colors.HexColor('#61676d'))
    canvas.drawString(MARGIN_X, 30, 'NOMA  |  Exploración del Bardo  |  23 octubre 2026')
    canvas.drawRightString(PAGE_W - MARGIN_X, 30, str(doc.page))
    canvas.restoreState()


def make_table(lines):
    rows = []
    for line in lines:
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if all(re.fullmatch(r':?-+:?', c) for c in cells):
            continue
        rows.append(cells)
    count = len(rows[0])
    widths = ([112, TEXT_W - 112] if count == 2 else [91, 142, TEXT_W - 279, 46])
    data = [[Paragraph(markup(cell), styles['tablehead' if i == 0 else 'table']) for cell in row] for i, row in enumerate(rows)]
    table = Table(data, colWidths=widths, hAlign='LEFT', repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e5e9ec')),
        ('GRID', (0, 0), (-1, -1), .45, colors.HexColor('#d9d9d9')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f6f7f8')]),
    ]))
    return [table, Spacer(1, 12)]


source = SOURCE.read_text(encoding='utf-8')
lines = source.splitlines()
story = []
i = 0
front_count = 0
while i < len(lines):
    line = lines[i].strip()
    if not line:
        i += 1
        continue
    if line == '<!-- page -->':
        story.append(PageBreak())
        i += 1
        continue
    if line.startswith('|'):
        tlines = []
        while i < len(lines) and lines[i].strip().startswith('|'):
            tlines.append(lines[i])
            i += 1
        story.extend(make_table(tlines))
        continue
    if line.startswith('# '):
        story.append(Paragraph(markup(line[2:]), styles['title']))
        i += 1
        continue
    if line.startswith('## '):
        story.append(Paragraph(markup(line[3:]), styles['section']))
        i += 1
        continue
    if line.startswith('### '):
        story.append(Paragraph(markup(line[4:]), styles['subhead']))
        i += 1
        continue
    paragraph = [line]
    i += 1
    while i < len(lines) and lines[i].strip() and not lines[i].lstrip().startswith(('#', '|', '<!--')):
        paragraph.append(lines[i].strip())
        i += 1
    text = ' '.join(paragraph)
    if front_count < 2:
        style = styles['subtitle' if front_count == 0 else 'meta']
        front_count += 1
        story.append(Paragraph(markup(text), style))
    elif text.startswith('https://'):
        story.append(Paragraph(f'<link href="{escape(text, quote=True)}">{escape(text)}</link>', styles['url']))
    else:
        story.append(Paragraph(markup(text), styles['body']))

doc = ReportDoc(
    str(OUTPUT), pagesize=A4, rightMargin=MARGIN_X, leftMargin=MARGIN_X,
    topMargin=45, bottomMargin=50,
    title='El Bardo de NOMA', author='Codex', subject='Informe de exploración y decisión de clase',
    creator='NOMA - Diseño de reglas',
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
reader = PdfReader(str(OUTPUT))
meta = {
    'output': str(OUTPUT), 'pages': len(reader.pages),
    'source_words': len(source.split()),
    'pages_text': [{'page': n + 1, 'characters': len(p.extract_text() or ''), 'start': (p.extract_text() or '')[:130]} for n, p in enumerate(reader.pages)],
}
(Path(__file__).parent / 'verificacion-pdf.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(meta, ensure_ascii=False, indent=2))
