import re
import pytesseract
from PIL import Image
from pdf2image import convert_from_bytes
from io import BytesIO


def extract_text_from_image(image_bytes: bytes) -> str:
    image = Image.open(BytesIO(image_bytes))
    text = pytesseract.image_to_string(image)
    return text


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    images = convert_from_bytes(pdf_bytes)
    texts = []
    for img in images:
        texts.append(pytesseract.image_to_string(img))
    return "\n".join(texts)


def parse_ticket_fields(raw_text: str) -> dict:
    """Parse OCR text and extract structured fields using pattern matching."""
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

    text = raw_text.upper()
    lines = raw_text.strip().split("\n")

    # Vehicle number patterns (Indian: XX00XX0000, general alphanumeric plates)
    vehicle_patterns = [
        r"[A-Z]{2}\s*\d{1,2}\s*[A-Z]{1,3}\s*\d{4}",  # Indian format
        r"[A-Z]{2,3}\s*-?\s*\d{2,4}\s*-?\s*[A-Z]{0,3}\s*-?\s*\d{1,4}",  # General
    ]
    for pattern in vehicle_patterns:
        match = re.search(pattern, text)
        if match:
            fields["vehicle_number"] = match.group().strip()
            break

    # Ticket / slip number
    ticket_patterns = [
        r"(?:TICKET|SLIP|TOKEN|SR|SERIAL)\s*(?:NO|NUMBER|#|\.?)[\s:.\-]*([A-Z0-9\-]+)",
        r"(?:NO|NUMBER)\s*[:.\-]\s*([A-Z0-9\-]+)",
    ]
    for pattern in ticket_patterns:
        match = re.search(pattern, text)
        if match:
            fields["ticket_number"] = match.group(1).strip()
            break

    # Weight extraction
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
            match = re.search(pattern, text)
            if match:
                weight_str = match.group(1).replace(",", "")
                try:
                    fields[field_name] = float(weight_str)
                except ValueError:
                    pass
                break

    # Driver name
    driver_patterns = [
        r"(?:DRIVER|TRANSPORTER)\s*(?:NAME)?\s*[:.\-]\s*([A-Z][A-Z\s]+)",
    ]
    for pattern in driver_patterns:
        match = re.search(pattern, text)
        if match:
            fields["driver_name"] = match.group(1).strip().title()
            break

    # Material type
    material_patterns = [
        r"(?:MATERIAL|PRODUCT|COMMODITY|ITEM|GOODS)\s*(?:TYPE|NAME|DESC)?\s*[:.\-]\s*([A-Z][A-Z\s]+)",
    ]
    for pattern in material_patterns:
        match = re.search(pattern, text)
        if match:
            fields["material_type"] = match.group(1).strip().title()
            break

    # Date
    date_patterns = [
        r"\b(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})\b",
        r"\b(\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2})\b",
    ]
    for pattern in date_patterns:
        match = re.search(pattern, raw_text)
        if match:
            fields["date_on_ticket"] = match.group(1).strip()
            break

    # Source / Origin
    source_patterns = [
        r"(?:SOURCE|ORIGIN|FROM|LOADING\s*POINT)\s*[:.\-]\s*([A-Z][A-Z\s,]+)",
    ]
    for pattern in source_patterns:
        match = re.search(pattern, text)
        if match:
            fields["source_location"] = match.group(1).strip().title()
            break

    # Destination
    dest_patterns = [
        r"(?:DESTINATION|DEST|TO|UNLOADING\s*POINT|DELIVERY)\s*[:.\-]\s*([A-Z][A-Z\s,]+)",
    ]
    for pattern in dest_patterns:
        match = re.search(pattern, text)
        if match:
            fields["destination"] = match.group(1).strip().title()
            break

    return fields
