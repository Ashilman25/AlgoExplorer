
# pytest config file 
# allows for easier imports for tests

import sys
from pathlib import Path


APP_DIR = Path(__file__).parent.parent / "app"

if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))


# to use just do pytest tests/ to test the whole directory
# or pytests whatever the path is to the tests/
# or can do specific test files
# this is for yall who dont know pytest btw, yw