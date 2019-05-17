import os

out = '''
<!DOCTYPE html>
<meta charset="utf-8">
<body>
<h3> SPRING menu </h3>
'''

for f in os.listdir('.'):
	if f != 'scripts' and (not '.' in f):
		out += '\n<a href="springViewer.html?'+f+'">'+f+'</a><br>'

out += '\n</body>'

open('menu.html','w').write(out)
		