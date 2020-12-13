/* eslint-disable camelcase */

const { parse } = require('querystring');

module.exports = (port) => {
    return {
        proxies: {
            '/api-data-sync': {
                'target': `http://localhost:${port}`,
            }
        },
        request: (req, res) => {
            setTimeout(() => {
                const params = (() => {
                    let data = '';
                    while (null !== (chunk = req.setEncoding('utf8').read())) {
                        data += chunk;
                    }
                    return parse(data);
                })();
                if ('GET' === req.method) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ id: '0001', num: 100, str: 'string', bool: true }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ API: req.method, data: params }));
                }
            }, 200);
        },
    };
};
