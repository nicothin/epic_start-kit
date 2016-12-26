'use strict';

// Читаем содержимое package.json в константу
const pjson = require('./package.json');
// Получим из константы другую константу с адресами папок сборки и исходников
const dirs = pjson.config.directories;

// Определим необходимые инструменты
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
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');
const cheerio = require('gulp-cheerio');
const svgstore = require('gulp-svgstore');
const svgmin = require('gulp-svgmin');
const base64 = require('gulp-base64');
const notify = require('gulp-notify');
const plumber = require('gulp-plumber');
const cleanCSS = require('gulp-cleancss');
const pug = require('gulp-pug');

// ЗАДАЧА: Компиляция препроцессора
gulp.task('less', function(){
  return gulp.src(dirs.source + '/less/style.less')         // какой файл компилировать (путь из константы)
    .pipe(plumber({ errorHandler: onError }))
    .pipe(sourcemaps.init())                                // инициируем карту кода
    .pipe(less())                                           // компилируем LESS
    .pipe(postcss([                                         // делаем постпроцессинг
        autoprefixer({ browsers: ['last 2 version'] }),     // автопрефиксирование
        mqpacker({ sort: true }),                           // объединение медиавыражений
    ]))
    .pipe(sourcemaps.write('/'))                            // записываем карту кода как отдельный файл (путь из константы)
    .pipe(gulp.dest(dirs.build + '/css/'))                  // записываем CSS-файл (путь из константы)
    .pipe(browserSync.stream())
    .pipe(rename('style.min.css'))                          // переименовываем
    .pipe(cleanCSS())                                       // сжимаем
    .pipe(gulp.dest(dirs.build + '/css/'));                 // записываем CSS-файл (путь из константы)
});

// ЗАДАЧА: Сборка HTML
gulp.task('html', function() {
  return gulp.src(dirs.source + '/*.html')                  // какие файлы обрабатывать (путь из константы, маска имени)
    .pipe(plumber({ errorHandler: onError }))
    .pipe(fileinclude({                                     // обрабатываем gulp-file-include
      prefix: '@@',
      basepath: '@file',
      indent: true,
    }))
    .pipe(replace(/\n\s*<!--DEV[\s\S]+?-->/gm, ''))         // убираем комментарии <!--DEV ... -->
    .pipe(gulp.dest(dirs.build));                           // записываем файлы (путь из константы)
});

gulp.task('pug', function() {
  return gulp.src(dirs.source + '/**/*.pug')
    .pipe(plumber({ errorHandler: onError }))
    .pipe(pug())
    .pipe(gulp.dest(dirs.build));
});

// ЗАДАЧА: Копирование изображений
gulp.task('img', function () {
  return gulp.src([
        dirs.source + '/img/*.{gif,png,jpg,jpeg,svg}',      // какие файлы обрабатывать (путь из константы, маска имени, много расширений)
      ],
      {since: gulp.lastRun('img')}                          // оставим в потоке обработки только изменившиеся от последнего запуска задачи (в этой сессии) файлы
    )
    .pipe(plumber({ errorHandler: onError }))
    .pipe(newer(dirs.build + '/img'))                       // оставить в потоке только новые файлы (сравниваем с содержимым папки билда)
    .pipe(gulp.dest(dirs.build + '/img'));                  // записываем файлы (путь из константы)
});

// ЗАДАЧА: Оптимизация изображений (ЗАДАЧА ЗАПУСКАЕТСЯ ТОЛЬКО ВРУЧНУЮ)
gulp.task('img:opt', function () {
  return gulp.src([
      dirs.source + '/img/*.{gif,png,jpg,jpeg,svg}',        // какие файлы обрабатывать (путь из константы, маска имени, много расширений)
      '!' + dirs.source + '/img/sprite-svg.svg',            // SVG-спрайт брать в обработку не будем
    ])
    .pipe(plumber({ errorHandler: onError }))
    .pipe(imagemin({                                        // оптимизируем
      progressive: true,
      svgoPlugins: [{removeViewBox: false}],
      use: [pngquant()]
    }))
    .pipe(gulp.dest(dirs.source + '/img'));                  // записываем файлы в исходную папку
});

// ЗАДАЧА: Сборка SVG-спрайта
gulp.task('svgstore', function (callback) {
  let spritePath = dirs.source + '/img/svg-sprite';          // константа с путем к исходникам SVG-спрайта
  if(fileExist(spritePath) !== false) {
    return gulp.src(spritePath + '/*.svg')                   // берем только SVG файлы из этой папки, подпапки игнорируем
      // .pipe(plumber({ errorHandler: onError }))
      .pipe(svgmin(function (file) {
        return {
          plugins: [{
            cleanupIDs: {
              minify: true
            }
          }]
        }
      }))
      .pipe(svgstore({ inlineSvg: true }))
      .pipe(cheerio(function ($) {
        $('svg').attr('style',  'display:none');             // дописываем получающемуся SVG-спрайту инлайновое сокрытие
      }))
      .pipe(rename('sprite-svg.svg'))
      .pipe(gulp.dest(dirs.source + '/img'));
  }
  else {
    console.log('Нет файлов для сборки SVG-спрайта');
    callback();
  }
});

// ЗАДАЧА: Очистка папки сборки
gulp.task('clean', function () {
  return del([                                              // стираем
    dirs.build + '/**/*',                                   // все файлы из папки сборки (путь из константы)
    '!' + dirs.build + '/readme.md'                         // кроме readme.md (путь из константы)
  ]);
});

// ЗАДАЧА: Конкатенация и углификация Javascript
gulp.task('js', function () {
  return gulp.src([
      // список обрабатываемых файлов
      dirs.source + '/js/jquery-3.1.0.min.js',
      dirs.source + '/js/jquery-migrate-1.4.1.min.js',
      dirs.source + '/js/owl.carousel.min.js',
      dirs.source + '/js/script.js',
    ])
    .pipe(plumber({ errorHandler: onError }))
    .pipe(concat('script.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest(dirs.build + '/js'));
});

// ЗАДАЧА: Кодирование в base64 шрифта в формате WOFF
gulp.task('css:fonts:woff', function (callback) {
  let fontCssPath = dirs.source + '/fonts/font_opensans_woff.css'; // с каким исходным файлом работаем
  if(fileExist(fontCssPath) !== false) { // если исходный файл существует, продолжим
    return gulp.src(fontCssPath)
      .pipe(plumber({ errorHandler: onError }))
      .pipe(base64({                   // ищем в CSS файле подключения сторонних ресурсов, чтоб закодировать base64 и вставить прямо в файл
        // baseDir: '/',
        extensions: ['woff'],         // только указанного тут формата ресурсов
        maxImageSize: 1024*1024,      // максимальный размер в байтах
        deleteAfterEncoding: false,   // не удаляем исходный ресурс после работы!
        // debug: true
      }))
      .pipe(gulp.dest(dirs.build + '/css')); // пишем в папку билда, именно оттуда сей файл будет стягиваться JS-ом
  }
  else {
    console.log('Файла WOFF, из которого генерируется CSS с base64-кодированным шрифтом, нет');
    console.log('Отсутствующий файл: ' + fontCssPath);
    callback();
}
});

// ЗАДАЧА: Кодирование в base64 шрифта в формате WOFF2
gulp.task('css:fonts:woff2', function (callback) {
  let fontCssPath = dirs.source + '/fonts/font_opensans_woff2.css'; // с каким исходным файлом работаем
  if(fileExist(fontCssPath) !== false) { // если исходный файл существует, продолжим
    return gulp.src(fontCssPath)
      .pipe(plumber({ errorHandler: onError }))
      .pipe(base64({                   // ищем в CSS файле подключения сторонних ресурсов, чтоб закодировать base64 и вставить прямо в файл
        // baseDir: '/',
        extensions: ['woff2'],         // только указанного тут формата ресурсов
        maxImageSize: 1024*1024,       // максимальный размер в байтах
        deleteAfterEncoding: false,    // не удаляем исходный ресурс после работы!
        // debug: true
      }))
      .pipe(replace('application/octet-stream;', 'application/font-woff2;')) // костыль, ибо mime плагин для woff2 определяет некорректно
      .pipe(gulp.dest(dirs.build + '/css')); // пишем в папку билда, именно оттуда сей файл будет стягиваться JS-ом
  }
  else {
    console.log('Файла WOFF2, из которого генерируется CSS с base64-кодированным шрифтом, нет');
    console.log('Отсутствующий файл: ' + fontCssPath);
    callback();
  }
});

// ЗАДАЧА: Сборка всего
gulp.task('build', gulp.series(                             // последовательно:
  'clean',                                                  // последовательно: очистку папки сборки
  'svgstore',
  gulp.parallel('less', 'img', 'js', 'css:fonts:woff', 'css:fonts:woff2'),
  'pug',
  'html'                                                    // последовательно: сборку разметки
));

// ЗАДАЧА: Локальный сервер, слежение
gulp.task('serve', gulp.series('build', function() {

  browserSync.init({                                        // запускаем локальный сервер (показ, автообновление, синхронизацию)
    //server: dirs.build,                                     // папка, которая будет «корнем» сервера (путь из константы)
    server: {
      baseDir: "./build/"
    },
    port: 3000,                                             // порт, на котором будет работать сервер
    startPath: '/pug/index.html',                           // файл, который буде открываться в браузере при старте сервера
    // open: false                                          // возможно, каждый раз стартовать сервер не нужно...
  });

  gulp.watch(                                               // следим за HTML
    [
      dirs.source + '/*.html',                              // в папке с исходниками
      dirs.source + '/_include/*.html',                     // и в папке с мелкими вставляющимся файлами
    ],
    gulp.series('html', reloader)                           // при изменении файлов запускаем пересборку HTML и обновление в браузере
  );

  gulp.watch(
    dirs.source + '/pug/**/*.pug',
    gulp.series('pug', reloader)
  );

  gulp.watch(                                               // следим за LESS
    dirs.source + '/less/**/*.less',
    gulp.series('less')                                     // при изменении запускаем компиляцию (обновление браузера — в задаче компиляции)
  );

  gulp.watch(                                               // следим за SVG
    dirs.source + '/img/svg-sprite/*.svg',
    gulp.series('svgstore', 'html', 'pug', reloader)
  );

  gulp.watch(                                               // следим за изображениями
    dirs.source + '/img/*.{gif,png,jpg,jpeg,svg}',
    gulp.series('img', reloader)                            // при изменении оптимизируем, копируем и обновляем в браузере
  );

  gulp.watch(                                               // следим за JS
    dirs.source + '/js/*.js',
    gulp.series('js', reloader)                            // при изменении пересобираем и обновляем в браузере
  );

}));

// ЗАДАЧА, ВЫПОЛНЯЕМАЯ ТОЛЬКО ВРУЧНУЮ: Отправка в GH pages (ветку gh-pages репозитория)
gulp.task('deploy', function() {
  return gulp.src('./build/**/*')
    .pipe(ghPages());
});

// ЗАДАЧА: Задача по умолчанию
gulp.task('default',
  gulp.series('serve')
);

// Дополнительная функция для перезагрузки в браузере
function reloader(done) {
  browserSync.reload();
  done();
}

// Проверка существования файла/папки
function fileExist(path) {
  const fs = require('fs');
  try {
    fs.statSync(path);
  } catch(err) {
    return !(err && err.code === 'ENOENT');
  }
}

var onError = function(err) {
    notify.onError({
      title: "Error in " + err.plugin,
    })(err);
    this.emit('end');
};
