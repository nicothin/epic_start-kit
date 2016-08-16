'use strict';

const pjson = require('./package.json');
const dirs = pjson.config.directories;

const gulp = require('gulp');
const less = require('gulp-less');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const mqpacker = require('css-mqpacker');
const replace = require('gulp-replace');
const fileinclude = require('gulp-file-include');
const del = require('del');
const browserSync = require('browser-sync').create();
const ghPages = require('gulp-gh-pages');
const newer = require('gulp-newer');
const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');

// Компиляция препроцессора
gulp.task('less', function(){
  return gulp.src(dirs.source + '/less/style.less')
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(rename('style.css'))
    .pipe(postcss([
        autoprefixer({browsers: ['last 2 version']}),
        mqpacker({
          sort: true
        }),
    ]))
    .pipe(sourcemaps.write('/'))
    .pipe(gulp.dest(dirs.build + '/css/'))
    .pipe(browserSync.stream());
});

// Сборка HTML
gulp.task('html', function() {
  return gulp.src(dirs.source + '/*.html')
    .pipe(fileinclude({
      prefix: '@@',
      basepath: '@file',
      indent: true,
    }))
    .pipe(replace(/\n\s*<!--DEV[\s\S]+?-->/gm, ''))
    .pipe(gulp.dest(dirs.build));
});

// Копирование и оптимизация изображений
gulp.task('img', function () {
  return gulp.src(dirs.source + '/img/*.{gif,png,jpg,jpeg,svg}', {since: gulp.lastRun('img')}) // только для изменившихся с последнего запуска файлов
    .pipe(newer(dirs.build + '/img'))  // оставить в потоке только изменившиеся файлы
    .pipe(imagemin({
        progressive: true,
        svgoPlugins: [{removeViewBox: false}],
        use: [pngquant()]
    }))
    .pipe(gulp.dest(dirs.build + '/img'));
});

// Очистка папки сборки
gulp.task('clean', function () {
  return del([
    dirs.build + '/**/*',
    '!' + dirs.build + '/readme.md'
  ]);
});

// Сборка всего
gulp.task('build', gulp.series(
  'clean',
  gulp.parallel('less'),
  'html'
));

// Локальный сервер, слежение
gulp.task('serve', gulp.series('build', function() {
  browserSync.init({
    server: dirs.build,
    port: 3000,
    startPath: 'index.html'
  });
  gulp.watch([
    dirs.source + '/*.html',
    dirs.source + '/_include/*.html',
  ], gulp.series('html', reloader));
  gulp.watch(dirs.source + '/less/**/*.less', gulp.series('less'));
  gulp.watch(dirs.source + '/img/*.{gif,png,jpg,jpeg,svg}', gulp.series('img', reloader));
  // gulp.watch(blocks.js, gulp.series('js', reloader));
}));

// Отправка в GH pages (ветку gh-pages репозитория)
gulp.task('deploy', function() {
  return gulp.src('./build/**/*')
    .pipe(ghPages());
});

// Задача по умолчанию
gulp.task('default',
  gulp.series('serve')
);

// Перезагрузка в браузере
function reloader(done) {
  browserSync.reload();
  done();
}
