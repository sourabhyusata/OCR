from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, get_db, Base
from .models import Ticket
from .schemas import TicketCreate, TicketUpdate, TicketResponse, OCRResult
from .ocr_engine import extract_text_from_image, extract_text_from_pdf, parse_ticket_fields

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Load Ticket OCR Tool", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/tiff", "image/bmp", "image/webp", "image/heic", "image/heif"}
ALLOWED_PDF_TYPES = {"application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@app.get("/")
def root():
    return {"message": "Load Ticket OCR API is running"}


@app.post("/api/ocr", response_model=OCRResult)
async def process_ticket(file: UploadFile = File(...)):
    """Upload an image or PDF of a load ticket and extract data via OCR."""
    if file.content_type not in ALLOWED_IMAGE_TYPES | ALLOWED_PDF_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Upload an image or PDF.",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 10 MB.")

    if file.content_type in ALLOWED_PDF_TYPES:
        raw_text = extract_text_from_pdf(contents)
    else:
        raw_text = extract_text_from_image(contents)

    extracted = parse_ticket_fields(raw_text)

    return OCRResult(raw_text=raw_text, extracted_fields=extracted)


@app.post("/api/tickets", response_model=TicketResponse)
def create_ticket(ticket: TicketCreate, db: Session = Depends(get_db)):
    """Save a ticket record after OCR extraction and user review."""
    db_ticket = Ticket(**ticket.model_dump())
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket


@app.get("/api/tickets", response_model=list[TicketResponse])
def list_tickets(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """List all saved tickets."""
    return db.query(Ticket).order_by(Ticket.created_at.desc()).offset(skip).limit(limit).all()


@app.get("/api/tickets/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@app.put("/api/tickets/{ticket_id}", response_model=TicketResponse)
def update_ticket(ticket_id: int, updates: TicketUpdate, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(ticket, field, value)
    db.commit()
    db.refresh(ticket)
    return ticket


@app.delete("/api/tickets/{ticket_id}")
def delete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    db.delete(ticket)
    db.commit()
    return {"detail": "Ticket deleted"}
