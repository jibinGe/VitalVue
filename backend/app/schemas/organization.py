from pydantic import BaseModel

class OrganizationCreate(BaseModel):
    name: str
    country: str
    state: str
    city: str
    latitude: float | None = None
    longitude: float | None = None

class OrganizationRead(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    country: str
    state: str
    city: str
    latitude: float | None = None
    longitude: float | None = None

class DepartmentCreate(BaseModel):
    name: str
    organization_id: int

class DepartmentRead(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    organization_id: int

class StationCreate(BaseModel):
    name: str
    station_no: str | None = None
    department_id: int

class StationRead(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    station_no: str | None = None
    department_id: int

class WardCreate(BaseModel):
    name: str
    ward_no: str | None = None
    department_id: int
    station_id: int | None = None

class WardRead(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    ward_no: str | None = None
    department_id: int
    station_id: int | None = None

class BedCreate(BaseModel):
    bed_no: str
    ward_id: int

class BedRead(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    bed_no: str
    ward_id: int
