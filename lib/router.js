/*jslint esversion: 6, -W097, browser: true */
/* globals console, require */

'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

require('core-js/es5');
var $ = require('jquery');

/**
 * handlerCallback is  a callback that run when handler is picked up and XHR finished
 *
 * @callback handlerCallback
 * @param {String} url URL that we navigating to
 * @param {String|Element|jQuery} data Data received from server
 * @param {Boolean} shouldNavigate If set to False it means this is background load
 *                  and we do not need to perform some actions (e.g. close Reader)
 * @param {String} from Where does load request come from: 'popstate' or 'external' call
 * @param {Object=} state Current state object (came from History API)
 */

/**
 * Creates router
 * @class
 * @classdesc Set of handlers that can process URL handling. Each handler is
 * an object.
 * Router has to distinct cases in behaviour: when we handle 'onpopstate'
 * history event and when some code delegates it to go to some URL. There
 * is also one extra variation for second behaviour, when we need to load
 * data for some URL in background (with DOM changes on success but without
 * navigating to new URL; it used when Reader page loaded synchronously
 * to load list column).
 * Therefor we pass to handler more then URL and received data, but also
 * `from`, `shouldNavigate` and `state` (for future uses) arguments.
 * @see handlerCallback documentation for details.
 */

var Router = function () {
    function Router(options) {
        _classCallCheck(this, Router);

        this.options = options || {};
        this.handlers = [];

        this.supportsPushState = typeof window.history.pushState === 'function';

        if (history.state && history.state.uid) {
            this.currentUid = this.uid = history.state.uid;
        } else {
            this.currentUid = this.uid = 0;
        }
        this.initialPop = true;
        this.initialURL = window.location.href;

        if ('state' in window.history) {
            this.initialPop = false;
        }

        $(document).ready(function () {
            // Binds popstate to handle back and forward browser history movements.
            $(window).on('popstate.router', this.onPopState.bind(this));
        }.bind(this));
    }

    _createClass(Router, [{
        key: 'onPopState',
        value: function onPopState(e) {
            console.log('[Router]: window onPopstate handler. e.state:', e.originalEvent.state, ', window.history.state:', window.history.state);

            var state = e.originalEvent.state;
            if (state && state.uid && !this.uid) {
                this.uid = this.currentUid = state.uid;
            }

            if (this.skip) {
                this.skip = false;
                return;
            }

            if (this.initialPop && state && this.initialURL === state.url) {
                return;
            }

            // In chrome and safari popstate happens on pages load, but there
            // is no way to filter it out without filtering out 'go-back' actions
            // to first page. So following code leads to double page load
            // in Chrome and Safari.
            if (state) {
                if (typeof this.options.beforeUnload === 'function') {
                    var promptMessage = this.options.beforeUnload();
                    // XXX synchronous
                    if (promptMessage && !window.confirm(promptMessage)) {
                        // revert popstate action
                        if (state && state.uid > this.currentUid) {
                            history.back();
                        } else {
                            history.forward();
                        }
                        this.skip = true;
                        return;
                    }
                }

                this.currentUid = state.uid;
                if (state.contentView && state.readerView) {
                    this._load(state.contentView, { shouldNavigate: false, from: 'popstate', state: state });
                }
                // $.url().attr('relative') returns unicode, which is misinterpreted by IE11.
                // Don't use it.
                var l = window.location;
                var url = l.pathname + l.search + l.hash;
                this._load(url, { shouldNavigate: false, from: 'popstate', state: state });
            }

            this.initialPop = false;
        }
    }, {
        key: 'start',
        value: function start() {
            //console.debug('[Router]#start');
            if (!history.state) {
                var state = {},
                    views = this.viewManager.views;
                for (var idx = views.length; idx--;) {
                    var view = views[idx],
                        viewName = view.constructor.name,
                        _url = view.currentURL;

                    if (!!_url) {
                        state[viewName] = _url;
                    }
                }
                var url = $.url().attr('relative');
                this.updateState(state, url, document.title);
            }
            this._route($.url().attr('relative'), $('html').html(), { from: 'initial' });
        }

        /**
         * Adds handler to the handler list.
         * Handler description
         */

    }, {
        key: 'map',
        value: function map(handler) {
            this.handlers.push(handler);
        }

        /**
         * Changes browser URL and that's it.
         * XXX: Bad naming since in Backbone.js and durandal.js it used in other way, as we use .load().
         */

    }, {
        key: 'navigate',
        value: function navigate(state, url, title) {
            console.log('[Router]: old state', url, state);
            console.log('[Router]: now will navigate to', url, state);
            if ('pushState' in window.history) {
                this.currentUid = state.uid = ++this.uid;
                window.history.pushState(state, title, url);
            }
            //this.trigger('navigated'); // XXX not used
        }

        /**
         * Remove multiple slashes in url path
         */

    }, {
        key: '_normalizeUrl',
        value: function _normalizeUrl(url) {
            var _url$split = url.split('?'),
                _url$split2 = _slicedToArray(_url$split, 2),
                path = _url$split2[0],
                query = _url$split2[1];

            path = path.replace(/\/+/g, '/');
            if (query) {
                url = [path, query].join('?');
            } else {
                url = path;
            }
            return url;
        }

        /**
         * Proxy for history.replaceState.
         * XXX: Bad naming.
         */

    }, {
        key: 'updateState',
        value: function updateState(state, url, title) {
            url = this._normalizeUrl(url);
            console.log('[Router]: replaceState', url, state);
            if ('replaceState' in window.history) {
                state.uid = history.uid;
                window.history.replaceState(state, title, url);
            }
            //this.trigger('replaceState'); // XXX not used
        }

        /**
         * Iterates through all handlers and tests them.
         * @param {String} url
         * @param {Object} data
         * @param {Object} options
         * @private
         */

    }, {
        key: '_route',
        value: function _route(url, data, options, view) {
            var state, handler;
            options = $.extend({ shouldNavigate: true }, options);
            // In case there is no handler, we have to navigate to passed URL
            //if (this.handlers.length === 0 && window.location.href !== url) {
            //    window.location.href = url;
            //}


            this.viewManager.onRoute(url, data, options.from, options.state, options);

            view = view || this.viewManager.urlToView(url);
            if (typeof view.onRoute === 'function') {
                view.onRoute(url, data, options.from, options.state, options);
            }
        }

        //_urlServerPart(url) {
        //    if (typeof url === 'string') { url = $.url(url) };
        //    return url.attr('relative').split('#')[0];
        //}

        /**
         * Create and trigger XHR request for passed URL.
         * @param {String} url
         * @param {Object} options
         */

    }, {
        key: '_load',
        value: function _load(url, options) {
            //var url = $.url(url).attr('relative');
            var view = this.viewManager.urlToView(url);
            //console.log('[Router] route to view', view, 'url', url);

            if (!view.reloadIsRequired(url, options) && !options.force) {
                console.log('[Router] without reload', url, view.constructor.name);

                this._route(url, null, options, view);
                this.trigger('loaded', url, {}, options); // XXX the interface differs here and in _load!
                if (options && options.onLoaded) {
                    options.onLoaded.call(this, url, {}, options);
                }
                return;
            }

            // We should stop previous loading if new request accepted
            if (this._xhr) {
                if (options.state && options.state.contentView == this._xhr.url && options.state.readerView == url) {
                    //  _load is called for both contentView and readerView!
                    //  this is workaround for that case:
                    //  when contentView generates an xhr,
                    //  it should not be cancelled by readerView
                } else if (this._xhr.url !== url) {
                    this.abort();
                } else if (this._xhr.state() === 'pending') {
                    return;
                }
            }

            //console.log('[Router]#_load', url, options);
            this.trigger('willLoad', url); // used to highlight links

            // XXX _load is called for both contentView and readerView!
            //     these lines cause a bug for sure, but it is not caught yet
            if (options.state) {
                options.state.url = url;
            }

            var data = options.data || [];
            if (!(data instanceof Array)) {
                throw 'options.data must be an array';
            }
            if (history.state && history.state.contentView) {
                // Include referer into a page loaded from search
                // Used to collect stats
                var referer = history.state.contentView;
                if (referer.split('?')[0] == '/search') {
                    data = Array.prototype.slice.call(data);
                    data.push({ name: 'utm_contentview',
                        value: referer.split('#')[0] });
                }
            }

            this._xhr = $.get(url, data).done(function (data, textStatus, jqXHR) {
                this._xhr = null;
                //console.log('[Router]#_load loaded', url, options);
                this._route(url, data, options, view);
                this.trigger('loaded', [url, data, options]);
                if (options && options.onLoaded) {
                    options.onLoaded.call(this, url, {}, options);
                }
            }.bind(this)).fail(function (jqXHR, textStatus, errorThrown) {
                this._xhr = null;
                if (textStatus !== 'abort') {
                    this.trigger('failed', { url: url });
                    if (options && options.onFailed) {
                        options.onFailed.call(this, { url: url });
                    }
                }
            }.bind(this));
            this._xhr.url = url;
            this._xhr.options = options;
        }
    }, {
        key: 'abort',
        value: function abort() {
            if (this._xhr) {
                var options = this._xhr.options;
                // easy way to define same handler for abort and failed
                var onAbort = options && options.onAbort;
                onAbort = onAbort === 'onFailed' ? options.onFailed : onAbort;
                var url = this._xhr.url;

                this._xhr.abort();

                this.trigger('abort', { url: url });
                if (onAbort) {
                    onAbort.call(this, options);
                }
            }
        }

        /**
         * Load some URL.
         * @param {String} url URL to load using AJAX.
         * @param {Object=} options
         * @param {Boolean=} options.shouldNavigate Whether we should change URL in location or not.
         *      This is useful when we need refres content for URL withoud pushing URL to history.
         *      It's equivalent to `load in background and render but do not change state`.
         */

    }, {
        key: 'handleURL',
        value: function handleURL(url, options) {
            if (!this.supportsPushState) {
                if (options && options.from == 'initial') {
                    // Handle left column loading in browsers that do not support
                    // History API.
                    // Otherwise the left column is just closed
                    this._load(url, options);
                    return;
                }
                this._fallback($.extend({ url: url }, options));
                return;
            }
            if (!options) {
                options = { data: [] };
            }

            var _options = $.extend({}, { from: 'external' }, options);
            this._load(url, _options);
        }

        /**
         * Adds event listener to an instance.
         * @param {(string|Object.<string,*>)} events
         * @param {*=} selector
         * @param {*=} data
         * @param {function(!jQuery.event=)=} handler
         */

    }, {
        key: 'on',
        value: function on(events, selector, data, handler) {
            $(this).on(events, selector, data, handler);
        }

        /**
         * Adds event listener that will fire just once.
         * @param {(string|Object.<string,*>)} events
         * @param {*=} selector
         * @param {*=} data
         * @param {function(!jQuery.event=)=} handler
         */

    }, {
        key: 'one',
        value: function one(events, selector, data, handler) {
            $(this).one(events, selector, data, handler);
        }

        /**
         * Removes event listener.
         * @param {(string|Object.<string,*>)} events
         * @param {*=} selector
         * @param {*=} data
         * @param {function(!jQuery.event=)=} handler
         */

    }, {
        key: 'off',
        value: function off(events, selector, data, handler) {
            $(this).off(events, selector, data, handler);
        }

        /**
         * Fires event on an instance.
         * @param {String} events
         * @param {Object} params
         */

    }, {
        key: 'trigger',
        value: function trigger(events, params) {
            $(this).trigger(events, params);
        }
    }, {
        key: '_fallback',
        value: function _fallback(options) {
            var url = $.isFunction(options.url) ? options.url() : options.url,
                method = options.type ? options.type.toUpperCase() : 'GET';

            var form = $('<form>', {
                method: method === 'GET' ? 'GET' : 'POST',
                action: url,
                style: 'display:none'
            });

            if (method !== 'GET' && method !== 'POST') {
                form.append($('<input>', {
                    type: 'hidden',
                    name: '_method',
                    value: method.toLowerCase()
                }));
            }

            var data = options.data;

            if (typeof data === 'string') {
                $.each(data.split('&'), function (index, value) {
                    var pair = value.split('=');
                    form.append($('<input>', { type: 'hidden', name: pair[0], value: pair[1] }));
                });
            } else if ($.isArray(data)) {
                for (var i = 0; i < data.length; i++) {
                    if (data[i].value) {
                        form.append($('<input>', $.extend({ type: 'hidden' }, data[i])));
                    }
                }
            } else if ((typeof data === 'undefined' ? 'undefined' : _typeof(data)) === 'object') {
                for (var key in data) {
                    if (data.hasOwnProperty(key)) {
                        form.append($('<input>', { type: 'hidden', name: key, value: data[key] }));
                    }
                }
            }
            form.append('<input type="submit" value="Submit" />');
            $(document.body).append(form);
            form.submit();
        }
    }]);

    return Router;
}();

exports['default'] = Router;