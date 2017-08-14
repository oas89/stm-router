import urijs from 'urijs';


export function getRelativeUrl() {
    let {pathname, search, hash} = window.location;
    return `${pathname}${search}${hash}`;
}


/**
 * Extract hostname from URL, if no url given use current url
 * @param {String} url
 */
export function getHostname(url) {
    url = url || window.location.href;
    return urijs(url).hostname();
}


/**
 * Remove multiple slashes in url path
 * @param {String} url
 */
export function normalizeUrl(url) {
    let [path, query] = url.split('?');
    path = path.replace(/\/+/g, '/');
    return query ? [path, query].join('?') : path;
}
