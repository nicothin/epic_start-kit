'use strict';

// Определим необходимые инструменты
const gulp = require('gulp');
const less = require('gulp-less');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const mqpacker = require('css-mqpacker');
const browserSync = require('browser-sync').create();

// ЗАДАЧА: Компиляция препроцессора
gulp.task('less', function(){
  return gulp.src('./less/style.less')                      // какой файл компилировать (путь из константы)
    .pipe(sourcemaps.init())                                // инициируем карту кода
    .pipe(less())                                           // компилируем LESS
    .pipe(rename('style.css'))                              // переименовываем
    .pipe(postcss([                                         // делаем постпроцессинг
        autoprefixer({ browsers: ['last 2 version'] }),     // автопрефиксирование
        mqpacker({ sort: true }),                           // объединение медиавыражений
    ]))
    .pipe(sourcemaps.write('/'))                            // записываем карту кода как отдельный файл (путь из константы)
    .pipe(gulp.dest('./css/'))                              // записываем CSS-файл (путь из константы)
    .pipe(browserSync.stream());                            // обновляем в браузере
});

// ЗАДАЧА: Сборка HTML (заглушка)
gulp.task('html', function(callback) {
  callback();
});

// ЗАДАЧА: Сборка всего
gulp.task('build', gulp.series(
  'less'
));

// ЗАДАЧА: Локальный сервер, слежение
gulp.task('serve', gulp.series('build', function() {

  browserSync.init({                                        // запускаем локальный сервер (показ, автообновление, синхронизацию)
    server: './',                                           // папка, которая будет «корнем» сервера (путь из константы)
    port: 3000,                                             // порт, на котором будет работать сервер
    startPath: 'index.html',                                // файл, который буде открываться в браузере при старте сервера
  });

  gulp.watch(                                               // следим за HTML
    './*.html',
    gulp.series('html', reloader)                           // при изменении файлов запускаем пересборку HTML и обновление в браузере
  );

  gulp.watch(                                               // следим за LESS
    './less/**/*.less',
    gulp.series('less')                                     // при изменении запускаем компиляцию (обновление браузера — в задаче компиляции)
  );

}));

// ЗАДАЧА: Задача по умолчанию
gulp.task('default',
  gulp.series('serve')
);

// Дополнительная функция для перезагрузки в браузере
function reloader(done) {
  browserSync.reload();
  done();
}
