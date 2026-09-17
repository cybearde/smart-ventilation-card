"""Generate isolated HA helpers and a YAML test dashboard; no credentials."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
values = dict(outdoor_temperature=(4,'°C'), supply_temperature=(20,'°C'), extract_temperature=(23,'°C'), exhaust_temperature=(7,'°C'), supply_fan=(49,'%'),extract_fan=(48,'%'),supply_rpm=(0,'rpm'),extract_rpm=(0,'rpm'),bypass=(0,'%'),room_temperature=(22,'°C'),humidity=(46,'%'),setpoint=(21,'°C'))
package = {'input_number':{}, 'input_boolean':{f'sv_test_{k}':{'name':f'SV Test {k}','initial':True} for k in ['gateway','controller']},'input_select':{'sv_test_level':{'name':'SV Test level','options':['Off','Level 1','Level 2','Level 3','Level 4'],'initial':'Level 3'}}}
package['input_boolean']['sv_test_hygrostat']={'name':'SV Test hygrostat','initial':False}
entities = {'level':'input_select.sv_test_level','gateway':'input_boolean.sv_test_gateway','controller':'input_boolean.sv_test_controller','hygrostat':'input_boolean.sv_test_hygrostat'}
for key,(value,unit) in values.items():
    id = f'sv_test_{key}'
    package['input_number'][id]={'name':f'SV Test {key.replace("_"," ")}', 'min':-30 if unit=='°C' else 0, 'max':3000 if unit=='rpm' else 100, 'step':0.1 if unit=='°C' else 1,'initial':value,'unit_of_measurement':unit,'mode':'box'}
    entities[key]=f'input_number.{id}'
card={'type':'custom:smart-ventilation-card','title':'Airflow Card','entities':entities}
dashboard={'title':'Smart Ventilation Test','views':[{'title':'Ventilation','path':'ventilation','cards':[{'type':'markdown','content':'## Smart Ventilation · test bench\nSynthetic values only. Change bypass, temperature and fan output below to exercise the card.'},card,{'type':'entities','title':'Test controls','entities':list(entities.values())},{**card,'title':'Compact · Fahrenheit','compact':True,'show_title':False,'show_details':True,'show_diagnostics':False,'temperature_unit':'°F'},{'type':'custom:smart-ventilation-card','title':'Unconfigured'},{**card,'title':'Unavailable sensor','entities':{**entities,'outdoor_temperature':'sensor.sv_test_missing'}}]}]}
# JSON is valid YAML and avoids a Python YAML dependency.
for name,data in [('test-package.yaml',package),('test-dashboard.yaml',dashboard),('test-card.json',card)]:
    (root/'examples'/name).write_text(json.dumps(data,indent=2)+'\n')
