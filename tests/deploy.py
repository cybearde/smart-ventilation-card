"""Install only this card's fixtures in the shared local HA test instance."""
import hashlib
from pathlib import Path
import shutil
import subprocess
root=Path(__file__).resolve().parents[1]
ha=root.parents[1]/'ha_testing'/'ha-config'
config=ha/'configuration.yaml'
text=config.read_text()
if 'packages: !include_dir_named packages' not in text:
    text=text.replace('homeassistant:\n','homeassistant:\n  packages: !include_dir_named packages\n',1)
resource='/local/smart-ventilation-card/smart-ventilation-card.js?v='+hashlib.sha256((root/'dist/smart-ventilation-card.js').read_bytes()).hexdigest()[:12]
import re
if '/local/smart-ventilation-card/' in text:
    text=re.sub(r'/local/smart-ventilation-card/smart-ventilation-card.js\?v=[a-f0-9]+',resource,text)
else:
    text=text.replace('  resources:\n',f'  resources:\n    - url: {resource}\n      type: module\n',1)
if 'smart-ventilation-test:' not in text:
    text=text.replace('lovelace:\n','lovelace:\n  dashboards:\n    smart-ventilation-test:\n      mode: yaml\n      title: Smart Ventilation Test\n      icon: mdi:hvac\n      show_in_sidebar: true\n      filename: smart-ventilation-test.yaml\n',1)
backup=config.with_suffix('.yaml.before-smart-ventilation')
if not backup.exists(): shutil.copy2(config,backup)
(ha/'packages').mkdir(exist_ok=True)
shutil.copy2(root/'examples/test-package.yaml',ha/'packages/smart_ventilation_test.yaml')
shutil.copy2(root/'examples/test-dashboard.yaml',ha/'smart-ventilation-test.yaml')
# www is container-owned; copy using the existing test container.
subprocess.run(['docker','exec','ha-testing','mkdir','-p','/config/www/smart-ventilation-card'],check=True)
subprocess.run(['docker','cp',str(root/'dist/smart-ventilation-card.js'),'ha-testing:/config/www/smart-ventilation-card/smart-ventilation-card.js'],check=True)
config.write_text(text)
check = subprocess.run(['docker','exec','ha-testing','python','-m','homeassistant','--script','check_config','--config','/config'],check=True,capture_output=True,text=True)
print(check.stdout)
if 'Incorrect config' in check.stdout: raise RuntimeError('Home Assistant configuration validation failed')
subprocess.run(['docker','restart','ha-testing'],check=True)
print('Installed: http://localhost:8123/smart-ventilation-test/ventilation')
