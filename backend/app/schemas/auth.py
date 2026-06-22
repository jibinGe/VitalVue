from pydantic import BaseModel, Field

class OTPRequest(BaseModel):
    user_id: str

class OTPVerify(BaseModel):
    user_id: str
    otp: str

class QRGenerateResponse(BaseModel):
    qr_token: str = Field(..., description="Unique code to render as QR")
    expires_in: int = Field(120, description="Expiration buffer in seconds")

class QRAuthorizeRequest(BaseModel):
    qr_token: str = Field(..., description="The decrypted token read from the scanned QR code")