textRecipes = []
with open('../components/variables', 'r') as file:
	for var in file.readlines():
		name = var.split('=')[0].lstrip()
		value = var.split('=')[1].rstrip('\n\r')
		textRecipes.append([name, value])

fileRecipes = [
	{
		'base': '../components/userscript-base.js',
		'combine': [
			['credit', '../components/credit.js'],
			['store', '../components/store.js'],
			['main', '../components/main.js']
		],
		'out': '../script.user.js'
	},
	{
		'base': '../components/bookmarklet-base.js',
		'combine': [
			['credit', '../components/credit.js'],
			['store', '../components/store.js'],
			['main', '../components/main.js']
		],
		'out': '../bookmarklet.js'
	}
]

def replaceVars(text):
	for replacement in textRecipes:
		text = text.replace(f"/*$$${replacement[0]}$$$*/", replacement[1])
	return text

for recipe in fileRecipes:
	with open(recipe['base'], 'r') as file:
		text = replaceVars(file.read())
	
	for combination in recipe['combine']:
		with open(combination[1], 'r') as file:
			newText = replaceVars(file.read())
			text = text.replace(f"/*<<<{combination[0]}>>>*/", newText)
	
	with open(recipe['out'], 'w+') as file:
		file.write(text)
