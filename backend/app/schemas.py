from pydantic import BaseModel
from datetime import datetime


class TicketBase(BaseModel):
    vehicle_number: str | None = None
    driver_name: str | None = None
    material_type: str | None = None
    gross_weight: float | None = None
    tare_weight: float | None = None
    net_weight: float | None = None
    ticket_number: str | None = None
    date_on_ticket: str | None = None
    source_location: str | None = None
    destination: str | None = None


class TicketCreate(TicketBase):
    raw_ocr_text: str | None = None
    original_filename: str | None = None


class TicketUpdate(TicketBase):
    pass


class TicketResponse(TicketBase):
    id: int
    raw_ocr_text: str | None = None
    original_filename: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OCRResult(BaseModel):
    raw_text: str
    extracted_fields: TicketBase
