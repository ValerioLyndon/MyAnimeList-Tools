import os
import re
from datetime import datetime

# FUNCTIONS

# remove whitespace for testing purposes
def removeLines(text):
	return re.sub(r"[\n\r]", '', text)

# PROGRAM

# set cwd to repo base path
script_path = os.path.abspath(__file__)
base_path = os.path.dirname(os.path.dirname(script_path))
os.chdir(base_path)

def path(sub_path):
	return os.path.join(base_path, sub_path)

textReplacements = []
with open(path('components/variables'), 'r') as file:
	for var in file.readlines():
		split = var.split('=');
		name = split.pop(0).lstrip()
		value = '='.join(split).rstrip('\n\r')
		if name == 'ver_date':
			value = datetime.now().strftime("%Y/%b/%d")
		textReplacements.append([name, value])

fileReplacements = [
	['credit', 'components/credit.js'],
	['store', 'components/store.js'],
	['main', 'components/main.js'],
	['interface', 'components/interface.js'],
	['css', 'components/primary.css']
]

fileRecipes = [
	{
		'in': 'components/userscript-base.js',
		'out': 'script.user.js'
	},
	{
		'in': 'components/bookmarklet-base.js',
		'out': 'bookmarklet.js'
	},
	{
		'in': 'bookmarklet.js',
		'out': 'bookmarklet-test.nfp.js',
		'func': removeLines
	}
]

def replaceVars(text):
	for replacement in fileReplacements:
		with open(path(replacement[1]), 'r') as file:
			replacementText = file.read()
			text = text.replace(f"/*<<<{replacement[0]}>>>*/", replacementText)
	for replacement in textReplacements:
		text = text.replace(f"/*$$${replacement[0]}$$$*/", replacement[1])
	return text

for recipe in fileRecipes:
	with open(path(recipe['in']), 'r') as file:
		text = replaceVars(file.read())

	if 'func' in recipe:
		text = recipe['func'](text)
	
	with open(path(recipe['out']), 'w+') as file:
		file.write(text)