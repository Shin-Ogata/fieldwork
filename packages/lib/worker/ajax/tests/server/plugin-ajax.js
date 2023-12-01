/* eslint-disable camelcase */

const { parse } = require('querystring');

module.exports = (port) => {
    return {
        proxies: {
            '/api-ajax': {
                'target': `http://localhost:${port}`,
            }
        },
        request: (req, res) => {
            setTimeout(() => {
//              console.log(JSON.stringify(req.headers, null, 4));
//              console.log(JSON.stringify(req.trailers, null, 4));
//              console.log(req.url);
                const { headers } = req;
                const params = (() => {
                    let data = '';
                    while (null !== (chunk = req.setEncoding('utf8').read())) {
                        data += chunk;
                    }
                    return parse(data);
                })();

                const xReqWith = headers['x-requested-with']?.includes('XMLHttpRequest');

                if (headers['content-type']?.includes('application/json')) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ API: 'JSON response', data: params, xReqWith }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end(JSON.stringify({ API: req.method, data: params, xReqWith }));
                }
            }, 200);
        },
    };
};
