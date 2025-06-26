from abc import ABC, abstractmethod
from typing import List, Any

class BaseReader(ABC):
    @abstractmethod
    def configure(self, config: dict):
        pass

    @abstractmethod
    def load_documents(self) -> List[Any]:
        pass

    def sync(self):
        pass
