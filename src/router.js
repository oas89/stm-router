/*jslint esversion: 6, -W097, browser: true */
/* globals console, require */

'use strict';

import 'core-js/es5';
import $ from 'jquery';
import {getRelativeUrl, normalizeUrl} from './util';

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
export class Router{
    constructor(options) {
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


        $(document).ready(function() {
            // Binds popstate to handle back and forward browser history movements.
            $(window).on('popstate.router', this.onPopState.bind(this));
        }.bind(this));
    }

    onPopState(e) {
        console.log(
            '[Router]: window onPopstate handler. e.state:', e.originalEvent.state,
            ', window.history.state:', window.history.state
        );

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
                if (promptMessage && !window.confirm(promptMessage)){
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
                this._load(state.contentView, {shouldNavigate: false, from: 'popstate', state: state});
            }
            let url = getRelativeUrl();
            this._load(url, {shouldNavigate: false, from: 'popstate', state: state});
        }

        this.initialPop = false;
    }

    start() {
        let currentUrl = getRelativeUrl();
        if (!history.state) {
            let state = {},
                views = this.viewManager.views;
            for (let idx = views.length; idx--;) {
                let view = views[idx],
                    viewName = view.constructor.name,
                    url = view.currentURL;

                if (!!url) {
                    state[viewName] = url;
                }
            }
            this.updateState(state, currentUrl, document.title);
        }
        this._route(currentUrl, $('html').html(), {from: 'initial'});
    }

    /**
     * Adds handler to the handler list.
     * Handler description
     */
    map(handler) {
        this.handlers.push(handler);
    }

    /**
     * Changes browser URL and that's it.
     * XXX: Bad naming since in Backbone.js and durandal.js it used in other way, as we use .load().
     */
    navigate(state, url, title) {
        console.log('[Router]: old state', url, state);
        console.log('[Router]: now will navigate to', url, state);
        if ('pushState' in window.history) {
            this.currentUid = state.uid = ++this.uid;
            window.history.pushState(state, title, url);
        }
        //this.trigger('navigated'); // XXX not used
    }

    /**
     * Proxy for history.replaceState.
     * XXX: Bad naming.
     */
    updateState(state, url, title) {
        url = normalizeUrl(url);
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
    _route(url, data, options, view) {
        var state,
            handler;
        options = $.extend({shouldNavigate: true}, options);
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

    /**
     * Create and trigger XHR request for passed URL.
     * @param {String} url
     * @param {Object} options
     */
    _load(url, options) {
        var view = this.viewManager.urlToView(url);
        //console.log('[Router] route to view', view, 'url', url);

        if (!view.reloadIsRequired(url, options) && !options.force) {
            console.log('[Router] without reload', url, view.constructor.name);

            this._route(url, null, options, view);
            this.trigger('loaded', url, {}, options); // XXX the interface differs here and in _load!
            if (options && options.onLoaded) { options.onLoaded.call(this, url, {}, options); }
            return;
        }

        // We should stop previous loading if new request accepted
        if (this._xhr) {
            if (options.state &&
                options.state.contentView == this._xhr.url &&
                options.state.readerView == url) {
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
        if (! (data instanceof Array)) {
            throw 'options.data must be an array';
        }
        if (history.state && history.state.contentView) {
            // Include referer into a page loaded from search
            // Used to collect stats
            var referer = history.state.contentView;
            if (referer.split('?')[0] == '/search') {
                data = Array.prototype.slice.call(data);
                data.push({name: 'utm_contentview',
                           value: referer.split('#')[0]});
            }
        }

        this._xhr = $.get(url, data)
            .done(function(data, textStatus, jqXHR) {
                this._xhr = null;
                //console.log('[Router]#_load loaded', url, options);
                this._route(url, data, options, view);
                this.trigger('loaded', [url, data, options]);
                if (options && options.onLoaded) { options.onLoaded.call(this, url, {}, options); }
            }.bind(this))
            .fail(function(jqXHR, textStatus, errorThrown) {
                this._xhr = null;
                if (textStatus !== 'abort') {
                    this.trigger('failed', {url: url});
                    if (options && options.onFailed) { options.onFailed.call(this, {url: url}); }
                }
            }.bind(this));
        this._xhr.url = url;
        this._xhr.options = options;
    }

    abort() {
        if (this._xhr) {
            var options = this._xhr.options;
            // easy way to define same handler for abort and failed
            var onAbort = options && options.onAbort;
            onAbort = (onAbort === 'onFailed') ? options.onFailed : onAbort;
            var url = this._xhr.url;

            this._xhr.abort();

            this.trigger('abort', {url: url});
            if (onAbort) { onAbort.call(this, options); }
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
    handleURL(url, options) {
        if (!this.supportsPushState) {
            if (options && options.from == 'initial') {
                // Handle left column loading in browsers that do not support
                // History API.
                // Otherwise the left column is just closed
                this._load(url, options);
                return;
            }
            this._fallback($.extend({url: url}, options));
            return;
        }
        if (!options) {
            options = {data: []};
        }

        var _options = $.extend({}, {from: 'external'}, options);
        this._load(url, _options);
    }

    /**
     * Adds event listener to an instance.
     * @param {(string|Object.<string,*>)} events
     * @param {*=} selector
     * @param {*=} data
     * @param {function(!jQuery.event=)=} handler
     */
    on(events, selector, data, handler) {
        $(this).on(events, selector, data, handler);
    }

    /**
     * Adds event listener that will fire just once.
     * @param {(string|Object.<string,*>)} events
     * @param {*=} selector
     * @param {*=} data
     * @param {function(!jQuery.event=)=} handler
     */
    one(events, selector, data, handler) {
        $(this).one(events, selector, data, handler);
    }

    /**
     * Removes event listener.
     * @param {(string|Object.<string,*>)} events
     * @param {*=} selector
     * @param {*=} data
     * @param {function(!jQuery.event=)=} handler
     */
    off(events, selector, data, handler) {
        $(this).off(events, selector, data, handler);
    }

    /**
     * Fires event on an instance.
     * @param {String} events
     * @param {Object} params
     */
    trigger(events, params) {
        $(this).trigger(events, params);
    }

    _fallback(options) {
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
            $.each(data.split('&'), function(index, value) {
                var pair = value.split('=');
                form.append($('<input>', {type: 'hidden', name: pair[0], value: pair[1]}));
            });
        } else if ($.isArray(data)) {
            for (var i = 0; i < data.length; i++) {
                if (data[i].value) {
                    form.append($('<input>', $.extend({type: 'hidden'}, data[i])));
                }
            }
        } else if (typeof data === 'object') {
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    form.append($('<input>', {type: 'hidden', name: key, value: data[key]}));
                }
            }
        }
        form.append('<input type="submit" value="Submit" />');
        $(document.body).append(form);
        form.submit();
    }
}
