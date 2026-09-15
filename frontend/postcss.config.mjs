import autoprefixer from 'autoprefixer';

export default {
  plugins: [
    autoprefixer({
      // Autoprefixer will use the browserslist configuration from .browserslistrc
      // No need to duplicate browser list here
    }),
  ],
};
