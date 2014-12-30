Expansive.load({
    meta: {
        title:       'Embedthis Pak Documentation',
        url:         'https://embedthis.com/pak/doc/',
        description: 'Package manager for Embedded Applications',
    },

    expansive: {
        copy:    [ 'images' ],
        dependencies: { 'css/all.css.less': '**.less' },
        documents: [ '**', '!**.less', '**.css.less' ],
        plugins: [ 'less' ],
    }
})
