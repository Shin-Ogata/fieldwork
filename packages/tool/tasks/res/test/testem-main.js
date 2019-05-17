(function (global) {
    const testRoot = global.testRoot;
    const requireConfig = {
        baseUrl: '../../',
        paths: Object.assign({
            'boot': `${testRoot}/framework/boot`,
            'testem': '../../../testem',
        }, global.requirePathes),
    };

    // static configuration: requirejs
    require.config(requireConfig);

    function setupTestem() {
        try {
            // eslint-disable-next-line no-undef
            Testem.afterTests(
              (config, data, callback) => {
                  const coverage = JSON.stringify(window.__coverage__);
                  if (null != coverage) {
                      const xhr = new XMLHttpRequest();
                      xhr.onreadystatechange = () => {
                          if (4 === xhr.readyState) {
                              callback();
                          }
                      };
                      xhr.open('POST', '/coverage', true);
                      xhr.send(coverage);
                  } else {
                      callback();
                  }
              });
        } catch (error) {
            console.log(error);
        }
    }

    function setupJasmine(callback) {
        require(['boot'], () => {
            require(['testem'], () => {
                setupTestem();
                callback(onload);
            });
        });
    }

    // start
    setupJasmine((execute) => {
        require(['specs'], () => {
            execute();
        });
    });
})(this);   // eslint-disable-line no-invalid-this
