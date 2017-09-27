/* jslint esversion: 6, -W097, browser: true */
/* globals console:true, require */

'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ViewManager = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _util = require('./util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ViewManager = exports.ViewManager = function () {
    function ViewManager(router, options) {
        _classCallCheck(this, ViewManager);

        if (ViewManager._singleton !== undefined) {
            throw "ViewManager can be initialized only once per page";
        }

        ViewManager._singleton = this;

        if (router) {
            this.router = router;
            router.viewManager = this;
        }

        this.options = options || this.options || {};
        this.activeViews = options && options.activeViews || this.activeViews || ['contentView'];
        this.urlViews = options && options.urlViews || this.urlViews || ['contentView'];

        this.views = [];
        this._activeView = null;

        this._namedViews = {}; // See .addView() for details

        (0, _jquery2['default'])(document).ready(this.init.bind(this));
        return this;
    }

    _createClass(ViewManager, [{
        key: 'init',
        value: function init() {
            (0, _jquery2['default'])(window).on('click.view-manager', this.onClick.bind(this));
            (0, _jquery2['default'])(window).on('hashchange.view-manager', this.onHashChange.bind(this));
        }

        /* Event methods */

    }, {
        key: 'on',
        value: function on(events, selector, data, handler) {
            (0, _jquery2['default'])(this).on(events, selector, data, handler);
        }
    }, {
        key: 'one',
        value: function one(events, selector, data, handler) {
            (0, _jquery2['default'])(this).one(events, selector, data, handler);
        }
    }, {
        key: 'off',
        value: function off(events, selector, data, handler) {
            (0, _jquery2['default'])(this).off(events, selector, data, handler);
        }
    }, {
        key: 'trigger',
        value: function trigger(events, extraParameters) {
            (0, _jquery2['default'])(this).trigger(events, extraParameters);
        }
    }, {
        key: 'urlForView',
        value: function urlForView(viewName) {
            var view = this.getView(viewName);
            var url = view.currentURL;
            if (this.options.useMaSha && location.hash && location.hash.indexOf('=') != -1 && (!this.getView('readerView') || viewName == 'readerView')) {
                url += location.hash;
            } else if (url && location.hash.length > 1 && view.element.find(location.hash)) {
                url += location.hash;
            }
            return url;
        }
    }, {
        key: 'getUrlState',
        value: function getUrlState() {
            var state = {};
            for (var idx = this.urlViews.length; idx--;) {
                var viewName = this.urlViews[idx],
                    view = this.getView(viewName);

                state[viewName] = view.currentURL;
            }
            return state;
        }
    }, {
        key: 'onHashChange',
        value: function onHashChange() {
            var state = this.getUrlState();
            var url = (0, _util.getRelativeUrl)();
            this.router.updateState(state, url, document.title);
        }
    }, {
        key: 'getActiveView',
        value: function getActiveView() {
            return this._activeView;
        }

        /**
         * Set active view for viewName;
         * @param {String} viewName
         * @fires ViewManager#viewactive
         */

    }, {
        key: 'setActiveView',
        value: function setActiveView(viewName) {
            var views = this.activeViews;
            for (var i = 0; i < views.length; i++) {
                var view = views[i];
                if (view === viewName) {
                    var newActiveView = this.getView(viewName);
                    if (newActiveView === this._activeView) {
                        this.trigger('viewactivate', [viewName, newActiveView]);
                    }
                    this._activeView = newActiveView;
                }
            }
        }

        /**
         * Add view to manager.
         * View can have a name. If it presented, you can access it by
         * viewManager.getView('name');
         * @param {Object} view
         * @param {String=} viewName
         */

    }, {
        key: 'addView',
        value: function addView(view, viewName) {
            this.views.push(view);
            if (viewName) {
                this._namedViews[viewName] = view;
            }
        }

        /**
         * Returns View by name.
         * @param {String} name
         * @return {View}
         */

    }, {
        key: 'getView',
        value: function getView(name) {
            return this._namedViews[name];
        }

        /**
         * Links views (that`s manager main purpose) interaction
         * This method should be called when all view appended.
         * XXX: Maybe we should call it on every 'addView' until we find all required views?
         */

    }, {
        key: 'linkViews',
        value: function linkViews() {
            for (var i = 0; i < this.views.length; i++) {
                this.views[i].attachToDOM();
            }
        }
    }, {
        key: 'refresh',
        value: function refresh() {
            for (var i = 0; i < this.views.length; i++) {
                this.views[i].refresh();
            }
        }
    }, {
        key: 'isInternalHost',
        value: function isInternalHost(host) {
            var domains = this.options.internalDomains || '';
            if (domains) {
                domains = '|' + domains.replace(/\./g, '\\.');
            }
            var domainRe = new RegExp('^(?:[\\w-\\.]+\\.)?(' + host + domains + ')$');
            return domainRe.test(host);
        }

        /**
         * Determines whether to show "you are leaving the web site to external
         * resource" warning or not.
         */

    }, {
        key: 'isLinkExternal',
        value: function isLinkExternal(element) {
            if (!element.href || (0, _jquery2['default'])(element).hasClass('no-warning')) {
                return false;
            }

            // XXX Need a universal check for non-HTTP protocols!
            if (element.href.indexOf('mailto:') === 0 || element.href.indexOf('tel:') === 0) {
                return false;
            }

            if (element.rel && (element.rel === 'alternate' || element.rel === 'contact')) {
                return false;
            }

            if (element.rel && (element.rel === 'external' || element.rel === 'noopener' || element.rel === 'license')) {
                return true;
            }

            return !this.isInternalHost((0, _util.getHostname)());
        }

        /**
         * Assures that the link is refers to current domain.
         * @param {HTMLAnchorElement} element Anchor element.
         * XXX: Rename function to 'shouldHandleElementClick' or something like it
         */

    }, {
        key: 'shouldHandleLink',
        value: function shouldHandleLink(element) {
            if (!element.href) {
                return false;
            }

            if (this.isLinkExternal(element)) {
                return false;
            }

            if (element.rel && element.rel === 'alternate') {
                return false;
            }

            // Do not handle files.
            if (element.href.indexOf('file:') === 0) {
                return false;
            }

            var $element = (0, _jquery2['default'])(element);
            if ($element.data('no-ajax') || $element.data('special')) {
                return false;
            }

            return (0, _util.getHostname)(element.href) === (0, _util.getHostname)();
        }
    }, {
        key: 'shouldHandleClick',
        value: function shouldHandleClick(e, el) {
            if (e.metaKey || e.ctrlKey || e.shiftKey) {
                return;
            }
            if (e.button !== 0) {
                return;
            }
            if (e.isDefaultPrevented()) {
                return;
            }

            return this.shouldHandleLink(el);
        }
    }, {
        key: 'isPrintLink',
        value: function isPrintLink(element) {
            return false;
        }
    }, {
        key: 'isForceUpdateLink',
        value: function isForceUpdateLink(element) {
            return false;
        }
    }, {
        key: 'printPage',
        value: function printPage(el) {
            window.print();
        }
    }, {
        key: 'onClick',
        value: function onClick(e) {
            var el = e.target;
            while (el && 'A' !== el.nodeName) {
                el = el.parentNode;
            }
            if (!el || 'A' !== el.nodeName) {
                return;
            }

            if (!this.shouldHandleClick(e, el)) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            if (this.isPrintLink(el)) {
                this.printPage(el);
                return;
            }

            var path = el.getAttribute('href');
            if (path == '#') {
                return;
            }

            var customHandling = this.onClickHook(el, path);
            if (customHandling === true) {
                return;
            }

            // XXX should this be in lib or in application?
            var options = {};
            var view = this.elementToView(el);
            if (view && view.startAnchorPreloader) {
                var animation = view.startAnchorPreloader(el);
                if (view.completeAnchorPreloader) {
                    options.onLoaded = function () {
                        view.completeAnchorPreloader(animation);
                    };
                }
                if (view.cancelAnchorPreloader) {
                    options.onFailed = function () {
                        view.cancelAnchorPreloader(animation);
                    };
                    options.onAbort = 'onFailed';
                }
            }

            if (this.isForceUpdateLink(el)) {
                options.shouldNavigate = false;
                options.force = true;
            }

            this.router.handleURL(path, options);
        }
    }, {
        key: 'onClickHook',
        value: function onClickHook(el, path) {}
    }, {
        key: 'elementToView',
        value: function elementToView(el) {
            for (var i = 0; i < this.views.length; i++) {
                var view = this.views[i];
                if (_jquery2['default'].contains(view.element, el)) {
                    return view;
                }
            }
        }
    }, {
        key: 'urlToView',
        value: function urlToView(url) {
            if (this.urlViews.length !== 1) {
                throw "Not implemented";
            }
            return this.getView(this.urlViews[0]);
        }
    }, {
        key: 'onRoute',
        value: function onRoute(url, data, from, state, options) {}
    }]);

    return ViewManager;
}();