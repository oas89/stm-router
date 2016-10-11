/* jslint esversion: 6, -W097, browser: true */
/* globals console:true, require */

'use strict';

var $ = require("jquery");


class ViewManager{
    constructor(router, options) {
        if (ViewManager._singleton !== undefined) {
            throw "ViewManager can be initialized only once per page";
        }

        ViewManager._singleton = this;

        if (router) {
            this.router = router;
            router.viewManager = this;
        }

        this.options = options || this.options || {};
        this.activeViews = (options && options.activeViews) || this.activeViews || ['contentView'];
        this.urlViews = (options && options.urlViews) || this.urlViews || ['contentView'];

        this.views = [];
        this._activeView = null;

        this._namedViews = {};  // See .addView() for details

        $(document).ready(this.init.bind(this));
        return this;
    }

    init() {
        $(window).on('click.view-manager', this.onClick.bind(this));
        $(window).on('hashchange.view-manager', this.onHashChange.bind(this));
    }

    /* Event methods */
    on(events, selector, data, handler) {
        $(this).on(events, selector, data, handler);
    }

    one(events, selector, data, handler) {
        $(this).one(events, selector, data, handler);
    }

    off(events, selector, data, handler) {
        $(this).off(events, selector, data, handler);
    }

    trigger(events, extraParameters) {
        $(this).trigger(events, extraParameters);
    }

    urlForView(viewName) {
        var view = this.getView(viewName);
        var url = view.currentURL;
        if (this.options.useMaSha && 
                location.hash && location.hash.indexOf('=') != -1 &&
                (!this.getView('readerView') || viewName == 'readerView')) {
            url += location.hash;
        }
        else if (url && location.hash.length > 1 && view.element.find(location.hash)){
            url += location.hash;
        }
        return url;
    }

    getUrlState() {
        var state = {};
        for (var idx = this.urlViews.length; idx--;) {
            var viewName = this.urlViews[idx],
                view = this.getView(viewName);

            state[viewName] = view.currentURL;
        }
        return state;
    }

    onHashChange() {
        var state = this.getUrlState();
        this.router.updateState(state, $.url().attr('relative'), document.title);
    }

    getActiveView() {
        return this._activeView;
    }

    /**
     * Set active view for viewName;
     * @param {String} viewName
     * @fires ViewManager#viewactive
     */
    setActiveView(viewName) {
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
    addView(view, viewName) {
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
    getView(name) {
        return this._namedViews[name];
    }


    /**
     * Links views (that`s manager main purpose) interaction
     * This method should be called when all view appended.
     * XXX: Maybe we should call it on every 'addView' until we find all required views?
     */
    linkViews() {
        for (var i = 0; i < this.views.length; i++) {
            this.views[i].attachToDOM();
        }
    }

    refresh() {
        for (var i = 0; i < this.views.length; i++) {
            this.views[i].refresh();
        }
    }

    isInternalHost(host) {
        var domains = this.options.internalDomains || '';
        if (domains) {
            domains = '|' + domains.replace(/\./g, '\\.');
        }

        var domainRe = new RegExp('^(?:[\\w-\\.]+\\.)?(' +
                                $.url().attr('host') + domains +
                                ')$');
        //if (/^(?:http|https|ftp):\/\//.test(href) && ! domainRe.test(href))

        return domainRe.test(host);
    }

    /**
     * Determines whether to show "you are leaving the web site to external
     * resource" warning or not.
     */
    isLinkExternal(element) {
        var $currentUrl = $.url(),
            hostName = $currentUrl.attr('host'),
            path = $currentUrl.attr('path'),
            $url = $.url(element.href),
            urlHash = $url.attr('relative').split('#')[1];

        if (!element.href || $(element).hasClass('no-warning')) {
            return false;
        }

        // XXX Need a universal check for non-HTTP protocols!
        if (element.href.indexOf('mailto:') === 0 ||
            element.href.indexOf('tel:') === 0) {
            return false;
        }

        if (element.rel && (
            element.rel === 'alternate' ||
                element.rel === 'contact')) {
            return false;
        }

        if (element.rel && (
            element.rel === 'external' ||
                element.rel === 'license')) {
            return true;
        }

        return !this.isInternalHost($url.attr('host'));
    }


    /**
     * Assures that the link is refers to current domain.
     * @param {HTMLAnchorElement} element Anchor element.
     * XXX: Rename function to 'shouldHandleElementClick' or something like it
     */
    shouldHandleLink(element) {
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
        var $url = $.url(element.href);
        if ($url.attr('file')) {
            return false;
        }

        var $element = $(element);
        if ($element.data('no-ajax') || $element.data('special')) {
            return false;
        }

        var $currentUrl = $.url();
        return $url.attr('host') === $currentUrl.attr('host');
    }

    shouldHandleClick(e, el) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) { return; }
        if (e.button !== 0) { return; }
        if (e.isDefaultPrevented()) { return; }

        return this.shouldHandleLink(el);
    }

    isPrintLink(element) {
        return false;
    }

    isForceUpdateLink(element) {
        return false;
    }

    onClick(e) {
        var el = e.target;
        while (el && 'A' !== el.nodeName) { el = el.parentNode; }
        if (!el || 'A' !== el.nodeName) { return; }

        if (! this.shouldHandleClick(e, el)) { return; }

        e.preventDefault();
        e.stopPropagation();

        if (this.isPrintLink(el)) {
            window.print();
            return;
        }

        var path = el.getAttribute('href');
        if (path == '#') { return; }

        // XXX should this be in lib or in application?
        var options = {};
        var view = this.elementToView(el);
        if (view && view.startAnchorPreloader) {
            var animation = view.startAnchorPreloader(el);
            if (view.completeAnchorPreloader) {
                options.onLoaded = function() { view.completeAnchorPreloader(animation); };
            }
            if (view.cancelAnchorPreloader) {
                options.onFailed = function() { view.cancelAnchorPreloader(animation); };
                options.onAbort = 'onFailed';
            }
        }

        if (this.isForceUpdateLink(el)) {
            options.shouldNavigate = false;
            options.force = true;
        }

        this.router.handleURL(path, options);
    }

    elementToView(el) {
        for (var i=0; i < this.views.length; i++) {
            var view = this.views[i];
            if ($.contains(view.element, el)) {
                return view;
            }
        }
    }

    urlToView(url) {
        if (this.urlViews.length !== 1) { 
            throw "Not implemented";
        }
        return this.getView(this.urlViews[0]);
    }

}

export default ViewManager;

