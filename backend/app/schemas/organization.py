from pydantic import BaseModel, model_validator
from typing import Optional

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

class BedBatchCreate(BaseModel):
    ward_id: int
    bed_numbers: list[str]

class BedRead(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    bed_no: str
    ward_id: int

class RoomCreate(BaseModel):
    room_number: str
    # Exactly one of department_id (dept-level) or ward_id (ward-level) should be provided
    department_id: Optional[int] = None
    ward_id: Optional[int] = None

    @model_validator(mode="after")
    def check_parent(self) -> "RoomCreate":
        if self.department_id is None and self.ward_id is None:
            raise ValueError("Provide either department_id (dept-level room) or ward_id (ward-level room)")
        if self.department_id is not None and self.ward_id is not None:
            raise ValueError("Provide only one of department_id or ward_id, not both")
        return self

class RoomRead(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    room_number: str
    department_id: Optional[int] = None
    ward_id: Optional[int] = None
    is_occupied: bool = False
    is_active: bool = True
