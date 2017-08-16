'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.getRelativeUrl = getRelativeUrl;
exports.getHostname = getHostname;
exports.normalizeUrl = normalizeUrl;

var _urijs = require('urijs');

var _urijs2 = _interopRequireDefault(_urijs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function getRelativeUrl() {
    var _window$location = window.location,
        pathname = _window$location.pathname,
        search = _window$location.search,
        hash = _window$location.hash;

    return '' + pathname + search + hash;
}

/**
 * Extract hostname from URL, if no url given use current url
 * @param {String} url
 */
function getHostname(url) {
    url = url || window.location.href;
    return (0, _urijs2['default'])(url).hostname();
}

/**
 * Remove multiple slashes in url path
 * @param {String} url
 */
function normalizeUrl(url) {
    var _url$split = url.split('?'),
        _url$split2 = _slicedToArray(_url$split, 2),
        path = _url$split2[0],
        query = _url$split2[1];

    path = path.replace(/\/+/g, '/');
    return query ? [path, query].join('?') : path;
}