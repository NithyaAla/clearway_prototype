"""Generates the sample supplier invoices in public/samples/.

Optional dev tool: the PNGs are already included, so you only need this
if you want to change the invoices. Requires Pillow (pip install pillow).
Run from the project root:  python3 scripts/make_invoices.py
"""
from PIL import Image, ImageDraw, ImageFont
import os

CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def gstin(base14: str) -> str:
    """Append the GSTIN check character (mod-36 Luhn variant)."""
    total = 0
    for i, c in enumerate(base14):
        v = CHARS.index(c) * (1 if i % 2 == 0 else 2)
        total += v // 36 + v % 36
    return base14 + CHARS[(36 - total % 36) % 36]


FONT_DIR = "C:/Windows/Fonts/"


def font(size, bold=False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    try:
        return ImageFont.truetype(os.path.join(FONT_DIR, name), size)
    except OSError:
        return ImageFont.load_default()


def inr(n):
    s = f"{n:,.2f}"
    # Indian digit grouping
    whole, dec = s.replace(",", "").split(".")
    if len(whole) > 3:
        head, tail = whole[:-3], whole[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        whole = ",".join(parts) + "," + tail
    return f"Rs. {whole}.{dec}"


MERCHANTS = {
    "genz": ("GenZ Couture Pvt Ltd", "14 Johari Bazaar, Jaipur, Rajasthan 302003", gstin("08AAKCG2468L1Z")),
    "glow": ("Glow & Co. Gifting  LLP", "7 FC Road, Shivajinagar, Pune, Maharashtra 411005", gstin("27AAJFG1122H1Z")),
    "tickettrail": ("TicketTrail Events Pvt Ltd", "201 Indiranagar 100 Ft Rd, Bengaluru, Karnataka 560038", gstin("29AAHCT8642R1Z")),
}

INVOICES = [
    dict(file="genz-rangrez-textiles.png", merchant="genz",
         supplier=("Rangrez Textiles Pvt Ltd", "Plot 22, Sanganer Industrial Area, Jaipur, Rajasthan 302029"),
         supplier_gstin=gstin("08AAFCR5678M1Z"), no="RT/2026-27/0417", date="02-10-2026",
         items=[("Cotton kurta sets (S-XXL)", "6204", 3000, 620), ("Printed dupattas", "6214", 2500, 210),
                ("Anarkali dresses", "6204", 1700, 890)], tax=("CGST 2.5% + SGST 2.5%", 0.05)),
    dict(file="genz-neel-weaves-flawed.png", merchant="genz",
         supplier=("Neel Weaves Pvt Ltd", "Ring Road Textile Market, Surat, Gujarat 395002"),
         supplier_gstin=gstin("24AAGCN4321Q1Z"), no="NW/0988", date="28-09-2026",
         items=[("Silk blend sarees", "5407", 2000, 1150), ("Kurta fabric bundles", "5208", 3000, 340)],
         tax=("IGST 5%", 0.05)),
    dict(file="glow-kesar-crafts.png", merchant="glow",
         supplier=("Kesar Crafts & Packaging LLP", "Bhosari MIDC, Pune, Maharashtra 411026"),
         supplier_gstin=gstin("27AACFK1357N1Z"), no="KC-26-1132", date="25-09-2026",
         items=[("Diwali hamper boxes (assorted)", "4819", 2500, 540), ("Brass diya sets", "7418", 1200, 380),
                ("Scented candle gift packs", "3406", 800, 260)], tax=("CGST 9% + SGST 9%", 0.18)),
    # Deliberate flaw: one character of the GSTIN is mistyped, so the check digit fails.
    dict(file="glow-shubh-hampers-flawed.png", merchant="glow",
         supplier=("Shubh Hampers Pvt Ltd", "Hadapsar Industrial Estate, Pune, Maharashtra 411013"),
         supplier_gstin="27AABCS9758P1Z" + gstin("27AABCS9753P1Z")[-1], no="SH/26/377", date="30-09-2026",
         items=[("Premium dry fruit hampers", "2008", 2200, 690), ("Festive gift boxes", "4819", 2000, 310)],
         tax=("CGST 9% + SGST 9%", 0.18)),
    dict(file="tickettrail-palace-grounds.png", merchant="tickettrail",
         supplier=("Palace Grounds Venue Management Pvt Ltd", "Jayamahal Main Rd, Bengaluru, Karnataka 560006"),
         supplier_gstin=gstin("29AADCP7531K1Z"), no="PGV/EVT/2026/212", date="05-10-2026",
         items=[("Venue hire, Indie Fest 2027, 14-15 Feb 2027 (capacity 12,000)", "9972", 1, 2800000),
                ("Stage, sound and lighting package", "9983", 1, 950000)], tax=("CGST 9% + SGST 9%", 0.18)),
    dict(file="tickettrail-skyline-arena-flawed.png", merchant="tickettrail",
         supplier=("Skyline Arena LLP", "Whitefield Main Rd, Bengaluru, Karnataka 560066"),
         supplier_gstin=gstin("29AAEFS8642T1Z"), no="SA/0091", date="03-10-2026",
         items=[("Venue hire, Indie Fest 2027, 14-15 Feb 2027 (capacity 1,800)", "9972", 1, 1100000)],
         tax=("CGST 9% + SGST 9%", 0.18)),
]


def draw_invoice(inv):
    W, H = 1240, 1754
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    ink, quiet, rule = (25, 30, 40), (95, 100, 110), (200, 204, 210)
    m = 80
    sname, saddr = inv["supplier"]
    bname, baddr, bgst = MERCHANTS[inv["merchant"]]

    d.text((m, 70), sname, font=font(34, True), fill=ink)
    d.text((m, 118), saddr, font=font(20), fill=quiet)
    d.text((m, 148), f"GSTIN: {inv['supplier_gstin']}", font=font(22, True), fill=ink)
    d.text((W - m, 28), "TAX INVOICE", font=font(24, True), fill=quiet, anchor="ra")
    d.text((W - m, 122), f"Invoice No: {inv['no']}", font=font(21), fill=ink, anchor="ra")
    d.text((W - m, 152), f"Invoice Date: {inv['date']}", font=font(21), fill=ink, anchor="ra")
    d.line((m, 200, W - m, 200), fill=rule, width=2)

    d.text((m, 225), "Bill to", font=font(19, True), fill=quiet)
    d.text((m, 252), bname, font=font(25, True), fill=ink)
    d.text((m, 288), baddr, font=font(20), fill=quiet)
    d.text((m, 318), f"GSTIN: {bgst}", font=font(21), fill=ink)

    y = 390
    cols = [m, 150, 640, 770, 880, W - m]
    d.rectangle((m, y, W - m, y + 46), fill=(240, 242, 245))
    heads = ["#", "Description", "HSN/SAC", "Qty", "Rate", "Amount (Rs.)"]
    for i, h in enumerate(heads):
        x = cols[i] + 12 if i < 2 else cols[i] + 8
        if i == 5:
            d.text((W - m - 12, y + 12), h, font=font(19, True), fill=ink, anchor="ra")
        else:
            d.text((x, y + 12), h, font=font(19, True), fill=ink)
    y += 46
    taxable = 0
    for n, (desc, hsn, qty, rate) in enumerate(inv["items"], 1):
        amt = qty * rate
        taxable += amt
        lines = [desc]
        if len(desc) > 38:
            cut = desc.rfind(" ", 0, 38)
            lines = [desc[:cut], desc[cut + 1:]]
        h = 30 * len(lines) + 24
        d.text((m + 12, y + 14), str(n), font=font(20), fill=ink)
        for k, ln in enumerate(lines):
            d.text((cols[1] + 12, y + 14 + 30 * k), ln, font=font(20), fill=ink)
        d.text((cols[2] + 8, y + 14), hsn, font=font(20), fill=ink)
        d.text((cols[3] + 8, y + 14), f"{qty:,}", font=font(20), fill=ink)
        d.text((cols[4] + 8, y + 14), f"{rate:,}", font=font(20), fill=ink)
        d.text((W - m - 12, y + 14), inr(amt)[4:], font=font(20), fill=ink, anchor="ra")
        y += h
        d.line((m, y, W - m, y), fill=rule, width=1)

    tax_label, rate = inv["tax"]
    gst = round(taxable * rate, 2)
    y += 30
    for label, val, bold in [("Taxable value", taxable, False), (tax_label, gst, False), ("Total (INR)", taxable + gst, True)]:
        d.text((600, y), label, font=font(22, bold), fill=ink)
        d.text((W - m - 12, y), inr(val), font=font(22, bold), fill=ink, anchor="ra")
        y += 40
    d.line((m, y + 20, W - m, y + 20), fill=rule, width=2)
    d.text((m, y + 50), "Payment terms: 30 days from invoice date. Goods once sold will not be taken back.", font=font(18), fill=quiet)
    d.text((W - m, H - 160), f"For {sname}", font=font(20), fill=ink, anchor="ra")
    d.text((W - m, H - 100), "Authorised Signatory", font=font(20, True), fill=ink, anchor="ra")
    d.text((m, H - 60), "Sample document generated for the ClearWay concept prototype. Not a real invoice.", font=font(16), fill=quiet)
    out = os.path.join("public", "samples", inv["file"])
    img.save(out, optimize=True)
    return out, inv["supplier_gstin"], taxable + gst


if __name__ == "__main__":
    os.makedirs(os.path.join("public", "samples"), exist_ok=True)
    for name, (_, _, g) in MERCHANTS.items():
        print("merchant", name, g)
    for inv in INVOICES:
        print(draw_invoice(inv))
