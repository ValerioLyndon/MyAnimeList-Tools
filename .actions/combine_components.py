import os

# get script path
script_path = os.path.abspath(__file__)
# set repo base path
base_path = os.path.dirname(os.path.dirname(script_path))
# set cwd
os.chdir(base_path)

def path(sub_path):
	return os.path.join(base_path, sub_path)

textRecipes = []
with open(path('components/variables'), 'r') as file:
	for var in file.readlines():
		name = var.split('=')[0].lstrip()
		value = var.split('=')[1].rstrip('\n\r')
		textRecipes.append([name, value])

fileRecipes = [
	{
		'base': 'components/userscript-base.js',
		'combine': [
			['credit', 'components/credit.js'],
			['store', 'components/store.js'],
			['main', 'components/main.js']
		],
		'out': 'script.user.js'
	},
	{
		'base': 'components/bookmarklet-base.js',
		'combine': [
			['credit', 'components/credit.js'],
			['store', 'components/store.js'],
			['main', 'components/main.js']
		],
		'out': 'bookmarklet.js'
	}
]

def replaceVars(text):
	for replacement in textRecipes:
		text = text.replace(f"/*$$${replacement[0]}$$$*/", replacement[1])
	return text

for recipe in fileRecipes:
	with open(path(recipe['base']), 'r') as file:
		text = replaceVars(file.read())
	
	for combination in recipe['combine']:
		with open(path(combination[1]), 'r') as file:
			newText = replaceVars(file.read())
			text = text.replace(f"/*<<<{combination[0]}>>>*/", newText)
	
	with open(path(recipe['out']), 'w+') as file:
		file.write(text)

# Create bookmarklet version without whitespace for testing purposes

import re
with open(path('bookmarklet.js'), 'r') as infile:
	with open(path('bookmarklet-test.nfp.js'), 'w') as outfile:
		text = infile.read()
		text = re.sub(r"[\n\r]", '', text)
		outfile.write(text)