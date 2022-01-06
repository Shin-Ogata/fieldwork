(function (global) {
    // static configuration: requirejs
    require.config(JSON.parse(global.requireConfig));

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
        require(['boot1'], () => {
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
