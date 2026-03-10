from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime, timezone

from .database import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String, nullable=True)
    driver_name = Column(String, nullable=True)
    material_type = Column(String, nullable=True)
    gross_weight = Column(Float, nullable=True)
    tare_weight = Column(Float, nullable=True)
    net_weight = Column(Float, nullable=True)
    ticket_number = Column(String, nullable=True)
    date_on_ticket = Column(String, nullable=True)
    source_location = Column(String, nullable=True)
    destination = Column(String, nullable=True)
    raw_ocr_text = Column(String, nullable=True)
    original_filename = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
