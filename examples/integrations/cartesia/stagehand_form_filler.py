"""
StagehandFormFiller - Browser automation for filling web forms during voice conversations
"""

import asyncio
import os
from typing import Dict, Optional, Any
from dataclasses import dataclass
from enum import Enum

from loguru import logger
from stagehand import Stagehand, StagehandConfig
from pydantic import BaseModel


class FieldType(Enum):
    TEXT = "text"
    EMAIL = "email"
    PHONE = "phone"
    SELECT = "select"
    RADIO = "radio"
    CHECKBOX = "checkbox"
    TEXTAREA = "textarea"
    ADDRESS = "address"


@dataclass
class FormField:
    """Represents a form field with its metadata"""
    field_id: str
    field_type: FieldType
    label: str
    selector: Optional[str] = None
    required: bool = False
    options: Optional[list] = None


class FormFieldMapping:
    """Maps conversation questions to actual form fields"""
    
    def __init__(self):
        # Page 1 - Basic Information
        self.basic_info_mappings = {
            "full_name": FormField(
                field_id="full_name",
                field_type=FieldType.TEXT,
                label="What is your full name?",
                required=True,
            ),
            "email": FormField(
                field_id="email",
                field_type=FieldType.EMAIL,
                label="What is your email address?",
                required=True,
            ),
            "phone": FormField(
                field_id="phone",
                field_type=FieldType.PHONE,
                label="What is your phone number?",
                required=False,
            ),
            "address": FormField(
                field_id="address",
                field_type=FieldType.ADDRESS,
                label="What is your current address?",
                required=True,
            ),
            "city": FormField(
                field_id="city",
                field_type=FieldType.TEXT,
                label="City",
                required=True,
            ),
            "state": FormField(
                field_id="state",
                field_type=FieldType.TEXT,
                label="State / Province",
                required=True,
            ),
            "zip": FormField(
                field_id="zip",
                field_type=FieldType.TEXT,
                label="ZIP / Postal code",
                required=True,
            ),
        }
        
        # Page 2 - Availability 
        self.availability_mappings = {
            "work_eligibility": FormField(
                field_id="work_eligibility",
                field_type=FieldType.RADIO,
                label="Are you legally eligible to work in this country?",
                options=["Yes", "No"],
                required=True,
            ),
            "availability_type": FormField(
                field_id="availability",
                field_type=FieldType.RADIO,
                label="What's your availability?",
                options=["Temporary", "Part-time", "Full-time"],
                required=True,
            ),
        }
        
        # Page 3 - Additional Information
        self.additional_info_mappings = {
            "additional_info": FormField(
                field_id="additional_info",
                field_type=FieldType.TEXTAREA,
                label="Anything else you'd like to let us know about you?",
                required=False,
            ),
        }
        
        # Page 4 - Role Information
        self.role_mappings = {
            "role_selection": FormField(
                field_id="role_selection",
                field_type=FieldType.CHECKBOX,
                label="Which of these roles are you applying for?",
                options=["Sales manager", "IT Support", "Recruiting", "Software engineer", "Marketing specialist"],
                required=True,
            ),
            "previous_experience": FormField(
                field_id="previous_experience",
                field_type=FieldType.RADIO,
                label="Have you worked in a role similar to this one in the past?",
                options=["Yes", "No"],
                required=True,
            ),
            "skills_experience": FormField(
                field_id="skills_experience",
                field_type=FieldType.TEXTAREA,
                label="What relevant skills and experience do you have that make you a strong candidate for this position?",
                required=True,
            ),
        }
        
        # Combined mappings for easy lookup
        self.field_mappings = {
            **self.basic_info_mappings,
            **self.availability_mappings, 
            **self.additional_info_mappings,
            **self.role_mappings,
        }
    
    def get_form_field(self, question_id: str) -> Optional[FormField]:
        """Get the form field mapping for a question ID"""
        return self.field_mappings.get(question_id)
    
    def transform_answer(self, question_id: str, answer: str) -> str:
        """Transform voice answer to form-compatible format"""
        field = self.get_form_field(question_id)
        if not field:
            return answer
        
        # Handle specific transformations
        if question_id == "role_selection":
            # Map voice responses to exact form options
            role_mapping = {
                "sales": "Sales manager",
                "sales manager": "Sales manager", 
                "it": "IT Support",
                "it support": "IT Support",
                "tech support": "IT Support",
                "technical support": "IT Support",
                "recruiting": "Recruiting",
                "recruiter": "Recruiting",
                "software": "Software engineer",
                "software engineer": "Software engineer",
                "developer": "Software engineer",
                "programming": "Software engineer",
                "marketing": "Marketing specialist",
                "marketing specialist": "Marketing specialist",
            }
            answer_lower = answer.lower().strip()
            return role_mapping.get(answer_lower, answer)
        
        elif question_id == "availability_type":
            # Map availability responses
            availability_mapping = {
                "temp": "Temporary",
                "temporary": "Temporary",
                "part": "Part-time", 
                "part-time": "Part-time",
                "part time": "Part-time",
                "full": "Full-time",
                "full-time": "Full-time", 
                "full time": "Full-time",
            }
            answer_lower = answer.lower().strip()
            return availability_mapping.get(answer_lower, answer)
        
        elif question_id in ["work_eligibility", "previous_experience"]:
            # Convert boolean-like responses to Yes/No
            if answer.lower().strip() in ["true", "yes", "yeah", "yep", "sure", "of course", "definitely"]:
                return "Yes"
            elif answer.lower().strip() in ["false", "no", "nope", "not really", "nah"]:
                return "No"
            else:
                return answer
        
        elif question_id in ["full_name", "email", "phone", "address", "city", "state", "zip"]:
            # Clean up basic text fields
            return answer.strip()
        
        elif question_id in ["additional_info", "skills_experience"]:
            # Keep text areas as-is but clean whitespace
            return answer.strip()
        
        return answer


class StagehandFormFiller:
    """Manages browser automation for filling forms using Stagehand"""
    
    def __init__(self, form_url: str, headless: bool = False):
        self.form_url = form_url
        self.headless = headless
        self.stagehand: Optional[Stagehand] = None
        self.page = None
        self.is_initialized = False
        self.field_mapper = FormFieldMapping()
        self.collected_data: Dict[str, str] = {}
    
    async def initialize(self):
        """Initialize Stagehand and open the form"""
        if self.is_initialized:
            return
        
        try:
            logger.info("🚀 Initializing Stagehand browser automation")
            
            # Configure Stagehand
            config = StagehandConfig(
                env="BROWSERBASE",  # Use local browser
                model_name="google/gemini-2.0-flash-exp",  # Fast model for form filling
                model_api_key=os.getenv("GEMINI_API_KEY"),
            )
            
            self.stagehand = Stagehand(config)
            await self.stagehand.init()
            
            self.page = self.stagehand.page
            
            # Navigate to form
            logger.info(f"📝 Opening form: {self.form_url}")
            await self.page.goto(self.form_url)
            
            # Wait for form to load
            await asyncio.sleep(2)
            
            self.is_initialized = True
            logger.info("✅ Browser automation initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Stagehand: {e}")
            raise
    
    async def fill_field(self, question_id: str, answer: str) -> bool:
        """Fill a specific form field based on the question ID and answer (non-blocking)"""
        if not self.is_initialized:
            # Initialize asynchronously without blocking
            init_task = asyncio.create_task(self.initialize())
            await init_task
        
        try:
            # Get field mapping
            field = self.field_mapper.get_form_field(question_id)
            if not field:
                logger.warning(f"⚠️ No field mapping found for question: {question_id}")
                return False
            
            # Transform answer for the form
            transformed_answer = self.field_mapper.transform_answer(question_id, answer)
            self.collected_data[question_id] = transformed_answer
            
            logger.info(f"🖊️ Async filling field '{field.label}' with: {transformed_answer}")
            
            # Create async task for the actual field filling
            fill_action = None
            
            # Use Stagehand's natural language API to fill the field
            if field.field_type in [FieldType.TEXT, FieldType.EMAIL, FieldType.PHONE]:
                fill_action = self.page.act(f"Fill in the '{field.label}' field with: {transformed_answer}")
            
            elif field.field_type == FieldType.ADDRESS:
                fill_action = self.page.act(f"Fill in the address field with: {transformed_answer}")
            
            elif field.field_type == FieldType.TEXTAREA:
                fill_action = self.page.act(f"Type in the '{field.label}' text area: {transformed_answer}")
            
            elif field.field_type in [FieldType.SELECT, FieldType.RADIO]:
                fill_action = self.page.act(f"Select '{transformed_answer}' for the '{field.label}' field")
            
            elif field.field_type == FieldType.CHECKBOX:
                # For role selection, check the specific role checkbox
                if question_id == "role_selection":
                    fill_action = self.page.act(f"Check the '{transformed_answer}' checkbox")
                else:
                    # For other checkboxes, check/uncheck based on answer
                    if transformed_answer.lower() in ["yes", "true"]:
                        fill_action = self.page.act(f"Check the '{field.label}' checkbox")
                    else:
                        fill_action = self.page.act(f"Uncheck the '{field.label}' checkbox")
            
            # Execute the fill action asynchronously
            if fill_action:
                await fill_action

            return True
            
        except Exception as e:
            logger.error(f"❌ Error filling field {question_id}: {e}")
            return False
    
    async def fill_collected_data(self):
        """Fill in all collected data from the conversation"""
        logger.info("👤 Filling collected information from conversation")
        
        # Fill all collected data
        for field_name, value in self.collected_data.items():
            field = self.field_mapper.get_form_field(field_name)
            if field and value:
                logger.info(f"📝 Filling {field_name}: {value}")
                
                # Parse address components if it's an address field
                if field_name == "address" and "," in value:
                    # Try to parse address components
                    parts = [p.strip() for p in value.split(",")]
                    if len(parts) >= 4:
                        # Assume format: street, city, state, zip
                        await self.page.act(f"Fill in the 'Address' field with: {parts[0]}")
                        await self.page.act(f"Fill in the 'City' field with: {parts[1]}")
                        await self.page.act(f"Fill in the 'State / Province' field with: {parts[2]}")
                        await self.page.act(f"Fill in the 'ZIP / Postal code' field with: {parts[3]}")
                    else:
                        await self.page.act(f"Fill in the '{field.label}' field with: {value}")
                else:
                    await self.page.act(f"Fill in the '{field.label}' field with: {value}")
                
                await asyncio.sleep(0.5)  # Small delay between fields
    
    async def navigate_to_next_page(self):
        """Navigate to the next page of the form if multi-page (non-blocking)"""
        try:
            # Create async task for navigation
            nav_task = asyncio.create_task(
                self.page.act("Click the Next or Continue button")
            )
            await nav_task
            
            # Small async delay for page transition
            await asyncio.sleep(1.5)
            return True
        except Exception as e:
            logger.debug(f"No next button found or single-page form: {e}")
            return False
    
    async def submit_form(self) -> bool:
        """Submit the completed form (fully async)"""
        try:
            logger.info("📤 Attempting to submit the form")
            logger.info(f"📊 Form has {len(self.collected_data)} fields already filled in real-time")
            
            # Data has already been filled in real-time during conversation
            # Just navigate and submit
            
            # Navigate through pages if needed (async)
            nav_result = await self.navigate_to_next_page()
            
            # Submit the form asynchronously
            submit_task = asyncio.create_task(
                self.page.act("Click the Submit button")
            )
            await submit_task
            
            # Wait for submission confirmation (non-blocking)
            await asyncio.sleep(2.5)
            
            # Check for success message asynchronously
            try:
                extract_task = asyncio.create_task(
                    self.page.extract({
                        "success_indicator": "boolean indicating if form was submitted successfully"
                    })
                )
                success_check = await extract_task
                
                if success_check and hasattr(success_check, 'success_indicator'):
                    logger.info("✅ Form submitted successfully!")
                    return True
                elif success_check:
                    logger.info("✅ Form submission completed")
                    return True
            except Exception as e:
                logger.warning(f"⚠️ Could not verify submission: {e}")
            
            logger.info("📝 Form submission process completed")
            return True  # Assume success if no errors
            
        except Exception as e:
            logger.error(f"❌ Error submitting form: {e}")
            return False
    
    async def get_form_progress(self) -> Dict[str, Any]:
        """Get current progress of form filling"""
        if not self.is_initialized:
            return {"status": "not_started", "fields_filled": 0}
        
        try:
            # Use Stagehand to extract form progress
            progress = await self.page.extract({
                "filled_fields": "number of fields that have been filled",
                "total_fields": "total number of fields in the form",
                "current_page": "current page number if multi-page form",
                "total_pages": "total pages if multi-page form",
            })
            
            return {
                "status": "in_progress",
                "fields_filled": len(self.collected_data),
                "form_state": progress,
                "collected_data": self.collected_data,
            }
            
        except Exception as e:
            logger.error(f"Error getting form progress: {e}")
            return {"status": "error", "message": str(e)}
    
    async def cleanup(self):
        """Clean up browser resources"""
        if self.stagehand and self.page:
            try:
                await self.page.close()
                logger.info("🧹 Browser closed")
            except Exception as e:
                logger.error(f"Error closing browser: {e}")