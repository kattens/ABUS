# api/db_models.py
"""
+ ModelCategory: (model_id, category_id) -> weight
+ Score.note: optional text note for the subfeature
"""

from typing import Optional
from sqlmodel import SQLModel, Field, UniqueConstraint

class Model(SQLModel, table=True):
    __tablename__ = "models"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)

class Category(SQLModel, table=True):
    __tablename__ = "categories"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)

class Subcategory(SQLModel, table=True):
    __tablename__ = "subcategories"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    category_id: int = Field(foreign_key="categories.id")
    __table_args__ = (UniqueConstraint("category_id", "name", name="uq_subcat_per_category"),)

class ModelCategory(SQLModel, table=True):
    __tablename__ = "model_categories"
    id: Optional[int] = Field(default=None, primary_key=True)
    model_id: int = Field(foreign_key="models.id", index=True)
    category_id: int = Field(foreign_key="categories.id", index=True)
    weight: float = 0.0
    __table_args__ = (UniqueConstraint("model_id", "category_id", name="uq_model_category"),)

class Score(SQLModel, table=True):
    __tablename__ = "scores"
    id: Optional[int] = Field(default=None, primary_key=True)
    model_id: int = Field(foreign_key="models.id", index=True)
    subcategory_id: int = Field(foreign_key="subcategories.id", index=True)
    value: float
    note: Optional[str] = None
    __table_args__ = (UniqueConstraint("model_id", "subcategory_id", name="uq_model_subcategory"),)
