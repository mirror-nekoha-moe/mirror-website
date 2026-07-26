module.exports = {
    plugins: [
        require('cssnano')({
            preset: [
                'default',
                {   // remove ALL comments
                    discardComments: { removeAll: true },
                },
            ],
        }),
    ],
}
