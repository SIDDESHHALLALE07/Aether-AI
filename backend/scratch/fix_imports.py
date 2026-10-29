import os
import glob
import re

models_dir = 'app/models'

for filepath in glob.glob(os.path.join(models_dir, '*.py')):
    if os.path.basename(filepath) == '__init__.py': continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    imports = re.findall(r'^from app\.models import .*$', content, flags=re.MULTILINE)
    if not imports:
        continue
        
    # Remove original imports
    content = re.sub(r'^from app\.models import .*$\n', '', content, flags=re.MULTILINE)
    
    # Add TYPE_CHECKING to typing import
    if 'from typing import' in content and 'TYPE_CHECKING' not in content:
        content = content.replace('from typing import ', 'from typing import TYPE_CHECKING, ')
    elif 'from typing import TYPE_CHECKING' not in content:
        content = 'from typing import TYPE_CHECKING\n' + content
        
    # Prepare TYPE_CHECKING block
    type_checking_block = "\nif TYPE_CHECKING:\n    " + "\n    ".join(imports) + "\n\n"
    
    # Insert block before the first class definition or function
    class_idx = content.find('class ')
    def_idx = content.find('def ')
    
    insert_idx = min(idx for idx in [class_idx, def_idx] if idx != -1)
    
    content = content[:insert_idx] + type_checking_block + content[insert_idx:]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Fixed {filepath}")
