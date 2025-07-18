const { src, dest, series, watch } = require("gulp");
const autoprefixer = require('gulp-autoprefixer')
const cleanCSS = require("gulp-clean-css");
const del = require("del");
const browserSync = require("browser-sync").create();
const sass = require("sass");
const gulpSass = require("gulp-sass");
const svgSprite = require("gulp-svg-sprite");
const svgmin = require('gulp-svgmin')
const fileInclude = require('gulp-file-include')
const htmlMin = require("gulp-htmlmin");
const gulpif = require("gulp-if");
const notify = require("gulp-notify");
const image = require('gulp-imagemin')
const typograf = require('gulp-typograf')
const webp = require('gulp-webp');
const mainSass = gulpSass(sass);
const webpackStream = require("webpack-stream");
const concat = require("gulp-concat");
const uglify = require("gulp-uglify-es").default;

const srcFolder = "./src";
const buildFolder = "./build";
const paths = {
  srcSvg: `${srcFolder}/img/svg/**.svg`,
  srcImgFolder: `${srcFolder}/img`,
  buildImgFolder: `${buildFolder}/img`,
  srcScss: `${srcFolder}/scss/**/*.scss`,
  buildCssFolder: `${buildFolder}/css`,
  srcFullJs: `${srcFolder}/js/**/*.js`,
  srcMainJs: `${srcFolder}/js/main.js`,
  buildJsFolder: `${buildFolder}/js`,
  srcPartialsFolder: `${srcFolder}/partials`,
  resourcesFolder: `${srcFolder}/resources`,
};

let isProd = false;

const toProd = (done) => {
  isProd = true;
  done();
};

const clean = () => {
  return del([buildFolder]);
};

const resourses = () => {
  return src(`${paths.resourcesFolder}/**`).pipe(dest(buildFolder));
};

const styles = () => {
  return src(paths.srcScss, { sourcemaps: !isProd })
    .pipe(mainSass())
    .pipe(autoprefixer({
      cascade: false,
      grid: true,
      overrideBrowserslist: ["last 5 versions"]
    }))
    .pipe(
      gulpif(
        isProd,
        cleanCSS({
          level: 2,
        })
      )
    )
    .pipe(dest(paths.buildCssFolder, { sourcemaps: '.' }))
    .pipe(browserSync.stream());
};

const svgSprites = () => {
  return src(paths.srcSvg)
    .pipe(svgmin({
      js2svg: {
        pretty: true
      }
    }))
    .pipe(
      svgSprite({
        mode: {
          stack: {
            sprite: "../sprite.svg",
          },
        },
      })
    )
    .pipe(dest(paths.buildImgFolder));
};

const scripts = () => {
  return src(paths.srcMainJs)
    .pipe(
      webpackStream({
        mode: isProd ? "production" : "development",
        output: {
          filename: "main.js",
        },
        module: {
          rules: [{
              test: /\.m?js$/,
              exclude: /node_modules/,
              use: {
                loader: "babel-loader",
                options: {
                  presets: [
                    ["@babel/preset-env", {
                        targets: "defaults",
                      }],
                  ],
                },
              },
            }],
        },
      }))
    .pipe(uglify().on("error", notify.onError()))
    .pipe(dest(paths.buildJsFolder))
    .pipe(browserSync.stream());
};

const images = () => {
  return src([`${paths.srcImgFolder}/**/**.{jpg,jpeg,png,svg}`])
    .pipe(gulpif(isProd, image([
      image.mozjpeg({
        quality: 80,
        progressive: true
      }),
      image.optipng({
        optimizationLevel: 2
      }),
    ])))
    .pipe(dest(paths.buildImgFolder));
};

const webpImages = () => {
  return src([`${paths.srcImgFolder}/**/**.{jpg,jpeg,png}`])
    .pipe(webp())
    .pipe(dest(paths.buildImgFolder));
};

const htmlMinify = () => {
  return src(`${buildFolder}/**/*.html`)
    .pipe(htmlMin({
          collapseWhitespace: true,
        }))
    .pipe(dest(buildFolder))
};

const htmlInclude = () => {
  return src([`${srcFolder}/*.html`])
  .pipe(fileInclude({
    prefix: '@',
    basepath: '@file'
  }))
  .pipe(typograf({
    locale: ['ru', 'en-US'],
    safeTags: [
      ['<no-typography>', '</no-typography>']
    ],
  }))
  .pipe(dest(buildFolder))
  .pipe(browserSync.stream())
}

const watchFiles = () => {
  browserSync.init({
    server: {
      baseDir: `${buildFolder}`,
    },
  });

  watch(paths.srcScss, styles);
  watch(paths.srcFullJs, scripts);
  watch(`${paths.srcPartialsFolder}/*.html`, htmlInclude)
  watch(`${srcFolder}/*.html`, htmlInclude);
  watch(`${paths.resourcesFolder}/**`, resourses);
  watch(`${paths.srcImgFolder}/**/**.{jpg,jpeg,png,svg}`, images);
  watch(`${paths.srcImgFolder}/**/**.{jpg,jpeg,png}`, webpImages);
  watch(paths.srcSvg, svgSprites);
};

exports.default = series(clean, htmlInclude, scripts, styles, resourses, images, webpImages, svgSprites, watchFiles);

exports.build = series(toProd, clean, htmlInclude, scripts, styles, resourses, images, webpImages, svgSprites, htmlMinify);
