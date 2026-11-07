from typing import List
from motor.motor_asyncio import AsyncIOMotorClient
import gc
import pandas as pd
from datetime import datetime, timedelta
import os
import json
import io
import fitz  # PyMuPDF for PDF Text Extraction
import asyncio
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from dotenv import load_dotenv
import bcrypt
import jwt
from pydantic import BaseModel

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key")
ALGORITHM = "HS256"
MONGO_URI = os.getenv("MONGO_URI")
db_client = AsyncIOMotorClient(MONGO_URI)
db = db_client.invoice_analyzer  
collection = db.invoices         

# Direct Bcrypt Password Hashing Helpers
def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]  # Bcrypt 72-byte limit safety
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8')[:72], hashed_password.encode('utf-8'))
    except Exception:
        return False

# Pydantic Models for Data Validation
class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

def extract_text_from_file(contents: bytes, content_type: str) -> str:
    extracted_text = ""
    
    if content_type == "application/pdf":
        try:
            doc = fitz.open(stream=contents, filetype="pdf")
            for page in doc:
                extracted_text += page.get_text("text")
        except Exception as e:
            raise Exception(f"PDF se text nikalne mein error: {str(e)}")
            
    elif content_type in ["image/jpeg", "image/png", "image/webp"]:
        extracted_text = "IMAGE_FILE"
    
    if not extracted_text.strip():
        raise Exception("File mein koi readable text nahi mila.")
        
    return extracted_text

def analyze_invoice_with_groq(contents: bytes, content_type: str):
    if content_type in ["image/jpeg", "image/png", "image/webp"]:
        import base64
        base64_image = base64.b64encode(contents).decode('utf-8')
        
        prompt = """
        You are an expert FinTech AI. Analyze this invoice/receipt image directly.
        Extract the following details:
        - merchant_name (string)
        - date (string, format YYYY-MM-DD if possible)
        - total_amount (number)
        - tax_amount (number)
        - items (list of objects with 'item_name' and 'price')
        - category (String. Strictly choose ONLY ONE from: Food, Travel, Medical, Utilities, Shopping, Entertainment, Others)

        Return the output STRICTLY as a valid JSON object.
        """
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{content_type};base64,{base64_image}"
                            },
                        },
                    ],
                }
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            temperature=0.0
        )
        return json.loads(chat_completion.choices[0].message.content)
    
    else:
        prompt = """
        You are an expert FinTech AI. Analyze the following text extracted from an invoice/receipt.
        Extract the following details:
        - merchant_name (string)
        - date (string, format YYYY-MM-DD if possible)
        - total_amount (number)
        - tax_amount (number)
        - items (list of objects with 'item_name' and 'price')
        - category (String. Strictly choose ONLY ONE from: Food, Travel, Medical, Utilities, Shopping, Entertainment, Others)

        Return the output STRICTLY as a valid JSON object.
        """
        
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Here is the invoice text: \n\n{contents}"}
            ],
            model="llama-3.3-70b-versatile", 
            response_format={"type": "json_object"}, 
            temperature=0.0 
        )
        
        return json.loads(chat_completion.choices[0].message.content)

@app.get("/")
def read_root():
    return {"message": "AI Invoice Analyzer Backend is Live!"}

async def process_single_file(file: UploadFile, batch_id: str):
    try:
        contents = await file.read()
        
        if file.content_type == "application/pdf":
            extracted_text = await asyncio.to_thread(extract_text_from_file, contents, file.content_type)
            ai_extracted_data = await asyncio.to_thread(analyze_invoice_with_groq, extracted_text, file.content_type)
        else:
            ai_extracted_data = await asyncio.to_thread(analyze_invoice_with_groq, contents, file.content_type)
        
        db_document = ai_extracted_data.copy()
        db_document["uploaded_at"] = datetime.utcnow()
        db_document["source_file"] = file.filename
        db_document["batch_id"] = batch_id 
        
        await collection.insert_one(db_document)
        return {"status": "success", "filename": file.filename, "data": ai_extracted_data}
        
    except Exception as e:
        print(f"❌ ERROR '{file.filename}' MEIN: {str(e)}")
        return {"status": "failed", "filename": file.filename, "reason": str(e)}

@app.post("/upload-batch")
async def upload_batch_invoices(
    files: List[UploadFile] = File(...),
    batch_id: str = Form(...)
):
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
    successful_uploads = []
    failed_uploads = []

    for file in files:
        if file.content_type not in allowed_types:
            failed_uploads.append({"filename": file.filename, "reason": "Invalid file type"})
            continue
            
        res = await process_single_file(file, batch_id)
        
        if res["status"] == "success":
            successful_uploads.append({"filename": res["filename"], "data": res["data"]})
        else:
            failed_uploads.append({"filename": res["filename"], "reason": res["reason"]})
            
        gc.collect() 

    return {
        "message": f"Batch process complete! {len(successful_uploads)} success.",
        "successful_uploads": successful_uploads,
        "failed_uploads": failed_uploads
    }

@app.post("/signup")
async def signup(user: UserCreate):
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)

    new_user = {
        "name": user.name,
        "email": user.email,
        "password": hashed_password,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(new_user)
    return {"message": "User created successfully"}

@app.post("/login")
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    expiration = datetime.utcnow() + timedelta(hours=24) 
    token_payload = {"sub": user.email, "exp": expiration}
    token = jwt.encode(token_payload, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "message": "Login successful", 
        "access_token": token, 
        "name": db_user["name"]
    }

@app.get("/dashboard-stats")
async def get_dashboard_stats(batch_id: str = None):
    if not batch_id:
        return {"total_expense": 0, "total_tax": 0, "category_summary": {}, "merchant_summary": {}}
    
    try:
        query = {"batch_id": batch_id}
        cursor = collection.find(query, {"_id": 0})
        invoices = await cursor.to_list(length=None)
        
        if not invoices:
            return {"total_expense": 0, "total_tax": 0, "category_summary": {}, "merchant_summary": {}}
            
        df = pd.DataFrame(invoices)
        df['total_amount'] = pd.to_numeric(df['total_amount'], errors='coerce').fillna(0)
        df['tax_amount'] = pd.to_numeric(df['tax_amount'], errors='coerce').fillna(0)
        df['category'] = df['category'].fillna("Others")
        df['merchant_name'] = df['merchant_name'].fillna("Unknown")
        
        total_expense = float(df['total_amount'].sum())
        total_tax = float(df['tax_amount'].sum())
        category_sum = df.groupby('category')['total_amount'].sum().to_dict()
        merchant_count = df.groupby('merchant_name').size().to_dict()
        
        return {
            "total_expense": total_expense,
            "total_tax": total_tax,
            "category_summary": category_sum,
            "merchant_summary": merchant_count
        }
    except Exception as e:
        print(f"Error in dashboard-stats: {e}")
        return {"total_expense": 0, "total_tax": 0, "category_summary": {}, "merchant_summary": {}}

@app.get("/insights")
async def get_financial_insights(batch_id: str = None):
    if not batch_id:
        return {"summary": "", "insights": [], "recommendations": []}
    
    try:
        query = {"batch_id": batch_id}
        cursor = collection.find(query, {"_id": 0})
        invoices = await cursor.to_list(length=None)
        
        if not invoices:
            return {"summary": "No data found.", "insights": [], "recommendations": []}
            
        df = pd.DataFrame(invoices)
        df['total_amount'] = pd.to_numeric(df['total_amount'], errors='coerce').fillna(0)
        df['tax_amount'] = pd.to_numeric(df['tax_amount'], errors='coerce').fillna(0)
        df['category'] = df['category'].fillna("Others")
        df['merchant_name'] = df['merchant_name'].fillna("Unknown")
        
        total_expense = float(df['total_amount'].sum())
        total_tax = float(df['tax_amount'].sum())
        category_sum = df.groupby('category')['total_amount'].sum().to_dict()
        merchant_count = df.groupby('merchant_name').size().to_dict()
        
        prompt = f"""
        Act as an expert financial advisor. Based on the following spending summary of a user:
        {json.dumps(category_sum)}
        
        Provide your analysis in exactly 3 distinct sections:
        1. 'summary': A brief 2-sentence overall summary of their spending behavior.
        2. 'insights': A list of 3 specific, data-driven observations (e.g., "70% of your budget went to Food").
        3. 'recommendations': A brief list of 2 highly actionable, practical tips to save money tailored to this pattern.
        
        Return the output STRICTLY as a valid JSON object with the keys 'summary' (string), 'insights' (list of strings), and 'recommendations' (list of strings).
        """
        
        chat_completion = client.chat.completions.create(
            messages=[{"role": "system", "content": prompt}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            temperature=0.7 
        )
        
        insights_data = json.loads(chat_completion.choices[0].message.content)
        
        return {
            "total_expense": total_expense,
            "total_tax": total_tax,
            "category_summary": category_sum,
            "merchant_summary": merchant_count,
            **insights_data
        }
        
    except Exception as e:
        print(f"Error: {e}") 
        return {"summary": "Error generating analysis.", "insights": [], "recommendations": []}