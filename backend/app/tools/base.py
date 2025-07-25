"""
Base tool class for all tools in the AI Assistant Platform.

This module defines the base class that all tools must inherit from,
providing a consistent interface for tool execution and management.
"""

from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel


class ToolParameter(BaseModel):
    """Parameter definition for a tool."""

    name: str
    type: str
    description: str
    required: bool = True
    default: Any | None = None


class ToolResult(BaseModel):
    """Result from tool execution."""

    success: bool
    data: Any | None = None
    error: str | None = None
    metadata: dict[str, Any] | None = None


class BaseTool(ABC):
    """Base class for all tools."""

    def __init__(self):
        self.name: str = self.__class__.__name__
        self.description: str = self.__doc__ or ""
        self.category: str = "general"
        self.version: str = "1.0.0"
        self.parameters: list[ToolParameter] = []
        self.requires_auth: bool = False
        self.rate_limit: str | None = None

    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        """
        Execute the tool with given parameters.

        Args:
            **kwargs: Tool parameters

        Returns:
            ToolResult: Execution result
        """

    def get_schema(self) -> dict[str, Any]:
        """
        Get tool schema for API documentation.

        Returns:
            Dict[str, Any]: Tool schema
        """
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "version": self.version,
            "parameters": [param.dict() for param in self.parameters],
            "requires_auth": self.requires_auth,
            "rate_limit": self.rate_limit,
        }

    def validate_parameters(self, **kwargs) -> bool:
        """
        Validate tool parameters.

        Args:
            **kwargs: Parameters to validate

        Returns:
            bool: True if valid, False otherwise
        """
        for param in self.parameters:
            if param.required and param.name not in kwargs:
                return False
        return True

    def get_parameter_description(self, param_name: str) -> str | None:
        """
        Get description for a specific parameter.

        Args:
            param_name: Parameter name

        Returns:
            Optional[str]: Parameter description
        """
        for param in self.parameters:
            if param.name == param_name:
                return param.description
        return None
