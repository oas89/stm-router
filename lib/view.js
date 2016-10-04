/*jslint
    esversion: 6, -W097, browser: true */
/* globals jQuery:true, $:true, console:true */

'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var $ = require('jquery');

/**
 * Initialize View class. To start work, view have to be attached to DOM with .attachToDOM()
 * @class View
 * @classdesc Represent one view. Triggers events: onNavigate, onRender, onBeforeClean
 * Can be customised in options with onInit and onRender callbacks
 * @param {Object} options
 * @param {String} options.url
 * @param {Element} options.container Element for scrolling view content (like window)
 * @param {Element=} options.element Element for View
 * @param {Function} options.onRender
 * @param {Function} options.onInit Method to be called on View init, so you can tune the view.
 * @param {Function} options.isEmpty Hacky way to replace .isEmpty() method (since it required sometimes)
 */

var View = exports.View = function () {
    function View(options) {
        _classCallCheck(this, View);

        this.currentURL = options.url;
        if (options.onRender) {
            this.onRender = options.onRender;
        }
        if (options.onInit) {
            this.onInit = options.onInit;
        }
        if (options.onShow) {
            this.onShow = options.onShow;
        }
        if (options.onHide) {
            this.onHide = options.onHide;
        }
        if (options.isEmpty && typeof options.isEmpty === 'function') {
            this.isEmpty = options.isEmpty;
        }
        this.container = options.container;
        this.element = options.element;
        this.isActive = false;
        this.isLoading = false;
        this.state = {};
    }

    /**
     * Attach view to DOM (kind of INIT method, that can be called separately
     * from view instantiation).
     * @param {Element|String=} container Element (or selector) that should be used as View body
     * @param {Element|String=} element
     */


    _createClass(View, [{
        key: 'attachToDOM',
        value: function attachToDOM(container, element) {
            if (this.$element) {
                // We should skip double initialization.
                return false;
            }
            /**
             * @type {!jQuery|*|jQuery|HTMLElement}
             */
            this.$element = $(element ? element : this.element);
            this.$container = $(container ? container : this.container);
            if (!this.isEmpty() && !this.currentURL) {
                var $url = $.url(window.location.href);
                var fragment = $url.attr('fragment');
                var query = $url.attr('query');
                // Since we do not need HASH in view URL state.
                // XXX what does this comment mean? We do NOT need it, but we add
                //     it?
                this.currentURL = $url.attr('path') + (query ? '?' + query : '') + (fragment ? '#' + fragment : '');
            }
            if (this.bindEvents && typeof this.bindEvents === 'function') {
                this.bindEvents();
            }
            if (this.init && typeof this.init === 'function') {
                this.init();
            }
            if (this.onInit && typeof this.onInit === 'function') {
                this.onInit();
            }
            this.$element.data('view', this);
            this.trigger('init');
            return this;
        }

        /**
         * Returns true if View is empty
         * TODO: Do not work, since sometimes (Reader) container could have elements. FixIt
         */

    }, {
        key: 'isEmpty',
        value: function isEmpty() {
            return !this.$element.length || !this.$element.children().length;
        }

        /**
         * Update current view state (identified by URL).
         *
         * @fires View#updateState
         */

    }, {
        key: 'updateState',
        value: function updateState(url) {
            this.currentURL = url;
            //this.trigger('updateState', [url]); // XXX not used
        }

        /**
         * @param {(string|Object.<string,*>)} events
         * @param {*=} selector
         * @param {*=} data
         * @param {function(!jQuery.event=)=} handler
         * @return {View}
         */

    }, {
        key: 'on',
        value: function on(events, selector, data, handler) {
            this.$element.on(events + '.view', selector, data, handler);
            return this;
        }
    }, {
        key: 'one',
        value: function one(events, selector, data, handler) {
            this.$element.one(events, selector, data, handler);
        }

        /**
         * @param {(string|Object.<string,*>)} events
         * @param {*=} selector
         * @param {*=} data
         * @param {function(!jQuery.event=)=} handler
         * @return {View}
         */

    }, {
        key: 'off',
        value: function off(events, selector, data, handler) {
            this.$element.off(events + '.view', selector, data, handler);
            return this;
        }

        /**
         * @param {(string|jQuery.event)} events
         * @param {...*} extraParameters
         * @return {View}
         */

    }, {
        key: 'trigger',
        value: function trigger(events, extraParameters) {
            this.$element.trigger(events, extraParameters);
            return this;
        }
    }, {
        key: 'show',
        value: function show() {
            this.$element.show();
            if (typeof this.onShow === 'function') {
                this.onShow.apply(this);
            }
            this.trigger('show');
            return this;
        }
    }, {
        key: 'hide',
        value: function hide() {
            this.$element.hide();
            if (typeof this.onHide === 'function') {
                this.onHide.apply(this);
            }
            this.trigger('hide');
            return this;
        }
    }, {
        key: '_extractTitle',
        value: function _extractTitle(data) {
            return $($.parseHTML(data)).filter('title').text();
        }
    }, {
        key: '_extractAlternateURLs',
        value: function _extractAlternateURLs(data) {
            return $($.parseHTML(data)).filter('[rel="alternate"][hreflang]').map(function (i, item) {
                return { lang: $(item).prop('hreflang'), url: $(item).prop('href') };
            });
        }

        /**
         * Render data to View container. It replaces View content so it is not
         * required to do View.clean(), but remember: without clean you would louse
         * some events and also state reset.
         * XXX: Maybe to do this method private?
         * @param {String} data Data to be pasted into View container.
         */

    }, {
        key: 'render',
        value: function render(data) {
            //console.debug('[View]:#render');
            var $data = $($.parseHTML(data));
            var $selector = $data.find(this.$element.selector);
            if (!$selector.length) {
                $selector = $data.filter(this.$element.selector);
            }
            var $html = $selector.html();
            this.$element.html($html);
            if (typeof this.onRender === 'function') {
                this.onRender.apply(this);
            }
            this.trigger('render');
            return this;
        }

        /**
         * Updates view content and also changes it state. For now the only state
         * is supported is current URL.
         * @param {String} data The html code to be rendered
         * param {String} url The url to be set for this view. URL will be
         * reset on View.clean()
         */

    }, {
        key: 'update',
        value: function update(data /*, url*/) {
            this.clean();
            this.currentTitle = this._extractTitle(data);
            this.alternateURLs = this._extractAlternateURLs(data);
            if (arguments[1]) {
                this.currentURL = arguments[1];
            } else {
                this.currentURL = '';
            }

            this.render(data);
            this.bind(); // XXX is this used?
            this.trigger('update', this.currentURL);
        }
    }, {
        key: 'bind',
        value: function bind() {
            // XXX is this used?
            return this;
        }
    }, {
        key: 'unbind',
        value: function unbind() {
            // XXX is this used?
            return this;
        }
    }, {
        key: 'destroy',
        value: function destroy() {
            this.$element.remove();
            return this;
        }

        /**
         * Method for defining extra cleaning in individual views
         */

    }, {
        key: 'onBeforeClean',
        value: function onBeforeClean() {}

        /**
         * Cleans View. It cleans DOM inside view and also resets state (e.g. currentURL)
         */

    }, {
        key: 'clean',
        value: function clean() {
            // this.trigger('beforeclean');
            this.onBeforeClean();
            this.currentURL = undefined;
            this.$element.empty();
            return this;
        }

        /**
         * Scroll view to position, mentioned in `y`.
         * @param {string|Number} y Position to move to (if integer). To move
         * down 123px from current place, use '+=123' string (like in jQuery animation)
         * @param {Number=} animationDuration
         * param {function} onStep Called on each animation step, with params
         * `now` and `tween`. See jQuery's scrollTop(options.step) for details
         * @param {Object=} options
         * @param {Boolean=} options.force
         */

    }, {
        key: 'scrollTo',
        value: function scrollTo(y, animationDuration, options) {
            // XXX: Scroll should be changeable to previous scroll

            console.log('[View]: Scroll to', y, 'with animation', animationDuration);
            if (this.$container) {
                var container = this.$container;
                if (container.get(0) === document.body) {
                    container = $('html,body');
                }
                if (typeof window._technicalScroll !== 'number') {
                    window._technicalScroll = 0; // XXX hack
                }
                window._technicalScroll += 1;
                animationDuration = animationDuration ? animationDuration : 0;
                if (options && options.force) {
                    container.finish();
                }
                container.animate({ scrollTop: y }, {
                    duration: animationDuration,
                    queue: true,
                    done: function done() {
                        window.setTimeout(function () {
                            // Hack to run it AFTER onScroll  handlers =(
                            window._technicalScroll -= 1;
                        }, 100);
                    }

                });
            }
        }
    }]);

    return View;
}();