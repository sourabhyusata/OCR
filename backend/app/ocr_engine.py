import re
import pytesseract
from PIL import Image
from pdf2image import convert_from_bytes
from io import BytesIO

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()  # Enables Pillow to open HEIC/HEIF files
except ImportError:
    pass


def extract_text_from_image(image_bytes: bytes) -> str:
    image = Image.open(BytesIO(image_bytes))
    # Use both Hindi and English for OCR to support Indian weighbridge tickets
    text = pytesseract.image_to_string(image, lang="hin+eng")
    return text


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    images = convert_from_bytes(pdf_bytes)
    texts = []
    for img in images:
        texts.append(pytesseract.image_to_string(img, lang="hin+eng"))
    return "\n".join(texts)


def parse_ticket_fields(raw_text: str) -> dict:
    """Parse OCR text and extract structured fields using pattern matching.
    Supports both English and Hindi (Devanagari) field labels for Indian weighbridge tickets.
    """
    fields = {
        "vehicle_number": None,
        "driver_name": None,
        "material_type": None,
        "gross_weight": None,
        "tare_weight": None,
        "net_weight": None,
        "ticket_number": None,
        "date_on_ticket": None,
        "source_location": None,
        "destination": None,
    }

    text_upper = raw_text.upper()

    # Vehicle number patterns (Indian: XX00XX0000, general alphanumeric plates)
    vehicle_patterns = [
        r"[A-Z]{2}\s*\d{1,2}\s*[A-Z]{1,3}\s*\d{4}",  # Indian format
        r"[A-Z]{2,3}\s*-?\s*\d{2,4}\s*-?\s*[A-Z]{0,3}\s*-?\s*\d{1,4}",  # General
    ]
    for pattern in vehicle_patterns:
        match = re.search(pattern, text_upper)
        if match:
            fields["vehicle_number"] = match.group().strip()
            break
    # Hindi: गाड़ी नं / वाहन नं
    if not fields["vehicle_number"]:
        match = re.search(r"(?:गाड़ी|वाहन)\s*(?:नं|नम्बर|संख्या)?\s*[:\-.\s]*([A-Z0-9\s\-]+)", raw_text, re.IGNORECASE)
        if match:
            fields["vehicle_number"] = match.group(1).strip()

    # Ticket / slip number — English
    ticket_patterns = [
        r"(?:TICKET|SLIP|TOKEN|SR|SERIAL)\s*(?:NO|NUMBER|#|\.?)[\s:.\-]*([A-Z0-9\-]+)",
        r"(?:NO|NUMBER)\s*[:.\-]\s*([A-Z0-9\-]+)",
    ]
    for pattern in ticket_patterns:
        match = re.search(pattern, text_upper)
        if match:
            fields["ticket_number"] = match.group(1).strip()
            break
    # Hindi: पर्ची नं / टोकन नं
    if not fields["ticket_number"]:
        match = re.search(r"(?:पर्ची|टोकन|क्रमांक)\s*(?:नं|नम्बर|संख्या)?\s*[:\-.\s]*(\d+)", raw_text)
        if match:
            fields["ticket_number"] = match.group(1).strip()

    # Weight extraction — English
    weight_patterns = {
        "gross_weight": [
            r"(?:GROSS|LOADED)\s*(?:WEIGHT|WT|W)?\s*[:.\-]?\s*([\d,.]+)\s*(?:KG|TON|MT|QTL)?",
        ],
        "tare_weight": [
            r"(?:TARE|EMPTY|UNLOADED|TUDI)\s*(?:WEIGHT|WT|W)?\s*[:.\-]?\s*([\d,.]+)\s*(?:KG|TON|MT|QTL)?",
        ],
        "net_weight": [
            r"(?:NET|NETT)\s*(?:WEIGHT|WT|W)?\s*[:.\-]?\s*([\d,.]+)\s*(?:KG|TON|MT|QTL)?",
        ],
    }
    for field_name, patterns in weight_patterns.items():
        for pattern in patterns:
            match = re.search(pattern, text_upper)
            if match:
                weight_str = match.group(1).replace(",", "")
                try:
                    fields[field_name] = float(weight_str)
                except ValueError:
                    pass
                break

    # Hindi weight labels: भरा वजन (gross), खाली वजन (tare), शुद्ध वजन (net)
    hindi_weight_map = {
        "gross_weight": [r"(?:भरा|भारा|लोडेड)\s*(?:वजन|भार)?\s*[:\-.\s]*(\d[\d,.]*)"],
        "tare_weight": [r"(?:खाली|तारा|tudi)\s*(?:वजन|भार)?\s*[:\-.\s]*(\d[\d,.]*)"],
        "net_weight": [r"(?:शुद्ध|नेट|शुध)\s*(?:वजन|भार)?\s*[:\-.\s]*(\d[\d,.]*)"],
    }
    for field_name, patterns in hindi_weight_map.items():
        if fields[field_name] is not None:
            continue
        for pattern in patterns:
            match = re.search(pattern, raw_text, re.IGNORECASE)
            if match:
                weight_str = match.group(1).replace(",", "")
                try:
                    fields[field_name] = float(weight_str)
                except ValueError:
                    pass
                break

    # Driver name — English
    driver_patterns = [
        r"(?:DRIVER|TRANSPORTER)\s*(?:NAME)?\s*[:.\-]\s*([A-Z][A-Z\s]+)",
    ]
    for pattern in driver_patterns:
        match = re.search(pattern, text_upper)
        if match:
            fields["driver_name"] = match.group(1).strip().title()
            break
    # Hindi: चालक / ड्राइवर
    if not fields["driver_name"]:
        match = re.search(r"(?:चालक|ड्राइवर|परिवहनकर्ता)\s*(?:नाम)?\s*[:\-.\s]*(.+)", raw_text)
        if match:
            name = match.group(1).strip()
            if name:
                fields["driver_name"] = name

    # Material type — English
    material_patterns = [
        r"(?:MATERIAL|PRODUCT|COMMODITY|ITEM|GOODS)\s*(?:TYPE|NAME|DESC)?\s*[:.\-]\s*([A-Z][A-Z\s]+)",
    ]
    for pattern in material_patterns:
        match = re.search(pattern, text_upper)
        if match:
            fields["material_type"] = match.group(1).strip().title()
            break
    # Hindi: माल / सामान / भारा का प्रकार
    if not fields["material_type"]:
        match = re.search(r"(?:माल|सामान|भारा\s*का\s*प्रकार|सामग्री)\s*[:\-.\s]*(.+)", raw_text)
        if match:
            material = match.group(1).strip()
            if material:
                fields["material_type"] = material

    # Date (works for both Hindi and English tickets — dates use digits)
    date_patterns = [
        r"\b(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})\b",
        r"\b(\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2})\b",
    ]
    for pattern in date_patterns:
        match = re.search(pattern, raw_text)
        if match:
            fields["date_on_ticket"] = match.group(1).strip()
            break
    # Hindi: तारीख
    if not fields["date_on_ticket"]:
        match = re.search(r"(?:तारीख|दिनांक)\s*[:\-.\s]*(\d{1,2}[/\-.\s]\d{1,2}[/\-.\s]\d{2,4})", raw_text)
        if match:
            fields["date_on_ticket"] = match.group(1).strip()

    # Source / Origin — English
    source_patterns = [
        r"(?:SOURCE|ORIGIN|FROM|LOADING\s*POINT)\s*[:.\-]\s*([A-Z][A-Z\s,]+)",
    ]
    for pattern in source_patterns:
        match = re.search(pattern, text_upper)
        if match:
            fields["source_location"] = match.group(1).strip().title()
            break
    # Hindi: स्थान / पता
    if not fields["source_location"]:
        match = re.search(r"(?:स्थान|पता|लोडिंग)\s*[:\-.\s]*(.+)", raw_text)
        if match:
            loc = match.group(1).strip()
            if loc:
                fields["source_location"] = loc

    # Destination — English
    dest_patterns = [
        r"(?:DESTINATION|DEST|TO|UNLOADING\s*POINT|DELIVERY)\s*[:.\-]\s*([A-Z][A-Z\s,]+)",
    ]
    for pattern in dest_patterns:
        match = re.search(pattern, text_upper)
        if match:
            fields["destination"] = match.group(1).strip().title()
            break

    return fields
