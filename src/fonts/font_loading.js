// Подгрущка шрифтов
function loadFont(fontName, woffUrl, woff2Url) {
  // 0. Многие неподдерживаемые браузеры должны останавливать работу тут.
  var nua = navigator.userAgent;
  var noSupport = !window.addEventListener // IE8 и ниже
        || (nua.match(/(Android (2|3|4.0|4.1|4.2|4.3))|(Opera (Mini|Mobi))/) && !nua.match(/Chrome/)) // Android Stock Browser до 4.4 и Opera Mini

  if (noSupport) {
    return;
  }

  // 1. Настраиваем localStorage
  var loSto = {};
  try {
    // Устанавливаем вспомогательную переменную для помощи с localStorage,
    // например, для случаев когда cookies отключены и браузер не даёт к ним доступа.
    // Иначе могут быть получены исключения, которые полностью остановят загрузку шрифтов.
    loSto = localStorage || {};
  } catch(ex) {}

  var localStoragePrefix = 'x-font-' + fontName;
  var localStorageUrlKey = localStoragePrefix + 'url';
  var localStorageCssKey = localStoragePrefix + 'css';
  var storedFontUrl = loSto[localStorageUrlKey];
  var storedFontCss = loSto[localStorageCssKey];

  // 2. Создаём элемент <style>, который мы используем для вставки шрифта, закодированного в base64.
  var styleElement = document.createElement('style');
  styleElement.rel = 'stylesheet';
  document.head.appendChild(styleElement);
  // Из-за ошибок IE9 установка styleElement.textContent должна быть после этой строки.

  // 3. Проверяем, находится ли шрифт уже в localStorage и последней ли он версии.
  if (storedFontCss && (storedFontUrl === woffUrl || storedFontUrl === woff2Url)) {
    // css до сих пор в localStorage
    // и были загружены из одного из текущих адресов

    // 4. Применяем стили шрифта.
    styleElement.textContent = storedFontCss;
  } else {
    // Данных нет, или они загружены с устаревшего URL,
    // поэтому мы должны загрузить их снова.

    // 5. Проверяем поддержку WOFF2 чтобы узнать, какой URL использовать.
    var url = (woff2Url && supportsWoff2())
    ? woff2Url // WOFF2 URL передан в функцию и поддерживается.
    : woffUrl; // Поддерживается только WOFF.

    // 6. Получаем данные с сервера.
    var request = new XMLHttpRequest();
    request.open('GET', url);
    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        // 7. Обновляем localStorage новыми данными и применяем стили шрифта.
        loSto[localStorageUrlKey] = url;
        loSto[localStorageCssKey] = styleElement.textContent = request.responseText;
      }
    };
    request.send();
  }

  function supportsWoff2() {
    // https://github.com/filamentgroup/woff2-feature-test
    if( !( "FontFace" in window ) ) {
      return false;
    }

    var f = new FontFace('t', 'url( "data:application/font-woff2;base64,d09GMgABAAAAAADcAAoAAAAAAggAAACWAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAABk4ALAoUNAE2AiQDCAsGAAQgBSAHIBtvAcieB3aD8wURQ+TZazbRE9HvF5vde4KCYGhiCgq/NKPF0i6UIsZynbP+Xi9Ng+XLbNlmNz/xIBBqq61FIQRJhC/+QA/08PJQJ3sK5TZFMlWzC/iK5GUN40psgqvxwBjBOg6JUSJ7ewyKE2AAaXZrfUB4v+hze37ugJ9d+DeYqiDwVgCawviwVFGnuttkLqIMGivmDg" ) format( "woff2" )', {});
    f.load()['catch'](function() {});

    return f.status == 'loading';
  }
}
