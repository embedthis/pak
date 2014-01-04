require ejs.unix

App.log.activity('Compiling', 'Version.es')
Cmd.run('ejsc Version.es')

let dest = App.home.join('.ejs', 'ejs.version.mod')
App.log.activity('Installing', dest)
cp('ejs.version.mod', dest)
