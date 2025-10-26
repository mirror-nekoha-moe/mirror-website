module.exports = {
  plugins: [
    require('cssnano')({
      preset: [
        'default',
        {
          discardComments: { removeAll: true }, // remove ALL comments
        },
      ],
    }),
  ],
}
