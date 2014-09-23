Expansive.load({
    meta: {
        title:       'Embedthis Pak Documentation',
        url:         'https://embedthis.com/pak/doc/',
        description: 'Package manager for Embedded Applications',
        keywords:    'package, package manager, embedded, npm',
    },

    expansive: {
        copy:    [ 'images' ],
        dependencies: { 'css/all.css.less': 'css/*.inc.less' },
        documents: [ '**', '!css/*.inc.less' ],
        plugins: [ 'less' ],
    }
})
