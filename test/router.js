require('core-js');
var Router = require('../lib/router').Router;
var assert = require('chai').assert;

var normalizeTestCases = [
    {
        in: '',
        out: ''
    },
    {
        in: '/',
        out: '/'
    },
    {
        in: '/foo/bar/',
        out: '/foo/bar/'
    },
    {
        in: '//foo/bar//',
        out: '/foo/bar/'
    },
    {
        in: '/?bar=baz',
        out: '/?bar=baz'
    },
    {
        in: '/?next=http://foo.bar',
        out: '/?next=http://foo.bar'
    },
    {
        in: '/path//to///endpoint/?next=http://foo.bar',
        out: '/path/to/endpoint/?next=http://foo.bar'
    },
    {
        in: 'some random text',
        out: 'some random text'
    }
];
normalizeTestCases.map(function (case_) {
    describe('#Router', function () {
        it('_normalizeUrl with ' + case_.in, function () {
            var router = new Router();
            var out_ = router._normalizeUrl(case_.in);
            assert.equal(out_, case_.out);
        })
    })
})
